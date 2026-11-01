// Yare Crypto · Edge Function yarecrypto-sync
//
// Reads one wallet from the chain and fills its tables: activity, holdings, NFTs, daily prices
// and the daily value of the wallet. Chain data comes from Etherscan (one free key). Prices, now
// and for every day since the wallet's first movement, come from DefiLlama, which needs no key.
// Coin pictures come from CoinGecko when it knows the token and from Trust Wallet's public set
// otherwise.
// Nothing here can move funds: the function only reads public data about a public address.
//
//   status   which keys are in place (pasted in the app, or set as project secrets)
//   sync     { wallet_id }  read the chain and rebuild the wallet's tables
//
// Deploy:  npx supabase functions deploy yarecrypto-sync --project-ref <ref>
// Keys:    pasted by the owner under Connections → Network APIs (table yarecrypto_keys), or set as
//          project secrets ETHERSCAN_API_KEY, COINGECKO_API_KEY, OPENSEA_API_KEY from the terminal.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { cors, json } from '../_shared/cors.ts';

type Network = 'ethereum' | 'base' | 'arbitrum' | 'optimism' | 'polygon';
const NETWORKS: Record<Network, { chainId: number; coin: { symbol: string; name: string; coingeckoId: string }; platform: string; llama: string }> = {
  ethereum: { chainId: 1, coin: { symbol: 'ETH', name: 'Ether', coingeckoId: 'ethereum' }, platform: 'ethereum', llama: 'ethereum' },
  base: { chainId: 8453, coin: { symbol: 'ETH', name: 'Ether', coingeckoId: 'ethereum' }, platform: 'base', llama: 'base' },
  arbitrum: { chainId: 42161, coin: { symbol: 'ETH', name: 'Ether', coingeckoId: 'ethereum' }, platform: 'arbitrum-one', llama: 'arbitrum' },
  optimism: { chainId: 10, coin: { symbol: 'ETH', name: 'Ether', coingeckoId: 'ethereum' }, platform: 'optimistic-ethereum', llama: 'optimism' },
  polygon: { chainId: 137, coin: { symbol: 'POL', name: 'Polygon', coingeckoId: 'polygon-ecosystem-token' }, platform: 'polygon-pos', llama: 'polygon' },
};
const MAX_DAYS = 3000;

type Wallet = { id: string; owner_id: string; network: Network; address: string };
type Tx = { hash: string; key: string; ts: string; block: number; kind: 'native' | 'token' | 'nft' | 'internal'; direction: 'in' | 'out' | 'self'; asset_symbol: string; asset_name: string; asset_contract: string | null; decimals: number; amount: number; fee_native: number; usd_value: number | null; fee_usd: number | null; counterparty: string | null; internal: boolean; token_id: string | null; failed: boolean };

const ETHERSCAN = 'https://api.etherscan.io/v2/api';
const COINGECKO = 'https://api.coingecko.com/api/v3';
const DAY = 86400000;
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  let body: { action?: string; wallet_id?: string };
  try { body = await req.json(); } catch { return json({ error: 'Send JSON.' }, 400); }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const user = await owner(admin, req);
    // Keys pasted in the app live in the owner's row; a project secret set from the terminal wins when both exist.
    const { data: saved } = await admin.from('yarecrypto_keys').select('etherscan, coingecko, opensea').eq('owner_id', user.id).maybeSingle();
    const etherscanKey = Deno.env.get('ETHERSCAN_API_KEY') || saved?.etherscan || '';
    const coingeckoKey = Deno.env.get('COINGECKO_API_KEY') || saved?.coingecko || '';
    const openseaKey = Deno.env.get('OPENSEA_API_KEY') || saved?.opensea || '';
    if (body.action === 'status') return json({ etherscan: !!etherscanKey, coingecko: !!coingeckoKey, opensea: !!openseaKey });
    if (body.action !== 'sync' || !body.wallet_id) return json({ error: 'Unknown action.' }, 400);
    if (!etherscanKey) throw new Err('No Etherscan key yet. Paste it under Connections → Network APIs.', 400);

    const { data: wallet } = await admin.from('yarecrypto_wallets').select('id, owner_id, network, address').eq('id', body.wallet_id).eq('owner_id', user.id).maybeSingle();
    if (!wallet) throw new Err('Wallet not found.', 404);
    await admin.from('yarecrypto_wallets').update({ status: 'syncing', sync_error: null }).eq('id', wallet.id);
    try {
      const out = await sync(admin, wallet as Wallet, user.id, etherscanKey, coingeckoKey, openseaKey);
      await admin.from('yarecrypto_wallets').update({ status: 'ready', last_synced_at: new Date().toISOString(), sync_error: null }).eq('id', wallet.id);
      return json({ ok: true, ...out });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The sync failed.';
      await admin.from('yarecrypto_wallets').update({ status: 'error', sync_error: message }).eq('id', wallet.id);
      throw err;
    }
  } catch (err) {
    const e = err instanceof Err ? err : new Err(err instanceof Error ? err.message : 'Something went wrong.', 500);
    return json({ ok: false, error: e.message }, e.status);
  }
});

