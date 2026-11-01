import { useMemo, useState } from 'react';
import { AlertDialog, Button, Input, Label, ListBox, Modal, Select, TextField, toast } from '@heroui/react';
import { DataTable, StatusChip } from '../yare';
import { roleLabel, useGroup } from '../features/GroupContext';
import type { Member, MemberPatch, Role } from '../lib/supabase';
import { makeOwner, removeMember, updateMember } from '../lib/groups-api';
import { Avatar } from '../group/Avatar';
import { ManageShell } from './ManageShell';

const roleTone: Record<Role, 'accent' | 'success' | 'default'> = { owner: 'accent', admin: 'accent', moderator: 'success', member: 'default' };
const flairColours = ['#0073fe', '#7a5af5', '#2f7a5b', '#c47f2a', '#1f9bb3', '#b8509a', '#5c6b84', '#272d39'];
const muteOptions = [{ id: 'none', label: 'Not muted', hours: 0 }, { id: '1', label: '1 hour', hours: 1 }, { id: '24', label: '1 day', hours: 24 }, { id: '168', label: '7 days', hours: 168 }];

function standing(m: Member): { label: string; tone: 'success' | 'warning' | 'danger' } {
  if (m.status === 'banned') return { label: 'Removed', tone: 'danger' };
  if (m.muted_until && new Date(m.muted_until) > new Date()) return { label: `Muted until ${new Date(m.muted_until).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}`, tone: 'warning' };
  return { label: 'Active', tone: 'success' };
}

/** Everyone in the group: role, flair, standing. Edit one at a time. */
export function MembersPage() {
  const { members, online } = useGroup();
  const [editing, setEditing] = useState<Member | null>(null);
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const order: Role[] = ['owner', 'admin', 'moderator', 'member'];
    return (members ?? []).filter((m) => m.display_name.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || a.display_name.localeCompare(b.display_name));
  }, [members, query]);

  return (
    <ManageShell crumb="Members" actions={<TextField value={query} onChange={setQuery} aria-label="Find a member" className="w-56"><Input placeholder="Find a member" /></TextField>}>
      {members === null ? <div className="h-64 animate-pulse rounded-(--yare-radius-card) bg-surface-secondary" aria-busy="true" /> : (
        <DataTable<Member>
          caption="Members"
          rows={rows}
          rowKey={(m) => m.user_id}
          empty={<p className="p-6 text-center text-sm text-muted">{query ? 'Nobody by that name.' : 'Nobody yet.'}</p>}
          columns={[
            { id: 'name', header: 'Name', cell: (m) => <div className="flex items-center gap-3"><Avatar member={m} size={32} showOnline /><span className="font-medium">{m.display_name}</span>{m.flair && <span className="yg-flair" style={{ background: m.flair_color ?? 'var(--accent)' }}>{m.flair}</span>}</div> },
            { id: 'role', header: 'Role', cell: (m) => <StatusChip tone={roleTone[m.role]}>{roleLabel[m.role]}</StatusChip> },
            { id: 'standing', header: 'Standing', cell: (m) => <StatusChip tone={standing(m).tone}>{standing(m).label}</StatusChip> },
            { id: 'seen', header: 'Last here', numeric: true, cell: (m) => <span className="text-muted">{online.has(m.user_id) ? 'Now' : new Date(m.last_seen_at).toLocaleDateString()}</span> },
            { id: 'joined', header: 'Joined', numeric: true, cell: (m) => <span className="text-muted">{new Date(m.joined_at).toLocaleDateString()}</span> },
            { id: 'actions', header: '', label: 'Actions', align: 'end', cell: (m) => <Button variant="outline" size="sm" onPress={() => setEditing(m)}>Edit</Button> },
          ]}
        />
      )}
      {editing && <MemberDialog member={editing} onClose={() => setEditing(null)} />}
    </ManageShell>
  );
}

function MemberDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const { db, me, refreshMembers } = useGroup();
  const self = member.user_id === me.user_id;
  const iAmOwner = me.role === 'owner';
  const locked = member.role === 'owner' || (member.role === 'admin' && !iAmOwner && !self);
  const [role, setRole] = useState<Role>(member.role);
  const [flair, setFlair] = useState(member.flair ?? '');
  const [colour, setColour] = useState(member.flair_color ?? flairColours[0]!);
  const [mute, setMute] = useState('keep');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<'remove' | 'ban' | 'owner' | null>(null);
  const roles: Role[] = iAmOwner ? ['admin', 'moderator', 'member'] : ['moderator', 'member'];

  async function save() {
    setSaving(true);
    try {
      const patch: MemberPatch = { flair: flair.trim() || null, flair_color: flair.trim() ? colour : null };
      if (!locked && role !== member.role && role !== 'owner') patch.role = role;
      if (mute !== 'keep') { const h = muteOptions.find((o) => o.id === mute)?.hours ?? 0; patch.muted_until = h ? new Date(Date.now() + h * 3600000).toISOString() : null; }
      await updateMember(db, member.user_id, patch);
      await refreshMembers(); onClose();
    } catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not save.'); setSaving(false); }
  }
  async function act() {
    setSaving(true);
    try {
      if (confirm === 'remove') await removeMember(db, member.user_id);
      if (confirm === 'ban') await updateMember(db, member.user_id, { status: member.status === 'banned' ? 'active' : 'banned' });
      if (confirm === 'owner') await makeOwner(db, member.user_id);
      await refreshMembers(); onClose();
    } catch (err) { toast.danger(err instanceof Error ? err.message : 'That did not work.'); setSaving(false); setConfirm(null); }
  }

  const confirmText = { remove: { title: `Remove ${member.display_name}?`, body: 'They are out of the group. With an invite link they can come back.', button: 'Remove' }, ban: member.status === 'banned' ? { title: `Let ${member.display_name} back in?`, body: 'They can sign in again.', button: 'Let them in' } : { title: `Block ${member.display_name}?`, body: 'They are out and cannot come back with a link. You can undo this here.', button: 'Block' }, owner: { title: `Make ${member.display_name} the owner?`, body: 'You become an admin. Only the new owner can hand it back.', button: 'Make owner' } };

  return (
    <>
      <Modal isOpen={!confirm} onOpenChange={(o) => { if (!o) onClose(); }}>
        <Modal.Backdrop><Modal.Container size="sm"><Modal.Dialog aria-label="Edit member">
          <Modal.CloseTrigger />
          <Modal.Header className="items-start gap-3"><Avatar member={member} size={40} /><div><Modal.Heading>{member.display_name}</Modal.Heading><p className="text-sm text-muted">{roleLabel[member.role]}{self ? ', you' : ''} · joined {new Date(member.joined_at).toLocaleDateString()}</p></div></Modal.Header>
          <Modal.Body className="flex flex-col gap-4">
            {!locked && !self && (
              <Select aria-label="Role" selectedKey={role} onSelectionChange={(k) => setRole(k as Role)} fullWidth>
                <Label>Role</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox>{roles.map((r) => <ListBox.Item key={r} id={r} textValue={roleLabel[r]}>{roleLabel[r]}</ListBox.Item>)}</ListBox></Select.Popover>
              </Select>
            )}
            {locked && !self && <p className="text-sm text-muted">{member.role === 'owner' ? 'The owner is out of reach.' : 'Only the owner changes an admin.'}</p>}
            <TextField value={flair} onChange={setFlair} fullWidth maxLength={24}><Label>Flair</Label><Input placeholder="Founder, Helper, OG" /></TextField>
            {flair.trim() && (
              <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Flair colour">
                {flairColours.map((c) => <button key={c} type="button" role="radio" aria-checked={colour === c} aria-label={c} className="size-7 rounded-full border-2" style={{ background: c, borderColor: colour === c ? 'var(--foreground)' : 'transparent' }} onClick={() => setColour(c)} />)}
                <span className="yg-flair ml-2" style={{ background: colour }}>{flair.trim()}</span>
              </div>
            )}
            {!locked && !self && (
              <Select aria-label="Mute" selectedKey={mute} onSelectionChange={(k) => setMute(String(k))} fullWidth>
                <Label>Mute</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox><ListBox.Item id="keep" textValue="Leave as is">{standing(member).label}</ListBox.Item>{muteOptions.map((o) => <ListBox.Item key={o.id} id={o.id} textValue={o.label}>{o.label}</ListBox.Item>)}</ListBox></Select.Popover>
              </Select>
            )}
            {!locked && !self && (
              <div className="flex flex-wrap gap-3 border-t border-separator pt-3 text-sm">
                <button type="button" className="text-danger hover:underline" onClick={() => setConfirm('remove')}>Remove from the group</button>
                <button type="button" className="text-danger hover:underline" onClick={() => setConfirm('ban')}>{member.status === 'banned' ? 'Let them back in' : 'Block'}</button>
                {iAmOwner && member.status === 'active' && <button type="button" className="text-accent hover:underline" onClick={() => setConfirm('owner')}>Make owner</button>}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="gap-2"><Button variant="outline" onPress={onClose}>Cancel</Button><Button variant="primary" isPending={saving} onPress={() => void save()}>Save</Button></Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>
      <AlertDialog isOpen={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialog.Backdrop><AlertDialog.Container size="sm"><AlertDialog.Dialog aria-label="Confirm">
          <AlertDialog.Header><AlertDialog.Heading>{confirm && confirmText[confirm].title}</AlertDialog.Heading></AlertDialog.Header>
          <AlertDialog.Body><p className="text-sm text-muted">{confirm && confirmText[confirm].body}</p></AlertDialog.Body>
          <AlertDialog.Footer className="gap-2"><Button variant="outline" onPress={() => setConfirm(null)}>Cancel</Button><Button variant={confirm === 'owner' ? 'primary' : 'danger'} isPending={saving} onPress={() => void act()}>{confirm && confirmText[confirm].button}</Button></AlertDialog.Footer>
        </AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}
