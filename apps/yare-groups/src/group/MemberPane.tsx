import { useMemo } from 'react';
import { useGroup } from '../features/GroupContext';
import type { Member } from '../lib/supabase';
import { Avatar } from './Avatar';

const groups: Array<{ label: string; roles: Member['role'][] }> = [
  { label: 'Admins', roles: ['owner', 'admin'] },
  { label: 'Moderators', roles: ['moderator'] },
  { label: 'Members', roles: ['member'] },
];

/** Everyone in the group, by role, the ones who are here right now first. */
export function MemberPane() {
  const { members, online } = useGroup();
  const sorted = useMemo(() => {
    const active = (members ?? []).filter((m) => m.status === 'active');
    const by = (m: Member) => `${online.has(m.user_id) ? 0 : 1}${m.display_name.toLowerCase()}`;
    return groups.map((g) => ({ ...g, list: active.filter((m) => g.roles.includes(m.role)).sort((a, b) => by(a).localeCompare(by(b))) })).filter((g) => g.list.length);
  }, [members, online]);

  return (
    <div className="yg-people" aria-label="Members">
      {members === null && <div className="flex flex-col gap-3 p-2" aria-busy="true">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="flex items-center gap-2"><div className="yg-skel h-8 w-8 rounded-full" /><div className="yg-skel h-4 flex-1" /></div>)}</div>}
      {sorted.map((g) => (
        <section key={g.label}>
          <h3 className="yg-people__group">{g.label} · {g.list.length}</h3>
          {g.list.map((m) => (
            <div key={m.user_id} className="yg-person" data-away={!online.has(m.user_id) ? 'true' : undefined}>
              <Avatar member={m} size={32} showOnline />
              <span className="yg-person__name"><span>{m.display_name}</span>{m.flair && <span className="yg-flair" style={{ background: m.flair_color ?? undefined }}>{m.flair}</span>}</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
