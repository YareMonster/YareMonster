import { useEffect, useState } from 'react';
import { Button, Popover, Tooltip } from '@heroui/react';
import { PushPinIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { useGroup } from '../features/GroupContext';
import type { Channel, Message } from '../lib/supabase';
import { listPinned } from '../lib/groups-api';
import { timeLabel } from '../lib/format';
import { ChannelIcon } from './ChannelIcon';
import { MessageList } from './MessageList';
import { Composer } from './Composer';

/** One channel inside the room card: its name and topic, its posts, the composer. */
export function ChannelPane({ channel, onPeople }: { channel: Channel; onPeople: () => void }) {
  const { markRead } = useGroup();
  useEffect(() => { markRead(channel.id); }, [channel.id, channel.last_message_at, markRead]);
  return (
    <>
      <header className="yg-room__head">
        <h2 className="yg-room__title"><ChannelIcon channel={channel} /> {channel.name}</h2>
        {channel.topic && <p className="yg-room__topic" title={channel.topic}>{channel.topic}</p>}
        <div className="yg-room__actions">
          <PinnedPopover channel={channel} />
          <Tooltip>
            <Button variant="ghost" isIconOnly aria-label="Members" className="xl:hidden" onPress={onPeople}><UsersThreeIcon /></Button>
            <Tooltip.Content>Members</Tooltip.Content>
          </Tooltip>
        </div>
      </header>
      <MessageList channel={channel} />
      <Composer channel={channel} />
    </>
  );
}

/** The pinned posts of a channel, from the top bar. */
export function PinnedPopover({ channel }: { channel: Channel }) {
  const { db, memberById } = useGroup();
  const [open, setOpen] = useState(false);
  const [pins, setPins] = useState<Message[] | null>(null);
  useEffect(() => { if (open) { setPins(null); listPinned(db, channel.id).then(setPins).catch(() => setPins([])); } }, [open, db, channel.id]);
  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Tooltip>
        <Button variant="ghost" isIconOnly aria-label="Pinned posts"><PushPinIcon /></Button>
        <Tooltip.Content>Pinned</Tooltip.Content>
      </Tooltip>
      <Popover.Content placement="bottom end" className="w-80">
        <Popover.Dialog aria-label="Pinned posts" className="flex max-h-96 flex-col gap-2 overflow-y-auto p-3">
          <h3 className="text-sm font-semibold">Pinned in #{channel.name}</h3>
          {pins === null && <div className="flex flex-col gap-2" aria-busy="true"><div className="yg-skel h-10" /><div className="yg-skel h-10" /></div>}
          {pins?.length === 0 && <p className="text-sm text-muted">Nothing pinned yet. Moderators pin a post from its menu.</p>}
          {pins?.map((m) => (
            <div key={m.id} className="rounded-(--yare-radius-control) border border-border p-2 text-sm">
              <div className="mb-0.5 flex items-baseline gap-2"><strong className="truncate">{memberById.get(m.author_id ?? '')?.display_name ?? 'Someone'}</strong><span className="text-xs text-muted">{new Date(m.created_at).toLocaleDateString()} {timeLabel(m.created_at)}</span></div>
              <p className="line-clamp-3 whitespace-pre-wrap">{m.body || m.attachment_name}</p>
            </div>
          ))}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
