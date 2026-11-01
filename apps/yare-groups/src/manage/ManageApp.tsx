import { Navigate, Route, Routes } from 'react-router';
import type { PublicEnv } from '../lib/env';
import { ManageHome } from './ManageHome';
import { ChannelsPage } from './ChannelsPage';
import { MembersPage } from './MembersPage';
import { InvitesPage } from './InvitesPage';
import { LookPage } from './LookPage';
import { SettingsPage } from './SettingsPage';
import { ConnectionsPage } from './ConnectionsPage';

/** Everything an admin does, under /manage. */
export function ManageApp({ env }: { env: PublicEnv }) {
  return (
    <Routes>
      <Route index element={<ManageHome />} />
      <Route path="channels" element={<ChannelsPage />} />
      <Route path="members" element={<MembersPage />} />
      <Route path="invites" element={<InvitesPage />} />
      <Route path="look" element={<LookPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="connections" element={<ConnectionsPage supabase={{ url: env.supabaseUrl, publishableKey: env.supabasePublishableKey }} />} />
      <Route path="*" element={<Navigate to="/manage" replace />} />
    </Routes>
  );
}
