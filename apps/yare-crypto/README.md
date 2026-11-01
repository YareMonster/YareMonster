# Yare Crypto

Your wallets, in one view. Paste a public address and see what it holds, what it is worth,
what moved and what you paid in fees. Read only: nothing here can touch your funds.

**Important: this is view only.** No private keys, no seed phrases, no tokens, no wallet
connection, no signing. You paste a public address and the app reads what is already public on
the chain. It cannot move, approve or sign anything, ever.

**Status:** In progress. Wallets on Ethereum,
holdings with prices, a net worth chart, activity valued at the time, fees, a simple gain and NFTs
work. Reading the chain needs your own free Etherscan key.

Part of [Yare Monster](https://yare.monster), created by Orlando Pedro.
Free to self-host for personal use and for your own business under the
[Yare Monster Community License](LICENSE). This folder is self-contained: copy it, follow
[DEPLOYMENT.md](DEPLOYMENT.md), and it runs on your own accounts.

## What it does

- **Wallets**: a name, a network and a public address. You never connect a wallet or sign
  anything; the app only reads public data about the address.
- **Home**: every wallet combined. Net worth with its change over 7 days, a month, three or six
  months, a year or all time; the chart; holdings by asset with a donut; money in, money out, fees
  paid and a simple gain (worth now minus net money in); recent activity; NFTs.
- **Wallet page**: the same report for one address, with tabs Overview, Holdings, Activity, NFTs
  and Settings. Each movement shows its dollar value on that day when a price is known. Moves
  between your own tracked wallets are marked as transfers and never count as money in or out.
- **Keys**: get a free Etherscan key, paste it under Connections → Network APIs, save. CoinGecko and
  OpenSea keys are optional and go in the same place. Keys stay in your own database.
- **Sync**: a small function in your Supabase project reads Etherscan for the chain, DefiLlama for
  prices now and for every day since the wallet's first movement (no key needed), and fills your
  tables. It runs when you add a wallet, when you press Refresh, and by itself when the data is
  older than an hour.

## What it does not do

- Ethereum on the free Etherscan plan. Base, Arbitrum, Optimism and Polygon are built in and open up with a paid Etherscan plan. No Solana or other non-EVM chains. No cost-basis profit and loss, no NFT valuations, no alerts,
  no exports. Tokens nobody prices stay unpriced and are left out of the figures. One account per deployment.

## What you need

| Service | Why | Cost |
| --- | --- | --- |
| [Supabase](https://supabase.com) project | Wallets, activity, holdings, prices, your sign-in, and the sync function | Free plan is enough for personal use |
| [Cloudflare](https://cloudflare.com) account | Hosting the static build | Free plan |
| [Etherscan](https://etherscan.io/apis) account | Reading transactions, tokens, balances and NFTs | Free: 100,000 calls a day, Ethereum. A paid plan adds Base, Arbitrum, Optimism and Polygon |
| [CoinGecko](https://www.coingecko.com/en/api) key (optional) | Coin pictures; without a key most tokens still get one from a public set | Free demo plan |
| [OpenSea](https://docs.opensea.io/reference/api-keys) key (optional) | NFT names, pictures and collections; without it most pictures stay blank | Free, on request |
| A domain (optional) | Your own address instead of `*.workers.dev` | Your registrar's price |

Node.js 20 or newer on your computer to build it.

## Install it with your AI assistant

Hand this folder to your assistant and say:

> Make the `apps/yare-crypto` folder the root of my project. Follow its DEPLOYMENT.md. I will give
> you my Supabase project URL and publishable key, and I will sign in to Supabase and Cloudflare
> and set my Etherscan key myself when you ask.

Or sign in to the app and press **Setup guide** under Connections for a ready-made file.

## Run it locally

```sh
# in this folder
cp .env.example .env     # then fill in the two values (see DEPLOYMENT.md, step 4)
npm install
npm run dev              # http://localhost:4614
```

Other scripts: `npm run check` (TypeScript), `npm run build`, `npm run preview`, `npm run deploy`,
`npm run db:link` and `npm run db:push` (Supabase CLI).

## Where things are

```
src/App.tsx                          routes: /, /wallets/:id, /connections; everything needs sign-in
src/features/Shell.tsx               the sidebar: New wallet, Home, Connections, Your wallets
src/features/HomePage.tsx            every wallet combined
src/features/wallet/WalletPage.tsx   one wallet: Overview / Holdings / Activity / NFTs / Settings
src/features/dashboard/Dashboard.tsx the report both pages show
src/features/dashboard/useWalletData.ts  loading, ranges, merging and the money figures
src/features/NewWalletDialog.tsx     name, network, address
src/features/ConnectionsPage.tsx     Connections plus the Network APIs block
src/lib/crypto-api.ts                every database and function call
src/lib/networks.ts                  the networks, their chain ids and explorers
src/lib/format.ts                    dollars, amounts, dates
src/lib/supabase.ts                  the typed client and the row types
src/yare/                            the shared Yare Monster design system (generated copy)
src/yare-charts/                     the shared charts (generated copy; needs recharts)
supabase/migrations/                 one owner, the tables, the allow list
supabase/functions/yarecrypto-sync   Edge Function: reads the chain and the prices into your tables
.env.example                         both environment variables, explained
wrangler.jsonc                       Cloudflare configuration
public/_headers                      security headers
skills/                              guide, install, deploy, update, backup: instructions for AI assistants
```

## Data

Everything lives in your own Supabase project. Yare Monster has no access to your project, your
data or your keys; nothing is sent anywhere else.

Seven tables, all prefixed `yarecrypto_`:

- `yarecrypto_wallets`: one row per address you track: name, network, address, sync status.
- `yarecrypto_transactions`: every movement in or out, with its dollar value on that day when known.
- `yarecrypto_holdings`: what a wallet holds now, with the latest price.
- `yarecrypto_nfts`: the NFTs a wallet holds, with a picture where the metadata answers.
- `yarecrypto_prices`: one dollar price per asset per day, shared by every wallet.
- `yarecrypto_snapshots`: what a wallet was worth at the end of each day, for the chart.
- `yarecrypto_keys`: your pasted API keys, readable only by the sync function.

Row-level security keeps everything to your account, and only emails on the deployment's allow
list (`yare_allowed_emails`, filled during setup) can create an account. The sync function writes
with the project's own service role; the app only reads. The keys you paste go to `yarecrypto_keys`,
which only the sync function can read; the browser can save a key and ask whether one is set, never
read it back. A project secret set from the terminal (`ETHERSCAN_API_KEY`) works too and wins.

## What changed

- **v0.1.0** (20 October 2026): first working version. Wallets on Ethereum (four more networks with a paid key), holdings, net
  worth chart, activity, fees, simple gain, NFTs, sync function, Network APIs block.

## Credit

Yare Ucrypto is part of Yare Monster, created by Orlando Pedro. See [ATTRIBUTION.md](../../ATTRIBUTION.md)
in the repository.

The monster button in the sidebar opens the About dialog, as the licence asks.