class Err extends Error { constructor(message: string, public status: number) { super(message); } }

async function owner(admin: SupabaseClient, req: Request) {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt || jwt.split('.').length !== 3) throw new Err('Sign in first.', 401);
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) throw new Err('Sign in first.', 401);
  return data.user;
}

// ---------------------------------------------------------------- the sync
async function sync(admin: SupabaseClient, w: Wallet, ownerId: string, etherscanKey: string, coingeckoKey: string, openseaKey: string) {
  const net = NETWORKS[w.network];
  const addr = w.address.toLowerCase();
  const es = new Etherscan(net.chainId, etherscanKey);
  const cg = new CoinGecko(coingeckoKey);

  // Other wallets of the same owner: moves between them are transfers, not money in or out.
  const { data: mine } = await admin.from('yarecrypto_wallets').select('address').eq('owner_id', ownerId);
  const own = new Set((mine ?? []).map((m: { address: string }) => m.address.toLowerCase()));

  // 1. The chain: four lists, oldest first.
  const [normal, internal, tokens, nfts721, nfts1155] = [
    await es.list('txlist', addr), await es.list('txlistinternal', addr), await es.list('tokentx', addr), await es.list('tokennfttx', addr), await es.list('token1155tx', addr),
  ];
  const nativeBalanceWei = await es.call({ module: 'account', action: 'balance', address: addr, tag: 'latest' }) as string;

  // 2. Which assets matter: the coin, and every token that moved. Balances come from the sums.
  const tokenMeta = new Map<string, { symbol: string; name: string; decimals: number; balance: number; last: number }>();
  for (const t of tokens) {
    const c = String(t.contractAddress).toLowerCase();
    const dec = Number(t.tokenDecimal) || 18;
    const amt = Number(t.value) / 10 ** dec;
    const m = tokenMeta.get(c) ?? { symbol: String(t.tokenSymbol || '?').slice(0, 20), name: String(t.tokenName || 'Token').slice(0, 80), decimals: dec, balance: 0, last: 0 };
    const from = String(t.from).toLowerCase(), to = String(t.to).toLowerCase();
    if (to === addr) m.balance += amt;
    if (from === addr) m.balance -= amt;
    m.last = Math.max(m.last, Number(t.timeStamp) * 1000);
    tokenMeta.set(c, m);
  }
  const held = [...tokenMeta.entries()].filter(([, m]) => m.balance > 1e-12).sort((a, b) => b[1].last - a[1].last).slice(0, 60);

  // 3. Prices now, from DefiLlama in one call: the coin and every held token. Tokens it does not know
  //    stay unpriced (that also hides the spam sent to every address).
  const llama = new Llama();
  const nativeLlama = `coingecko:${net.coin.coingeckoId}`;
  const now = await llama.current([nativeLlama, ...held.map(([c]) => `${net.llama}:${c}`)]);
  const nativeNow = now.get(nativeLlama) ?? null;
  const tokenNow: Record<string, number> = {};
  for (const [c] of held) { const v = now.get(`${net.llama}:${c}`); if (v !== undefined) tokenNow[c] = v; }
  const priced = held.filter(([c]) => tokenNow[c] !== undefined).sort((a, b) => (b[1].balance * (tokenNow[b[0]] ?? 0)) - (a[1].balance * (tokenNow[a[0]] ?? 0)));

  // 4. Pictures: known from an earlier sync, else CoinGecko for the top priced tokens, else Trust Wallet's public set.
  const { data: knownRows } = await admin.from('yarecrypto_holdings').select('asset_contract, coingecko_id, logo_url').not('logo_url', 'is', null).limit(1000);
  const known = new Map<string | null, { id: string | null; image: string | null }>();
  for (const r of knownRows ?? []) if (!known.has(r.asset_contract)) known.set(r.asset_contract, { id: r.coingecko_id, image: r.logo_url });
  const nativeInfo = known.get(null)?.image ? { image: known.get(null)!.image } : await cg.coin(net.coin.coingeckoId);
  const tokenInfo = new Map<string, { id: string; image: string | null }>();
  for (const [c] of priced.slice(0, 8)) {
    const k = known.get(c);
    if (k?.image) { tokenInfo.set(c, { id: k.id ?? '', image: k.image }); continue; }
    const info = await cg.tokenInfo(net.platform, c); if (info) tokenInfo.set(c, info);
  }

  // 5. Daily prices since the wallet's first movement for the coin and the top priced tokens. Only the
  //    days the shared cache lacks are fetched, 500 at a time, which is what DefiLlama hands out.
  const firstMs = Math.min(...[...normal, ...internal, ...tokens].map((t) => Number(t.timeStamp) * 1000), Date.now());
  const since = Math.max(firstMs, Date.now() - MAX_DAYS * DAY);
  const tokenKey = (c: string) => `${net.platform}:${c}`;
  const keys: Array<{ key: string; llama: string }> = [
    { key: net.coin.coingeckoId, llama: nativeLlama },
    ...priced.slice(0, 5).map(([c]) => ({ key: tokenKey(c), llama: `${net.llama}:${c}` })),
  ];
  const today = dayOf(Date.now());
  for (const k of keys) {
    const { data: bounds } = await admin.from('yarecrypto_prices').select('day').eq('asset_key', k.key).order('day').limit(1);
    const { data: last } = await admin.from('yarecrypto_prices').select('day').eq('asset_key', k.key).order('day', { ascending: false }).limit(1);
    const haveFrom = bounds?.[0]?.day ? new Date(bounds[0].day).getTime() : null;
    const haveTo = last?.[0]?.day ? new Date(last[0].day).getTime() : null;
    const ranges: Array<[number, number]> = [];
    if (haveFrom === null || haveTo === null) ranges.push([since, Date.now()]);
    else { if (haveFrom > since + DAY) ranges.push([since, haveFrom]); if (haveTo < Date.now() - DAY) ranges.push([haveTo, Date.now()]); }
    const rows = new Map<string, number>();
    for (const [from, to] of ranges) for (const [ms, usd] of await llama.chart(k.llama, from, to).catch(() => [] as Array<[number, number]>)) rows.set(dayOf(ms), usd);
    const nowPrice = k.key === net.coin.coingeckoId ? nativeNow : tokenNow[k.key.split(':')[1]!];
    if (nowPrice !== null && nowPrice !== undefined) rows.set(today, nowPrice);
    const list = [...rows.entries()].filter(([, usd]) => usd > 0).map(([day, usd]) => ({ asset_key: k.key, day, usd }));
    for (let i = 0; i < list.length; i += 500) await admin.from('yarecrypto_prices').upsert(list.slice(i, i + 500), { onConflict: 'asset_key,day' });
  }
  const price = new Map<string, number>();
  for (const k of keys) {
    for (let from = 0; ; from += 1000) {
      const { data: rows } = await admin.from('yarecrypto_prices').select('day, usd').eq('asset_key', k.key).gte('day', dayOf(since)).order('day').range(from, from + 999);
      for (const r of rows ?? []) price.set(`${k.key}|${r.day}`, Number(r.usd));
      if (!rows || rows.length < 1000) break;
    }
  }
  const priceOn = (key: string, ms: number): number | null => price.get(`${key}|${dayOf(ms)}`) ?? null;

  // 6. Activity rows.
  const txs: Tx[] = [];
  const dir = (from: string, to: string): Tx['direction'] => (from === addr && to === addr ? 'self' : from === addr ? 'out' : 'in');
  const other = (from: string, to: string) => (from === addr ? to : from);
  for (const t of normal) {
    const from = String(t.from).toLowerCase(), to = String(t.to || '').toLowerCase(); const ms = Number(t.timeStamp) * 1000;
    const amount = Number(t.value) / 1e18; const fee = from === addr ? (Number(t.gasUsed) * Number(t.gasPrice)) / 1e18 : 0;
    if (amount === 0 && fee === 0) continue;
    const p = priceOn(net.coin.coingeckoId, ms);
    txs.push({ hash: t.hash, key: `n:${t.hash}`, ts: new Date(ms).toISOString(), block: Number(t.blockNumber), kind: 'native', direction: dir(from, to), asset_symbol: net.coin.symbol, asset_name: net.coin.name, asset_contract: null, decimals: 18, amount, fee_native: fee, usd_value: p === null ? null : amount * p, fee_usd: p === null ? null : fee * p, counterparty: other(from, to) || null, internal: own.has(other(from, to)), token_id: null, failed: t.isError === '1' });
  }
  for (const t of internal) {
    const from = String(t.from).toLowerCase(), to = String(t.to || '').toLowerCase(); const ms = Number(t.timeStamp) * 1000;
    const amount = Number(t.value) / 1e18; if (amount === 0) continue;
    const p = priceOn(net.coin.coingeckoId, ms);
    txs.push({ hash: t.hash, key: `i:${t.hash}:${t.traceId ?? ''}:${from}:${to}:${t.value}`, ts: new Date(ms).toISOString(), block: Number(t.blockNumber), kind: 'internal', direction: dir(from, to), asset_symbol: net.coin.symbol, asset_name: net.coin.name, asset_contract: null, decimals: 18, amount, fee_native: 0, usd_value: p === null ? null : amount * p, fee_usd: null, counterparty: other(from, to) || null, internal: own.has(other(from, to)), token_id: null, failed: t.isError === '1' });
  }
  for (const t of tokens) {
    const from = String(t.from).toLowerCase(), to = String(t.to).toLowerCase(); const ms = Number(t.timeStamp) * 1000; const c = String(t.contractAddress).toLowerCase();
    const dec = Number(t.tokenDecimal) || 18; const amount = Number(t.value) / 10 ** dec;
    const p = priceOn(tokenKey(c), ms);
    txs.push({ hash: t.hash, key: `t:${t.hash}:${c}:${from}:${to}:${t.value}`, ts: new Date(ms).toISOString(), block: Number(t.blockNumber), kind: 'token', direction: dir(from, to), asset_symbol: String(t.tokenSymbol || '?').slice(0, 20), asset_name: String(t.tokenName || 'Token').slice(0, 80), asset_contract: c, decimals: dec, amount, fee_native: 0, usd_value: p === null ? null : amount * p, fee_usd: null, counterparty: other(from, to) || null, internal: own.has(other(from, to)), token_id: null, failed: false });
  }
  for (const t of [...nfts721, ...nfts1155]) {
    const from = String(t.from).toLowerCase(), to = String(t.to).toLowerCase(); const ms = Number(t.timeStamp) * 1000; const c = String(t.contractAddress).toLowerCase();
    txs.push({ hash: t.hash, key: `f:${t.hash}:${c}:${t.tokenID}:${from}:${to}`, ts: new Date(ms).toISOString(), block: Number(t.blockNumber), kind: 'nft', direction: dir(from, to), asset_symbol: String(t.tokenSymbol || 'NFT').slice(0, 20), asset_name: String(t.tokenName || 'NFT').slice(0, 80), asset_contract: c, decimals: 0, amount: Number(t.tokenValue ?? 1) || 1, fee_native: 0, usd_value: null, fee_usd: null, counterparty: other(from, to) || null, internal: own.has(other(from, to)), token_id: String(t.tokenID), failed: false });
  }
  // Two identical transfers inside one transaction (an airdrop, a batch) would share a key; number the repeats.
  const seen = new Map<string, number>();
  for (const t of txs) {
    const n = (seen.get(t.key) ?? 0) + 1;
    seen.set(t.key, n);
    if (n > 1) t.key = `${t.key}#${n}`;
  }
  await admin.from('yarecrypto_transactions').delete().eq('wallet_id', w.id);
  for (let i = 0; i < txs.length; i += 500) {
    const { error } = await admin.from('yarecrypto_transactions').insert(txs.slice(i, i + 500).map((t) => ({ ...t, wallet_id: w.id })));
    if (error) throw new Err(`Could not save activity: ${error.message}`, 500);
  }

  // 7. Holdings now.
  const nativeBalance = Number(nativeBalanceWei) / 1e18;
  const holdings = [
    { wallet_id: w.id, asset_contract: null, symbol: net.coin.symbol, name: net.coin.name, decimals: 18, balance: nativeBalance, usd_price: nativeNow, usd_value: nativeNow === null ? null : nativeBalance * nativeNow, coingecko_id: net.coin.coingeckoId, logo_url: nativeInfo?.image ?? null },
    ...held.map(([c, m]) => ({ wallet_id: w.id, asset_contract: c, symbol: m.symbol, name: m.name, decimals: m.decimals, balance: m.balance, usd_price: tokenNow[c] ?? null, usd_value: tokenNow[c] === undefined ? null : m.balance * tokenNow[c]!, coingecko_id: tokenInfo.get(c)?.id ?? null, logo_url: tokenInfo.get(c)?.image ?? known.get(c)?.image ?? trustLogo(w.network, c) })),
  ];
  await admin.from('yarecrypto_holdings').delete().eq('wallet_id', w.id);
  const { error: hErr } = await admin.from('yarecrypto_holdings').insert(holdings);
  if (hErr) throw new Err(`Could not save holdings: ${hErr.message}`, 500);

  // 8. The wallet's value, day by day, from running balances and daily prices. Priced assets only.
  const start = since;
  const assets = [{ key: net.coin.coingeckoId, contract: null as string | null }, ...priced.slice(0, 5).map(([c]) => ({ key: tokenKey(c), contract: c }))];
  const bal = new Map<string | null, number>(assets.map((a) => [a.contract, 0]));
  const sorted = txs.filter((t) => t.kind !== 'nft').sort((a, b) => a.ts.localeCompare(b.ts));
  let i = 0;
  const snaps: Array<{ wallet_id: string; day: string; usd_value: number; complete: boolean }> = [];
  for (let d = new Date(dayOf(start)).getTime(); d <= Date.now(); d += DAY) {
    const end = d + DAY;
    while (i < sorted.length && new Date(sorted[i]!.ts).getTime() < end) {
      const t = sorted[i]!;
      if (bal.has(t.asset_contract)) {
        const b = bal.get(t.asset_contract)!;
        const delta = t.failed ? 0 : t.direction === 'in' ? t.amount : t.direction === 'out' ? -t.amount : 0;
        bal.set(t.asset_contract, b + delta - (t.kind === 'native' ? t.fee_native : 0));
      }
      i++;
    }
    let value = 0, complete = true;
    for (const a of assets) {
      const b = Math.max(0, bal.get(a.contract) ?? 0);
      const p = priceOn(a.key, d);
      if (p === null) { if (b > 0) complete = false; continue; }
      value += b * p;
    }
    snaps.push({ wallet_id: w.id, day: dayOf(d), usd_value: value, complete });
  }
  // Today's point is the live value, so the chart ends where the holdings say.
  const live = holdings.reduce((s, h) => s + (h.usd_value ?? 0), 0);
  if (snaps.length) snaps[snaps.length - 1] = { wallet_id: w.id, day: today, usd_value: live, complete: true };
  await admin.from('yarecrypto_snapshots').delete().eq('wallet_id', w.id);
  for (let j = 0; j < snaps.length; j += 500) await admin.from('yarecrypto_snapshots').insert(snaps.slice(j, j + 500));

  // 9. NFTs held now, with pictures where the metadata answers quickly.
  const owned = new Map<string, { contract: string; token_id: string; name: string; collection: string; count: number; last: number }>();
  for (const t of [...nfts721, ...nfts1155]) {
    const c = String(t.contractAddress).toLowerCase(); const id = String(t.tokenID); const k = `${c}:${id}`;
    const from = String(t.from).toLowerCase(), to = String(t.to).toLowerCase(); const n = Number(t.tokenValue ?? 1) || 1;
    const o = owned.get(k) ?? { contract: c, token_id: id, name: '', collection: String(t.tokenName || '').slice(0, 80), count: 0, last: 0 };
    if (to === addr) o.count += n; if (from === addr) o.count -= n;
    o.last = Math.max(o.last, Number(t.timeStamp) * 1000);
    owned.set(k, o);
  }
  const have = [...owned.values()].filter((o) => o.count > 0).sort((a, b) => b.last - a.last).slice(0, 60);
  // With an OpenSea key, one call brings names, collections and cached pictures. Without it, ask each contract (slow, often blank).
  const fromOpensea = openseaKey ? await openseaNfts(openseaKey, w.network, addr).catch(() => null) : null;
  if (fromOpensea) {
    for (const o of have) {
      const m = fromOpensea.get(`${o.contract}:${o.token_id}`);
      if (m) { o.name = m.name || o.name; o.collection = m.collection || o.collection; (o as { image?: string | null }).image = m.image; }
    }
  } else {
    const metaBudget = Date.now() + 20000;
    for (const o of have.slice(0, 24)) {
      if (Date.now() > metaBudget) break;
      const meta = await nftMeta(es, o.contract, o.token_id).catch(() => null);
      if (meta) { o.name = meta.name ?? ''; (o as { image?: string | null }).image = meta.image ?? null; }
    }
  }
  await admin.from('yarecrypto_nfts').delete().eq('wallet_id', w.id);
  if (have.length) await admin.from('yarecrypto_nfts').insert(have.map((o) => ({ wallet_id: w.id, contract: o.contract, token_id: o.token_id, name: o.name || `#${o.token_id}`, collection: o.collection, image_url: (o as { image?: string | null }).image ?? null })));

  return { transactions: txs.length, holdings: holdings.length, nfts: have.length };
}

