import { useEffect, useState } from 'react';
import { Button, Input, Label, ListBox, Modal, Select, TextField, toast } from '@heroui/react';
import { CopyIcon, PlusIcon } from '@phosphor-icons/react';
import { DataTable, MonsterNote, StatusChip } from '../yare';
import { useGroup } from '../features/GroupContext';
import type { Invite } from '../lib/supabase';
import { createInvite, listInvites, revokeInvite } from '../lib/groups-api';
import { ManageShell } from './ManageShell';

export const inviteUrl = (code: string) => `${window.location.origin}/join/${code}`;
function inviteState(i: Invite): { label: string; tone: 'success' | 'default' | 'warning' } {
  if (i.revoked_at) return { label: 'Revoked', tone: 'default' };
  if (i.expires_at && new Date(i.expires_at) <= new Date()) return { label: 'Expired', tone: 'default' };
  if (i.max_uses != null && i.uses >= i.max_uses) return { label: 'Used up', tone: 'warning' };
  return { label: 'Open', tone: 'success' };
}

/** Invite links: make one, copy it, see how it is doing, revoke it. */
export function InvitesPage() {
  const { db, group } = useGroup();
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => { listInvites(db).then(setInvites).catch(() => setInvites([])); }, [db]);

  async function copy(code: string) {
    try { await navigator.clipboard.writeText(inviteUrl(code)); toast.success('Link copied'); } catch { toast.danger('Could not copy. Select the link and copy it yourself.'); }
  }
  async function revoke(i: Invite) {
    try { const next = await revokeInvite(db, i.id); setInvites((list) => list?.map((x) => (x.id === i.id ? next : x)) ?? null); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not revoke it.'); }
  }

  return (
    <ManageShell crumb="Invites" actions={<Button variant="primary" onPress={() => setCreating(true)}><PlusIcon weight="bold" /> New invite link</Button>}>
      {group.join_mode === 'open' && <MonsterNote title="The door is open" className="mb-6">Anyone can create an account on the sign-in page right now, with or without a link. Links are still handy for inviting moderators. Change the door under Settings.</MonsterNote>}
      {group.join_mode === 'closed' && <MonsterNote title="The door is closed" className="mb-6">Invite links do nothing while the group is closed. Open it under Settings when you are ready for people.</MonsterNote>}
      {invites === null ? <div className="h-48 animate-pulse rounded-(--yare-radius-card) bg-surface-secondary" aria-busy="true" /> : (
        <DataTable<Invite>
          caption="Invite links"
          rows={invites}
          rowKey={(i) => i.id}
          empty={<p className="p-6 text-center text-sm text-muted">No invite links yet. Make one and send it to people.</p>}
          columns={[
            { id: 'link', header: 'Link', cell: (i) => <div className="flex items-center gap-2"><code className="text-xs">…/join/{i.code}</code>{inviteState(i).label === 'Open' && <Button variant="ghost" size="sm" isIconOnly aria-label="Copy link" onPress={() => void copy(i.code)}><CopyIcon /></Button>}</div> },
            { id: 'note', header: 'Note', cell: (i) => <span className="text-muted">{i.note || '–'}</span> },
            { id: 'role', header: 'Joins as', cell: (i) => i.role === 'moderator' ? 'Moderator' : 'Member' },
            { id: 'uses', header: 'Uses', numeric: true, align: 'end', cell: (i) => `${i.uses}${i.max_uses != null ? ` / ${i.max_uses}` : ''}` },
            { id: 'expires', header: 'Expires', numeric: true, cell: (i) => <span className="text-muted">{i.expires_at ? new Date(i.expires_at).toLocaleDateString() : 'Never'}</span> },
            { id: 'state', header: 'Status', cell: (i) => <StatusChip tone={inviteState(i).tone}>{inviteState(i).label}</StatusChip> },
            { id: 'actions', header: '', label: 'Actions', align: 'end', cell: (i) => inviteState(i).label === 'Open' ? <Button variant="outline" size="sm" onPress={() => void revoke(i)}>Revoke</Button> : null },
          ]}
        />
      )}
      {creating && <InviteDialog onClose={() => setCreating(false)} onCreated={(i) => { setInvites((list) => [i, ...(list ?? [])]); void copy(i.code); }} />}
    </ManageShell>
  );
}

const expiryOptions = [{ id: 'never', label: 'Never', days: null }, { id: '1', label: '1 day', days: 1 }, { id: '7', label: '7 days', days: 7 }, { id: '30', label: '30 days', days: 30 }];
const usesOptions = [{ id: 'any', label: 'No limit', n: null }, { id: '1', label: '1 person', n: 1 }, { id: '10', label: '10 people', n: 10 }, { id: '100', label: '100 people', n: 100 }];

/** Make an invite link. Admins pick the role; moderators invite members. */
export function InviteDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (i: Invite) => void }) {
  const { db, isStaff } = useGroup();
  const [role, setRole] = useState<Invite['role']>('member');
  const [expiry, setExpiry] = useState('7');
  const [uses, setUses] = useState('any');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  async function create() {
    setSaving(true);
    try {
      const days = expiryOptions.find((o) => o.id === expiry)?.days ?? null;
      const i = await createInvite(db, { role, note: note.trim(), max_uses: usesOptions.find((o) => o.id === uses)?.n ?? null, expires_at: days ? new Date(Date.now() + days * 86400000).toISOString() : null });
      onCreated(i); onClose();
    } catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not make the link.'); setSaving(false); }
  }
  return (
    <Modal isOpen onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop><Modal.Container size="sm"><Modal.Dialog aria-label="New invite link">
        <Modal.CloseTrigger />
        <Modal.Header><Modal.Heading>New invite link</Modal.Heading></Modal.Header>
        <Modal.Body className="flex flex-col gap-4">
          {isStaff && <Select aria-label="Joins as" selectedKey={role} onSelectionChange={(k) => setRole(k as Invite['role'])} fullWidth>
            <Label>Joins as</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover><ListBox><ListBox.Item id="member" textValue="Member">Member</ListBox.Item><ListBox.Item id="moderator" textValue="Moderator">Moderator</ListBox.Item></ListBox></Select.Popover>
          </Select>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select aria-label="Expires" selectedKey={expiry} onSelectionChange={(k) => setExpiry(String(k))} fullWidth>
              <Label>Expires</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox>{expiryOptions.map((o) => <ListBox.Item key={o.id} id={o.id} textValue={o.label}>{o.label}</ListBox.Item>)}</ListBox></Select.Popover>
            </Select>
            <Select aria-label="Uses" selectedKey={uses} onSelectionChange={(k) => setUses(String(k))} fullWidth>
              <Label>Good for</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox>{usesOptions.map((o) => <ListBox.Item key={o.id} id={o.id} textValue={o.label}>{o.label}</ListBox.Item>)}</ListBox></Select.Popover>
            </Select>
          </div>
          <TextField value={note} onChange={setNote} fullWidth maxLength={120}><Label>Note, for you</Label><Input placeholder="Sent to the newsletter" /></TextField>
        </Modal.Body>
        <Modal.Footer className="gap-2"><Button variant="outline" onPress={onClose}>Cancel</Button><Button variant="primary" isPending={saving} onPress={() => void create()}>Make the link</Button></Modal.Footer>
      </Modal.Dialog></Modal.Container></Modal.Backdrop>
    </Modal>
  );
}
