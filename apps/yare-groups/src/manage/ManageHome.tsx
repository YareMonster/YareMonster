import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@heroui/react';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { DataTable, MonsterNote, StatCard, StatusChip } from '../yare';
import { roleLabel, useGroup } from '../features/GroupContext';
import type { Member } from '../lib/supabase';
import { countMessages, countMessagesSince, listInvites } from '../lib/groups-api';
import { ManageShell } from './ManageShell';

const roleTone: Record<Member['role'], 'accent' | 'success' | 'default'> = { owner: 'accent', admin: 'accent', moderator: 'success', member: 'default' };

/** A few figures and the newest people. */
export function ManageHome() {
  const { db, group, members, channels, online } = useGroup();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<{ week: number; all: number } | null>(null);
  const [openInvites, setOpenInvites] = useState<number | null>(null);
  useEffect(() => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    Promise.all([countMessagesSince(db, weekAgo), countMessages(db)]).then(([week, all]) => setPosts({ week, all })).catch(() => setPosts({ week: 0, all: 0 }));
    listInvites(db).then((list) => setOpenInvites(list.filter((i) => !i.revoked_at && (!i.expires_at || new Date(i.expires_at) > new Date()) && (i.max_uses == null || i.uses < i.max_uses)).length)).catch(() => setOpenInvites(0));
  }, [db]);
  const active = members?.filter((m) => m.status === 'active') ?? null;
  const newest = active ? [...active].sort((a, b) => b.joined_at.localeCompare(a.joined_at)).slice(0, 8) : [];

  return (
    <ManageShell crumb="Home">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Members" value={active ? String(active.length) : null} detail={active ? `${online.size} here right now` : undefined} />
        <StatCard label="Posts this week" value={posts ? String(posts.week) : null} detail={posts ? `${posts.all} all time` : undefined} />
        <StatCard label="Channels" value={channels ? String(channels.filter((c) => !c.archived).length) : null} detail={channels ? `${channels.filter((c) => c.is_private).length} private` : undefined} />
        <StatCard label="Invite links" value={openInvites === null ? null : String(openInvites)} detail="open right now" />
      </div>
      {active && active.length <= 1 && (
        <MonsterNote title="Your group is ready for people" className="mb-6">
          Give it a name and a look under <strong>Look</strong>, then make an invite link under <strong>Invites</strong> and send it around. The {group.join_mode === 'open' ? 'door is open: anyone can create an account' : 'door is invite-only'}; change that under <strong>Settings</strong>.
        </MonsterNote>
      )}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl">Newest members</h2>
        <Button variant="outline" size="sm" onPress={() => navigate('/manage/members')}>All members <ArrowRightIcon /></Button>
      </div>
      <DataTable<Member>
        caption="Newest members"
        rows={newest}
        rowKey={(m) => m.user_id}
        empty={<p className="p-6 text-center text-sm text-muted">Nobody yet.</p>}
        columns={[
          { id: 'name', header: 'Name', cell: (m) => <span className="font-medium">{m.display_name}</span> },
          { id: 'role', header: 'Role', cell: (m) => <StatusChip tone={roleTone[m.role]}>{roleLabel[m.role]}</StatusChip> },
          { id: 'flair', header: 'Flair', cell: (m) => m.flair ? <span className="yg-flair" style={{ background: m.flair_color ?? 'var(--accent)' }}>{m.flair}</span> : <span className="text-muted">–</span> },
          { id: 'joined', header: 'Joined', numeric: true, cell: (m) => <span className="text-muted">{new Date(m.joined_at).toLocaleDateString()}</span> },
        ]}
      />
    </ManageShell>
  );
}