// ---------------------------------------------------------------- Etherscan v2
class Etherscan {
  private last = 0;
  constructor(private chainId: number, private key: string) {}
  async call(params: Record<string, string>): Promise<unknown> {
    const wait = this.last + 240 - Date.now(); if (wait > 0) await sleep(wait);
    this.last = Date.now();
    const url = `${ETHERSCAN}?${new URLSearchParams({ chainid: String(this.chainId), apikey: this.key, ...params })}`;
    const res = await fetch(url);
    if (!res.ok) throw new Err(`Etherscan answered ${res.status}.`, 502);
    const j = await res.json() as { status: string; message: string; result: unknown };
    if (j.status !== '1') {
      const msg = typeof j.result === 'string' ? j.result : j.message;
      if (/No transactions found|No records found/i.test(msg)) return [];
      if (/Invalid API Key/i.test(msg)) throw new Err('Etherscan did not accept the key. Check the secret.', 400);
      if (/not supported for this chain|upgrade your api plan/i.test(msg)) throw new Err('This network needs a paid Etherscan plan. The free plan reads Ethereum.', 400);
      if (/rate limit/i.test(msg)) { await sleep(1200); return this.call(params); }
      throw new Err(`Etherscan: ${msg}`, 502);
    }
    return j.result;
  }
  /** A paginated account list, oldest first, up to three pages of 10,000. */
  async list(action: string, address: string): Promise<Array<Record<string, string>>> {
    const out: Array<Record<string, string>> = [];
    for (let page = 1; page <= 3; page++) {
      const rows = await this.call({ module: 'account', action, address, startblock: '0', endblock: '99999999', page: String(page), offset: '10000', sort: 'asc' }) as Array<Record<string, string>>;
      out.push(...rows);
      if (rows.length < 10000) break;
    }
    return out;
  }
}

