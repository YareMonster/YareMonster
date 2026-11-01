import { Card } from '@heroui/react';
import { UsersThreeIcon } from '@phosphor-icons/react';
import { ConnectionsPanel, MonsterNote, SetupGuideButton, catalog } from '../yare';
import { useGroup } from '../features/GroupContext';
import { ManageShell } from './ManageShell';

/** The shared Connections page plus what Yare Groups adds: member accounts. */
export function ConnectionsPage({ supabase }: { supabase: { url: string; publishableKey: string } }) {
  const { email } = useGroup();
  return (
    <ManageShell crumb="Connections" actions={<SetupGuideButton apps={catalog.filter((c) => c.slug === 'groups')} repoUrl={null} supabaseUrl={supabase.url} supabasePublishableKey={supabase.publishableKey} email={email} />}>
      <ConnectionsPanel appLabel="Yare Groups" supabase={{ ...supabase, isDefault: true }} repoUrl={null}>
        <Card className="gap-5 p-5 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-center gap-3">
              <UsersThreeIcon size={28} />
              <div>
                <h3 className="text-lg">Member accounts</h3>
                <p className="text-sm text-muted">Members are accounts in your own Supabase project, like yours.</p>
              </div>
            </div>
            <p className="text-sm text-muted">
              When someone joins through an invite link, the <code className="text-xs">yaregroups-join</code> function in your project creates their account and adds them to the group. Their email shows under Supabase → Authentication, and nowhere else. Admins are the emails on the deployment's allow list; everyone else is a member.
            </p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 border-t border-border pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
            <MonsterNote title="Mind your Supabase plan">
              Every member counts as a monthly active user when they sign in. The free plan allows 50,000 of them, plenty for most groups. Pictures and files in posts go to your storage, 1 GB in total on the free plan; the limit per post is yours to set under Settings.
            </MonsterNote>
          </div>
        </Card>
      </ConnectionsPanel>
    </ManageShell>
  );
}
