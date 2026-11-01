import { ConnectionsPanel, EmailConnectionCard } from '../yare';
import { email, saveSettings } from '../lib/sign-api';
import { useEnvelopes } from './EnvelopesContext';

/** The shared Connections page plus the Email block Yare Sign needs. */
export function ConnectionsPage({ supabase }: { supabase: { url: string; publishableKey: string } }) {
  const { db, settings, setSettings, emailState, recheckEmail } = useEnvelopes();
  return (
    <ConnectionsPanel appLabel="Yare Sign" supabase={{ ...supabase, isDefault: true }} repoUrl={null}>
      <EmailConnectionCard
        appLabel="Yare Sign"
        status={emailState.status}
        detail={emailState.status === 'error' ? emailState.detail : undefined}
        fromEmail={settings?.from_email ?? ''}
        appUrl={settings?.app_url || window.location.origin}
        onSave={async ({ fromEmail, appUrl }) => { setSettings(await saveSettings(db, { from_email: fromEmail, app_url: appUrl })); await recheckEmail(); }}
        onTest={async () => { await email(db, { action: 'test' }); }}
      />
    </ConnectionsPanel>
  );
}