/** tokenURI(tokenId) through Etherscan's proxy, then the metadata JSON. Best effort, three seconds each. */
async function nftMeta(es: Etherscan, contract: string, tokenId: string): Promise<{ name?: string; image?: string } | null> {
  const selector = '0xc87b56dd' + BigInt(tokenId).toString(16).padStart(64, '0');
  const hex = await es.call({ module: 'proxy', action: 'eth_call', to: contract, data: selector, tag: 'latest' }) as string;
  if (!hex || hex === '0x') return null;
  const uri = decodeString(hex);
  if (!uri) return null;
  const url = uri.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${uri.slice(7)}` : uri.replace('{id}', BigInt(tokenId).toString(16).padStart(64, '0'));
  let meta: { name?: string; image?: string; image_url?: string };
  if (url.startsWith('data:application/json')) {
    const b64 = url.includes(';base64,'); const payload = url.slice(url.indexOf(',') + 1);
    meta = JSON.parse(b64 ? atob(payload) : decodeURIComponent(payload));
  } else {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    meta = await res.json();
  }
  const image = (meta.image ?? meta.image_url ?? '').replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/');
  return { name: meta.name, image: image || undefined };
}

function decodeString(hex: string): string | null {
  try {
    const data = hex.slice(2);
    const offset = parseInt(data.slice(0, 64), 16) * 2;
    const len = parseInt(data.slice(offset, offset + 64), 16) * 2;
    const bytes = data.slice(offset + 64, offset + 64 + len).match(/.{2}/g) ?? [];
    return new TextDecoder().decode(new Uint8Array(bytes.map((b) => parseInt(b, 16))));
  } catch { return null; }
}

// ---------------------------------------------------------------- logos
const TRUST_CHAIN: Record<Network, string> = { ethereum: 'ethereum', base: 'base', arbitrum: 'arbitrum', optimism: 'optimism', polygon: 'polygon' };

/** Trust Wallet keeps a public logo for most known tokens, by checksummed address. Unknown ones answer 404 and the app shows letters. */
function trustLogo(network: Network, contract: string): string | null {
  try { return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${TRUST_CHAIN[network]}/assets/${checksumAddress(contract)}/logo.png`; } catch { return null; }
}

