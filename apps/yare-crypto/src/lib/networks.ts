export type Network = 'ethereum' | 'base' | 'arbitrum' | 'optimism' | 'polygon';

export interface NetworkInfo {
  id: Network;
  name: string;
  /** Etherscan v2 chain id. */
  chainId: number;
  /** The chain's own coin. */
  coin: { symbol: string; name: string; coingeckoId: string };
  /** CoinGecko asset platform, for token prices by contract. */
  platform: string;
  /** Block explorer for links. */
  explorer: string;
}

/**
 * Every network the sync can read. Etherscan's free plan serves Ethereum only; the others answer
 * with "not supported for this chain" until the key is on a paid plan, so the picker offers
 * Ethereum and keeps the rest ready.
 */
export const allNetworks: NetworkInfo[] = [
  { id: 'ethereum', name: 'Ethereum', chainId: 1, coin: { symbol: 'ETH', name: 'Ether', coingeckoId: 'ethereum' }, platform: 'ethereum', explorer: 'https://etherscan.io' },
  { id: 'base', name: 'Base', chainId: 8453, coin: { symbol: 'ETH', name: 'Ether', coingeckoId: 'ethereum' }, platform: 'base', explorer: 'https://basescan.org' },
  { id: 'arbitrum', name: 'Arbitrum', chainId: 42161, coin: { symbol: 'ETH', name: 'Ether', coingeckoId: 'ethereum' }, platform: 'arbitrum-one', explorer: 'https://arbiscan.io' },
  { id: 'optimism', name: 'Optimism', chainId: 10, coin: { symbol: 'ETH', name: 'Ether', coingeckoId: 'ethereum' }, platform: 'optimistic-ethereum', explorer: 'https://optimistic.etherscan.io' },
  { id: 'polygon', name: 'Polygon', chainId: 137, coin: { symbol: 'POL', name: 'Polygon', coingeckoId: 'polygon-ecosystem-token' }, platform: 'polygon-pos', explorer: 'https://polygonscan.com' },
];

export const networks: NetworkInfo[] = allNetworks.filter((n) => n.id === 'ethereum');
export const networkOf = (id: Network) => allNetworks.find((n) => n.id === id) ?? allNetworks[0]!;
export const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s.trim());
export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
