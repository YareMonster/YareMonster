import { useMemo, useState } from 'react';
import { AlertDialog, Button, Card, Checkbox, Description, Input, Label, ListBox, Modal, Select, Switch, TextField, toast } from '@heroui/react';
import { ArrowDownIcon, ArrowUpIcon, PencilSimpleIcon, PlusIcon } from '@phosphor-icons/react';
import { StatusChip } from '../yare';
import { useGroup } from '../features/GroupContext';
import type { Category, Channel, PostPolicy } from '../lib/supabase';
import { createCategory, createChannel, deleteCategory, deleteChannel, listChannelMembers, setChannelMembers, updateCategory, updateChannel } from '../lib/groups-api';
import { isValidChannelName, toChannelName } from '../lib/format';
import { ChannelIcon } from '../group/ChannelIcon';
import { ManageShell } from './ManageShell';

const policyLabel: Record<PostPolicy, string> = { everyone: 'Everyone posts', moderators: 'Moderators and up', admins: 'Admins only' };

/** Categories and channels: make them, order them, say who posts, keep some private. */
export function ChannelsPage() {
  const { db, categories, channels, refreshChannels } = useGroup();
  const [editing, setEditing] = useState<Channel | 'new' | null>(null);
  const [editingCat, setEditingCat] = useState<Category | 'new' | null>(null);

  const sections = useMemo(() => {
    const cats = categories ?? [];
    const list = channels ?? [];
    const under = (id: string | null) => list.filter((c) => (c.category_id && cats.some((x) => x.id === c.category_id) ? c.category_id : null) === id);
    return [{ cat: null as Category | null, list: under(null) }, ...cats.map((cat) => ({ cat, list: under(cat.id) }))].filter((s) => s.cat || s.list.length);
  }, [categories, channels]);

  async function moveChannel(list: Channel[], index: number, dir: -1 | 1) {
    const other = list[index + dir];
    const me = list[index];
    if (!other || !me) return;
    try {
      await Promise.all([updateChannel(db, me.id, { position: index + dir }), updateChannel(db, other.id, { position: index })]);
      // Normalise the rest so positions stay dense.
      await Promise.all(list.filter((c) => c.id !== me.id && c.id !== other.id).map((c, i) => { const pos = list.indexOf(c); return pos === i ? Promise.resolve() : updateChannel(db, c.id, { position: pos }); }));
      await refreshChannels();
    } catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not move it.'); }
  }
  async function moveCategory(index: number, dir: -1 | 1) {
    const cats = categories ?? [];
    const me = cats[index]; const other = cats[index + dir];
    if (!me || !other) return;
    try { await Promise.all([updateCategory(db, me.id, { position: index + dir }), updateCategory(db, other.id, { position: index })]); await refreshChannels(); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not move it.'); }
  }

  return (
    <ManageShell crumb="Channels" actions={<><Button variant="outline" onPress={() => setEditingCat('new')}><PlusIcon weight="bold" /> New category</Button><Button variant="primary" onPress={() => setEditing('new')}><PlusIcon weight="bold" /> New channel</Button></>}>
      {channels === null && <div className="flex flex-col gap-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-(--yare-radius-card) bg-surface-secondary" />)}</div>}
      <div className="flex flex-col gap-6">
        {sections.map((s, si) => (
          <section key={s.cat?.id ?? 'none'}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{s.cat ? s.cat.name : 'Without a category'}</h2>
              {s.cat && (
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="sm" isIconOnly aria-label="Rename" onPress={() => setEditingCat(s.cat)}><PencilSimpleIcon /></Button>
                  <Button variant="ghost" size="sm" isIconOnly aria-label="Move up" isDisabled={si <= 1} onPress={() => void moveCategory((categories ?? []).indexOf(s.cat!), -1)}><ArrowUpIcon /></Button>
                  <Button variant="ghost" size="sm" isIconOnly aria-label="Move down" isDisabled={si === sections.length - 1} onPress={() => void moveCategory((categories ?? []).indexOf(s.cat!), 1)}><ArrowDownIcon /></Button>
                </div>
              )}
            </div>
            <Card className="divide-y divide-separator p-0">
              {s.list.length === 0 && <p className="p-4 text-sm text-muted">No channels here yet.</p>}
              {s.list.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <ChannelIcon channel={c} className="size-5 flex-none text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{c.name}</span>{c.archived && <StatusChip tone="default">Closed</StatusChip>}{c.is_private && <StatusChip tone="warning">Private</StatusChip>}<StatusChip tone={c.post_policy === 'everyone' ? 'success' : 'accent'}>{policyLabel[c.post_policy]}</StatusChip></div>
                    {c.topic && <p className="truncate text-sm text-muted">{c.topic}</p>}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="sm" isIconOnly aria-label="Move up" isDisabled={i === 0} onPress={() => void moveChannel(s.list, i, -1)}><ArrowUpIcon /></Button>
                    <Button variant="ghost" size="sm" isIconOnly aria-label="Move down" isDisabled={i === s.list.length - 1} onPress={() => void moveChannel(s.list, i, 1)}><ArrowDownIcon /></Button>
                    <Button variant="outline" size="sm" onPress={() => setEditing(c)}>Edit</Button>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        ))}
      </div>
      {editing && <ChannelDialog channel={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {editingCat && <CategoryDialog category={editingCat === 'new' ? null : editingCat} onClose={() => setEditingCat(null)} />}
    </ManageShell>
  );
}

function CategoryDialog({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const { db, categories, refreshChannels } = useGroup();
  const [name, setName] = useState(category?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  async function save() {
    setSaving(true);
    try {
      if (category) await updateCategory(db, category.id, { name: name.trim() });
      else await createCategory(db, name.trim(), categories?.length ?? 0);
      await refreshChannels(); onClose();
    } catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not save.'); setSaving(false); }
  }
  async function destroy() {
    if (!category) return;
    setSaving(true);
    try { await deleteCategory(db, category.id); await refreshChannels(); onClose(); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not delete it.'); setSaving(false); }
  }
  return (
    <Modal isOpen onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop><Modal.Container size="sm"><Modal.Dialog aria-label={category ? 'Rename category' : 'New category'}>
        <Modal.CloseTrigger />
        <Modal.Header><Modal.Heading>{category ? 'Rename category' : 'New category'}</Modal.Heading></Modal.Header>
        <Modal.Body className="flex flex-col gap-4">
          <TextField value={name} onChange={setName} fullWidth maxLength={40} isRequired autoFocus><Label>Name</Label><Input placeholder="Talk, Projects, Help" /></TextField>
          {category && !confirm && <button type="button" className="self-start text-sm text-danger hover:underline" onClick={() => setConfirm(true)}>Delete this category</button>}
          {confirm && <div className="flex items-center gap-2 text-sm"><span className="text-muted">Its channels stay, without a category.</span><Button size="sm" variant="danger" isPending={saving} onPress={() => void destroy()}>Delete</Button></div>}
        </Modal.Body>
        <Modal.Footer className="gap-2"><Button variant="outline" onPress={onClose}>Cancel</Button><Button variant="primary" isPending={saving} isDisabled={!name.trim()} onPress={() => void save()}>Save</Button></Modal.Footer>
      </Modal.Dialog></Modal.Container></Modal.Backdrop>
    </Modal>
  );
}

function ChannelDialog({ channel, onClose }: { channel: Channel | null; onClose: () => void }) {
  const { db, categories, channels, members, refreshChannels } = useGroup();
  const [name, setName] = useState(channel?.name ?? '');
  const [topic, setTopic] = useState(channel?.topic ?? '');
  const [categoryId, setCategoryId] = useState<string>(channel?.category_id ?? categories?.[0]?.id ?? '');
  const [policy, setPolicy] = useState<PostPolicy>(channel?.post_policy ?? 'everyone');
  const [isPrivate, setPrivate] = useState(channel?.is_private ?? false);
  const [archived, setArchived] = useState(channel?.archived ?? false);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const clean = toChannelName(name);
  const taken = (channels ?? []).some((c) => c.name === clean && c.id !== channel?.id);
  const people = (members ?? []).filter((m) => m.status === 'active' && m.role !== 'owner' && m.role !== 'admin');

  if (isPrivate && picked === null) {
    setPicked(new Set());
    if (channel) listChannelMembers(db, channel.id).then((rows) => setPicked(new Set(rows.map((r) => r.user_id)))).catch(() => undefined);
  }

  async function save() {
    if (!isValidChannelName(clean) || taken) return;
    setSaving(true);
    try {
      const patch = { name: clean, topic: topic.trim(), category_id: categoryId || null, post_policy: policy, is_private: isPrivate };
      const row = channel ? await updateChannel(db, channel.id, { ...patch, archived }) : await createChannel(db, { ...patch, position: (channels ?? []).filter((c) => (c.category_id ?? null) === (categoryId || null)).length });
      if (isPrivate && picked) await setChannelMembers(db, row.id, [...picked]);
      await refreshChannels(); onClose();
    } catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not save.'); setSaving(false); }
  }
  async function destroy() {
    if (!channel) return;
    setSaving(true);
    try { await deleteChannel(db, channel.id); await refreshChannels(); onClose(); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not delete it.'); setSaving(false); }
  }

  return (
    <>
      <Modal isOpen onOpenChange={(o) => { if (!o) onClose(); }}>
        <Modal.Backdrop><Modal.Container size="md"><Modal.Dialog aria-label={channel ? 'Edit channel' : 'New channel'}>
          <Modal.CloseTrigger />
          <Modal.Header><Modal.Heading>{channel ? `Edit #${channel.name}` : 'New channel'}</Modal.Heading></Modal.Header>
          <Modal.Body className="flex flex-col gap-4">
            <TextField value={name} onChange={setName} fullWidth maxLength={40} isRequired autoFocus isInvalid={!!name && (!isValidChannelName(clean) || taken)}>
              <Label>Name</Label>
              <Input placeholder="general" />
              <Description>{taken ? 'That name is taken.' : clean && clean !== name ? `Will be #${clean}` : 'Lowercase letters, numbers and hyphens.'}</Description>
            </TextField>
            <TextField value={topic} onChange={setTopic} fullWidth maxLength={200}><Label>Topic</Label><Input placeholder="One line about what goes here" /></TextField>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select aria-label="Category" selectedKey={categoryId || 'none'} onSelectionChange={(k) => setCategoryId(k === 'none' ? '' : String(k))} fullWidth>
                <Label>Category</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox><ListBox.Item id="none" textValue="None">None</ListBox.Item>{(categories ?? []).map((c) => <ListBox.Item key={c.id} id={c.id} textValue={c.name}>{c.name}</ListBox.Item>)}</ListBox></Select.Popover>
              </Select>
              <Select aria-label="Who posts" selectedKey={policy} onSelectionChange={(k) => setPolicy(k as PostPolicy)} fullWidth>
                <Label>Who posts</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox>{(Object.keys(policyLabel) as PostPolicy[]).map((p) => <ListBox.Item key={p} id={p} textValue={policyLabel[p]}>{policyLabel[p]}</ListBox.Item>)}</ListBox></Select.Popover>
              </Select>
            </div>
            <Switch isSelected={isPrivate} onChange={setPrivate}>
              <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control>Private: only the people you pick see it</Switch.Content>
            </Switch>
            {isPrivate && (
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-(--yare-radius-control) border border-border p-2">
                <p className="px-1 pb-1 text-xs text-muted">Admins always see private channels. Pick who else does.</p>
                {people.length === 0 && <p className="px-1 text-sm text-muted">Nobody to pick yet.</p>}
                {people.map((m) => (
                  <Checkbox key={m.user_id} isSelected={picked?.has(m.user_id) ?? false} onChange={(v) => setPicked((prev) => { const next = new Set(prev ?? []); if (v) next.add(m.user_id); else next.delete(m.user_id); return next; })}>
                    <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                    <Checkbox.Content>{m.display_name}</Checkbox.Content>
                  </Checkbox>
                ))}
              </div>
            )}
            {channel && (
              <Switch isSelected={archived} onChange={setArchived}>
                <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control>Closed: still readable, nobody posts</Switch.Content>
              </Switch>
            )}
            {channel && <button type="button" className="self-start text-sm text-danger hover:underline" onClick={() => setConfirm(true)}>Delete this channel and its posts</button>}
          </Modal.Body>
          <Modal.Footer className="gap-2"><Button variant="outline" onPress={onClose}>Cancel</Button><Button variant="primary" isPending={saving} isDisabled={!clean || !isValidChannelName(clean) || taken} onPress={() => void save()}>{channel ? 'Save' : 'Create channel'}</Button></Modal.Footer>
        </Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>
      <AlertDialog isOpen={confirm} onOpenChange={setConfirm}>
        <AlertDialog.Backdrop><AlertDialog.Container size="sm"><AlertDialog.Dialog aria-label="Delete channel">
          <AlertDialog.Header><AlertDialog.Heading>Delete #{channel?.name}?</AlertDialog.Heading></AlertDialog.Header>
          <AlertDialog.Body><p className="text-sm text-muted">Every post in it goes too. Closing the channel instead keeps them readable.</p></AlertDialog.Body>
          <AlertDialog.Footer className="gap-2"><Button variant="outline" onPress={() => setConfirm(false)}>Cancel</Button><Button variant="danger" isPending={saving} onPress={() => void destroy()}>Delete</Button></AlertDialog.Footer>
        </AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}