/** EIP-55 mixed-case address, which the logo paths use. Keccak-256 inlined so the function carries no extra package. */
function checksumAddress(address: string): string {
  const hex = address.toLowerCase().replace(/^0x/, '');
  const hash = keccak256(new TextEncoder().encode(hex));
  let out = '0x';
  for (let i = 0; i < hex.length; i++) {
    const nibble = parseInt(hash[i]!, 16);
    out += nibble >= 8 ? hex[i]!.toUpperCase() : hex[i]!;
  }
  return out;
}

function keccak256(data: Uint8Array): string {
  const RC = [1n, 0x8082n, 0x800000000000808an, 0x8000000080008000n, 0x808bn, 0x80000001n, 0x8000000080008081n, 0x8000000000008009n, 0x8an, 0x88n, 0x80008009n, 0x8000000an, 0x8000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n, 0x800an, 0x800000008000000an, 0x8000000080008081n, 0x8000000000008080n, 0x80000001n, 0x8000000080008008n];
  const ROT = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14];
  const M = (1n << 64n) - 1n;
  const rot = (x: bigint, n: number) => n === 0 ? x : ((x << BigInt(n)) | (x >> BigInt(64 - n))) & M;
  const s = new Array<bigint>(25).fill(0n);
  const rate = 136;
  const padded = new Uint8Array(Math.ceil((data.length + 1) / rate) * rate);
  padded.set(data); padded[data.length] = 0x01; padded[padded.length - 1] |= 0x80;
  for (let off = 0; off < padded.length; off += rate) {
    for (let i = 0; i < rate / 8; i++) {
      let lane = 0n;
      for (let b = 7; b >= 0; b--) lane = (lane << 8n) | BigInt(padded[off + i * 8 + b]!);
      s[i] ^= lane;
    }
    for (let round = 0; round < 24; round++) {
      const c = [0, 1, 2, 3, 4].map((x) => s[x]! ^ s[x + 5]! ^ s[x + 10]! ^ s[x + 15]! ^ s[x + 20]!);
      for (let x = 0; x < 5; x++) { const d = c[(x + 4) % 5]! ^ rot(c[(x + 1) % 5]!, 1); for (let y = 0; y < 25; y += 5) s[x + y] = s[x + y]! ^ d; }
      const b = new Array<bigint>(25).fill(0n);
      for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) b[y + 5 * ((2 * x + 3 * y) % 5)] = rot(s[x + 5 * y]!, ROT[x + 5 * y]!);
      for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) s[x + 5 * y] = b[x + 5 * y]! ^ ((~b[(x + 1) % 5 + 5 * y]! & M) & b[(x + 2) % 5 + 5 * y]!);
      s[0] = s[0]! ^ RC[round]!;
    }
  }
  let out = '';
  for (let i = 0; i < 4; i++) { let lane = s[i]!; for (let b = 0; b < 8; b++) { out += (lane & 0xffn).toString(16).padStart(2, '0'); lane >>= 8n; } }
  return out;
}

