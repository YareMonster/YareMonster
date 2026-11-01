import { ConnectionsPanel, ServiceKeysCard, type ServiceKeyStatus } from '../yare';
import { useWallets } from './WalletsContext';

/** The shared Connections page plus the Network APIs block Yare Crypto needs. */
export function ConnectionsPage({ supabase }: { supabase: { url: string; publishableKey: string } }) {
  const { keys, saveKey } = useWallets();
  const status = (have: boolean | undefined): ServiceKeyStatus => (keys.status === 'checking' ? 'checking' : keys.status === 'error' ? 'error' : have ? 'ready' : 'missing');
  const k = keys.status === 'ready' || keys.status === 'missing' ? keys.keys : undefined;
  return (
    <ConnectionsPanel appLabel="Yare Crypto" supabase={{ ...supabase, isDefault: true }} repoUrl={null}>
      <ServiceKeysCard
        appLabel="Yare Crypto"
        title="Network APIs"
        description="Where the chain data and the pictures come from. Prices need no key. Get a free key, paste it, save."
        detail={keys.status === 'error' ? keys.detail : undefined}
        services={[
          { id: 'etherscan', name: 'Etherscan', role: 'Transactions, token movements, balances and NFTs on Ethereum.', note: 'Free: 100,000 calls a day.', status: status(k?.etherscan), url: 'https://etherscan.io/apis', onSave: (v) => saveKey('etherscan', v) },
          { id: 'coingecko', name: 'CoinGecko', role: 'Coin pictures. Without a key most tokens still get a picture from a public set.', optional: true, status: status(k?.coingecko), url: 'https://www.coingecko.com/en/api', onSave: (v) => saveKey('coingecko', v) },
          { id: 'opensea', name: 'OpenSea', role: 'NFT names, collections and pictures. Without it most pictures stay blank.', optional: true, status: status(k?.opensea), url: 'https://docs.opensea.io/reference/api-keys', onSave: (v) => saveKey('opensea', v) },
        ]}
      />
    </ConnectionsPanel>
  );
}
