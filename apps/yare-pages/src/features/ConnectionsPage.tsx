import { ConnectionsPanel, ServiceKeysCard, type ServiceKeyStatus } from '../yare';
import { useSites } from './SitesContext';

/** The shared Connections page plus the Cloudflare token block Yare Pages needs. */
export function ConnectionsPage({ supabase }: { supabase: { url: string; publishableKey: string } }) {
  const { key, saveKey } = useSites();
  const status: ServiceKeyStatus = key.status === 'checking' ? 'checking' : key.status === 'error' ? 'error' : key.status === 'ready' ? 'ready' : 'missing';
  return (
    <ConnectionsPanel appLabel="Yare Pages" supabase={{ ...supabase, isDefault: true }} repoUrl={null}>
      <ServiceKeysCard
        appLabel="Yare Pages"
        title="Visitors and AI Agent Builder"
        description="Your Cloudflare account for the visitor figures, through a token that can only read analytics. The AI Agent Builder is planned."
        detail={key.status === 'error' ? key.detail : undefined}
        services={[
          { id: 'cloudflare', name: 'Cloudflare', role: 'Visits, page views, unique visitors, top pages, countries for every website whose domain is on your Cloudflare account, or that carries Cloudflare Web Analytics.', note: 'Create an API token with three permissions, all Read: Zone, Zone Analytics and Account Analytics.', status, url: 'https://dash.cloudflare.com/profile/api-tokens', onSave: saveKey },
          { id: 'assistant', name: 'AI Agent Builder', role: 'Your OpenAI API key, for the AI agent inside Yare Pages, built on OpenAI\'s infrastructure. It knows the guide and your websites, plans the pages, writes them, and prepares the work to build or change a site. The key stays in your database, the usage is yours, and OpenAI bills you directly.', optional: true, status: 'planned', url: 'https://platform.openai.com/api-keys' },
        ]}
      />
    </ConnectionsPanel>
  );
}