// ---------------------------------------------------------------- OpenSea
const OPENSEA_CHAIN: Record<Network, string> = { ethereum: 'ethereum', base: 'base', arbitrum: 'arbitrum', optimism: 'optimism', polygon: 'matic' };

/** The NFTs an address holds, by "<contract>:<token id>", with the picture OpenSea caches. Up to 400. */
async function openseaNfts(key: string, network: Network, address: string): Promise<Map<string, { name: string; collection: string; image: string | null }>> {
  const out = new Map<string, { name: string; collection: string; image: string | null }>();
  let next = '';
  for (let page = 0; page < 2; page++) {
    const res = await fetch(`https://api.opensea.io/api/v2/chain/${OPENSEA_CHAIN[network]}/account/${address}/nfts?limit=200${next ? `&next=${next}` : ''}`, { headers: { 'x-api-key': key, accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Err(`OpenSea answered ${res.status}.`, 502);
    const j = await res.json() as { nfts?: Array<{ identifier: string; contract: string; name?: string | null; collection?: string; image_url?: string | null; display_image_url?: string | null }>; next?: string };
    for (const n of j.nfts ?? []) {
      const collection = (n.collection ?? '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      out.set(`${n.contract.toLowerCase()}:${n.identifier}`, { name: n.name ?? '', collection, image: n.display_image_url || n.image_url || null });
    }
    next = j.next ?? '';
    if (!next) break;
  }
  return out;
}

// ---------------------------------------------------------------- DefiLlama (prices, no key)
class Llama {
  private last = 0;
  private async get(path: string): Promise<unknown | null> {
    const wait = this.last + 600 - Date.now(); if (wait > 0) await sleep(wait);
    this.last = Date.now();
    const res = await fetch(`https://coins.llama.fi${path}`, { signal: AbortSignal.timeout(20000) });
    if (res.status === 429) { await sleep(5000); return this.get(path); }
    return res.ok ? res.json() : null;
  }
  /** Prices now for many coins at once; only confident answers count. */
  async current(coins: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    for (let i = 0; i < coins.length; i += 60) {
      const j = await this.get(`/prices/current/${coins.slice(i, i + 60).join(',')}`) as { coins?: Record<string, { price: number; confidence?: number }> } | null;
      for (const [k, v] of Object.entries(j?.coins ?? {})) if (v.price > 0 && (v.confidence ?? 1) >= 0.5) out.set(k, v.price);
    }
    return out;
  }
  /** One price a day between two instants, in chunks of 500 days. */
  async chart(coin: string, fromMs: number, toMs: number): Promise<Array<[number, number]>> {
    const out: Array<[number, number]> = [];
    for (let start = fromMs; start < toMs; start += 500 * DAY) {
      const span = Math.min(500, Math.ceil((toMs - start) / DAY) + 1);
      const j = await this.get(`/chart/${coin}?start=${Math.floor(start / 1000)}&span=${span}&period=1d`) as { coins?: Record<string, { prices?: Array<{ timestamp: number; price: number }> }> } | null;
      for (const p of j?.coins?.[coin]?.prices ?? []) out.push([p.timestamp * 1000, p.price]);
    }
    return out;
  }
}

// ---------------------------------------------------------------- CoinGecko (pictures)
class CoinGecko {
  private last = 0;
  constructor(public key: string) {}
  private async get(path: string): Promise<unknown | null> {
    // Keyless access allows a handful of calls a minute; a demo key raises that. Pace either way.
    const gap = this.key ? 400 : 2100;
    const wait = this.last + gap - Date.now(); if (wait > 0) await sleep(wait);
    this.last = Date.now();
    let res = await fetch(`${COINGECKO}${path}`, { headers: this.key ? { 'x-cg-demo-api-key': this.key } : {} });
    // A key CoinGecko does not accept (wrong plan, typo) must not make things worse than no key.
    if (this.key && (res.status === 401 || res.status === 403 || res.status === 400)) { this.key = ''; await sleep(2100); res = await fetch(`${COINGECKO}${path}`); }
    if (res.status === 429) {
      // The keyless limit resets by the minute: wait, then try twice more.
      for (const wait of [15000, 30000]) {
        await sleep(wait); this.last = Date.now();
        const again = await fetch(`${COINGECKO}${path}`, { headers: this.key ? { 'x-cg-demo-api-key': this.key } : {} });
        if (again.ok) return again.json();
        if (again.status !== 429) return null;
      }
      return null;
    }
    return res.ok ? res.json() : null;
  }
  async simple(id: string): Promise<number | null> {
    const j = await this.get(`/simple/price?ids=${id}&vs_currencies=usd`) as Record<string, { usd?: number }> | null;
    return j?.[id]?.usd ?? null;
  }
  /** Without a key CoinGecko answers one contract per call, so the keyless path prices the twelve most recent tokens; a demo key batches. */
  async tokenPrices(platform: string, contracts: string[]): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    const list = this.key ? contracts : contracts.slice(0, 12);
    const step = this.key ? 50 : 1;
    for (let i = 0; i < list.length; i += step) {
      const j = await this.get(`/simple/token_price/${platform}?contract_addresses=${list.slice(i, i + step).join(',')}&vs_currencies=usd`) as Record<string, { usd?: number }> | null;
      for (const [c, v] of Object.entries(j ?? {})) if (v?.usd !== undefined) out[c.toLowerCase()] = v.usd;
    }
    return out;
  }
  async coin(id: string): Promise<{ image: string | null } | null> {
    const j = await this.get(`/coins/${id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`) as { image?: { small?: string } } | null;
    return j ? { image: j.image?.small ?? null } : null;
  }
  async tokenInfo(platform: string, contract: string): Promise<{ id: string; image: string | null } | null> {
    const j = await this.get(`/coins/${platform}/contract/${contract}`) as { id?: string; image?: { small?: string } } | null;
    return j?.id ? { id: j.id, image: j.image?.small ?? null } : null;
  }
  async history(id: string): Promise<Array<[number, number]>> {
    const j = await this.get(`/coins/${id}/market_chart?vs_currency=usd&days=365&interval=daily`) as { prices?: Array<[number, number]> } | null;
    return j?.prices ?? [];
  }
  async tokenHistory(platform: string, contract: string): Promise<Array<[number, number]>> {
    const j = await this.get(`/coins/${platform}/contract/${contract}/market_chart?vs_currency=usd&days=365`) as { prices?: Array<[number, number]> } | null;
    return j?.prices ?? [];
  }
}
