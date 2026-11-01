import { useState } from 'react';
import { Card, Description, Label, ListBox, Select, Switch, TextArea, TextField, toast } from '@heroui/react';
import { CheckCircleIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { MonsterNote, RangeTabs } from '../yare';
import { useGroup } from '../features/GroupContext';
import type { GroupPatch, JoinMode } from '../lib/supabase';
import { updateGroup } from '../lib/groups-api';
import { useDebouncedPatch } from '../lib/save-status';
import { ManageShell } from './ManageShell';

const doors: Array<{ key: JoinMode; label: string; text: string }> = [
  { key: 'open', label: 'Open', text: 'Anyone can create an account on the sign-in page.' },
  { key: 'invite', label: 'Invite only', text: 'People need an invite link to create an account.' },
  { key: 'closed', label: 'Closed', text: 'Nobody new. Invite links stop working until you open it again.' },
];
const inviters = [{ key: 'admins' as const, label: 'Admins' }, { key: 'moderators' as const, label: 'Admins and moderators' }];
const sizes = [1, 2, 3, 5].map((n) => ({ key: String(n), label: `${n} MB` }));

type Toggle = 'allow_images' | 'allow_gifs' | 'allow_files' | 'allow_reactions' | 'members_edit_posts' | 'members_remove_posts' | 'members_edit_profile';

/** The door, the landing channel and the rules, what posts may carry, and what members may do. */
export function SettingsPage() {
  const { db, group, setGroup, channels } = useGroup();
  const [rules, setRules] = useState(group.rules);
  const [state, setState] = useState<'saved' | 'saving'>('saved');

  async function save(patch: GroupPatch) {
    setState('saving');
    try { setGroup(await updateGroup(db, group.id, patch)); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not save.'); }
    finally { setState('saved'); }
  }
  const pushRules = useDebouncedPatch<GroupPatch>((p) => void save(p), 800);

  const toggle = (key: Toggle, label: string, text: string) => (
    <Switch isSelected={group[key]} onChange={(v) => void save({ [key]: v } as GroupPatch)}>
      <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control><span className="flex flex-col"><span>{label}</span><span className="text-xs text-muted">{text}</span></span></Switch.Content>
    </Switch>
  );
  const open = (channels ?? []).filter((c) => !c.archived && !c.is_private);

  return (
    <ManageShell crumb="Settings" actions={<span className="flex items-center gap-1.5 text-sm text-muted">{state === 'saving' ? <><CircleNotchIcon className="animate-spin" /> Saving…</> : <><CheckCircleIcon /> All changes saved</>}</span>}>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
        <Card className="gap-4 p-5">
          <div><h2 className="text-lg">Who can join</h2><p className="text-sm text-muted">Admins are the emails on the deployment's allow list; this is about everyone else.</p></div>
          <RangeTabs options={doors.map((d) => ({ key: d.key, label: d.label }))} value={group.join_mode} onChange={(k) => void save({ join_mode: k })} aria-label="Who can join" />
          <p className="text-sm text-muted">{doors.find((d) => d.key === group.join_mode)?.text}</p>
          <div className="flex flex-col gap-2 border-t border-separator pt-4">
            <div className="text-sm font-medium">Who makes invite links</div>
            <RangeTabs options={inviters} value={group.invite_policy} onChange={(k) => void save({ invite_policy: k })} aria-label="Who makes invite links" />
            <p className="text-sm text-muted">{group.invite_policy === 'moderators' ? 'Moderators get an Invite people button in the group. Their links make members; only admins invite moderators.' : 'Only admins make invite links, under Invites.'}</p>
          </div>
        </Card>

        <Card className="gap-4 p-5">
          <div><h2 className="text-lg">Landing and rules</h2><p className="text-sm text-muted">Where people arrive, and what they agree to before they post.</p></div>
          <Select aria-label="Landing channel" selectedKey={group.landing_channel_id ?? 'first'} onSelectionChange={(k) => void save({ landing_channel_id: k === 'first' ? null : String(k) })} fullWidth>
            <Label>Landing channel</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="first" textValue="The first channel in the list">The first channel in the list</ListBox.Item>
                {open.map((c) => <ListBox.Item key={c.id} id={c.id} textValue={`#${c.name}`}>#{c.name}</ListBox.Item>)}
              </ListBox>
            </Select.Popover>
            <Description>Where everyone lands when they open the group.</Description>
          </Select>
          <TextField value={rules} onChange={(v) => { setRules(v); pushRules({ rules: v.trim() }); }} fullWidth maxLength={4000}>
            <Label>Group rules</Label>
            <TextArea rows={6} placeholder={'1. Be kind.\n2. Stay on topic.\n3. No ads.'} />
            <Description>Members accept them once before they post, and again whenever you change them. Leave empty for no rules.</Description>
          </TextField>
        </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
        <Card className="gap-4 p-5">
          <div><h2 className="text-lg">Members can</h2><p className="text-sm text-muted">Moderators and admins always can.</p></div>
          <div className="flex flex-col gap-3">
            {toggle('members_edit_posts', 'Edit their own posts', 'An edited post shows "(edited)".')}
            {toggle('members_remove_posts', 'Remove their own posts', 'Off: only moderators remove posts.')}
            {toggle('members_edit_profile', 'Change their name and picture', 'Off: the name they joined with stays.')}
          </div>
        </Card>

        <Card className="gap-4 p-5">
          <div><h2 className="text-lg">Posts</h2><p className="text-sm text-muted">What a post may carry besides words.</p></div>
          <div className="flex flex-col gap-3">
            {toggle('allow_images', 'Pictures', 'PNG, JPG and WebP.')}
            {toggle('allow_gifs', 'GIFs', 'Animated pictures.')}
            {toggle('allow_files', 'Files', 'Anything else: PDFs, zips, documents.')}
            {toggle('allow_reactions', 'Reactions', 'A small set of emoji under each post.')}
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Largest picture or file</div>
            <RangeTabs options={sizes} value={String(group.max_upload_mb)} onChange={(k) => void save({ max_upload_mb: Number(k) })} aria-label="Largest upload" />
          </div>
          <MonsterNote title="Mind your Supabase storage">
            Every picture and file in a post lives in your own storage, 1 GB in total on the free plan. 2 MB per post is a good place to start; you can boost this to 5 MB, but be careful with your Supabase storage. Removed posts free their space.
          </MonsterNote>
        </Card>
        </div>
      </div>
    </ManageShell>
  );
}
