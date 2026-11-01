import { useState, type KeyboardEvent } from 'react';
import { Button, Popover, Tooltip } from '@heroui/react';
import { DownloadSimpleIcon, PaperclipIcon, PencilSimpleIcon, PushPinIcon, SmileyIcon, TrashIcon } from '@phosphor-icons/react';
import type { Member, Message } from '../lib/supabase';
import { formatBytes, splitLinks, timeLabel } from '../lib/format';
import { Avatar } from './Avatar';

export interface ReactionSummary { emoji: string; count: number; mine: boolean }

export const EMOJI = ['👍', '❤️', '😂', '🎉', '😮', '🙏', '👀', '🔥'];

interface Props {
  message: Message;
  author: Member | undefined;
  /** Same author, moments after the previous post: no avatar, no name. */
  continued: boolean;
  url?: string;
  reactions: ReactionSummary[];
  /** Mine and the group lets me edit, or I moderate. */
  canEdit: boolean;
  canRemove: boolean;
  canMod: boolean;
  canReact: boolean;
  onReact: (emoji: string) => void;
  onEdit: (body: string) => Promise<void>;
  onPin: () => void;
  onDelete: () => void;
  /** A picture finished loading and the post grew. */
  onMedia?: () => void;
}

const roleTint: Partial<Record<Member['role'], string>> = { owner: 'var(--accent)', admin: 'var(--accent)' };

export function MessageItem({ message: m, author, continued, url, reactions, canEdit, canRemove, canMod, canReact, onReact, onEdit, onPin, onDelete, onMedia }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.body);
  const [saving, setSaving] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const isImage = !!m.attachment_type?.startsWith('image/');
  const name = author?.display_name ?? 'Someone';

  async function save() {
    const body = draft.trim();
    if (!body && !m.attachment_path) return;
    if (body === m.body) { setEditing(false); return; }
    setSaving(true);
    await onEdit(body);
    setSaving(false);
    setEditing(false);
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') { setDraft(m.body); setEditing(false); }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void save(); }
  }

  return (
    <article className={`yg-msg${continued ? ' yg-msg--cont' : ''}`} data-pinned={m.pinned_at ? 'true' : undefined} data-open={emojiOpen ? 'true' : undefined} aria-label={`${name}, ${timeLabel(m.created_at)}`}>
      {continued ? <time className="yg-msg__time yg-msg__time--side" dateTime={m.created_at}>{timeLabel(m.created_at)}</time> : <Avatar member={author} size={40} />}
      <div className="min-w-0">
        {!continued && (
          <header className="yg-msg__head">
            <span className="yg-msg__name" style={{ color: author ? roleTint[author.role] : undefined }}>{name}</span>
            {author?.flair && <span className="yg-flair" style={{ background: author.flair_color ?? undefined }}>{author.flair}</span>}
            <time className="yg-msg__time" dateTime={m.created_at}>{timeLabel(m.created_at)}</time>
            {m.pinned_at && <span className="yg-msg__time" title="Pinned"><PushPinIcon weight="fill" className="inline size-3" /></span>}
          </header>
        )}
        {editing ? (
          <div className="yg-msg__edit">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} rows={2} maxLength={4000} autoFocus aria-label="Edit your post" />
            <div className="flex gap-2 text-xs"><Button size="sm" variant="primary" isPending={saving} onPress={() => void save()}>Save</Button><Button size="sm" variant="ghost" onPress={() => { setDraft(m.body); setEditing(false); }}>Cancel</Button><span className="self-center" style={{ color: 'var(--muted)' }}>Enter saves, Escape cancels</span></div>
          </div>
        ) : (
          m.body && (
            <p className="yg-msg__text">
              {splitLinks(m.body).map((part, i) => (part.kind === 'link' ? <a key={i} href={part.value} target="_blank" rel="noopener noreferrer">{part.value}</a> : <span key={i}>{part.value}</span>))}
              {m.edited_at && <span className="yg-msg__edited">(edited)</span>}
            </p>
          )
        )}
        {m.attachment_path && isImage && (url ? <a href={url} target="_blank" rel="noopener noreferrer"><img className="yg-msg__img" src={url} alt={m.attachment_name ?? ''} loading="lazy" onLoad={onMedia} /></a> : <div className="yg-skel yg-msg__imgskel" aria-label="Loading picture" />)}
        {m.attachment_path && !isImage && (
          <a className="yg-msg__file" href={url ?? '#'} target="_blank" rel="noopener noreferrer" download={m.attachment_name ?? undefined} aria-disabled={!url}>
            <PaperclipIcon className="size-5 flex-none" />
            <span className="min-w-0"><strong>{m.attachment_name}</strong><span>{m.attachment_size ? formatBytes(m.attachment_size) : ''}</span></span>
            <DownloadSimpleIcon className="size-5 flex-none" />
          </a>
        )}
        {reactions.length > 0 && (
          <div className="yg-reacts">
            {reactions.map((r) => (
              <button key={r.emoji} type="button" className="yg-react" aria-pressed={r.mine} aria-label={`${r.emoji} ${r.count}`} disabled={!canReact} onClick={() => onReact(r.emoji)}>
                <span>{r.emoji}</span><span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {!editing && (canReact || canEdit || canRemove || canMod) && (
        <div className="yg-msg__actions">
          {canReact && (
            <Popover isOpen={emojiOpen} onOpenChange={setEmojiOpen}>
              <Button variant="ghost" size="sm" isIconOnly aria-label="React" className="yg-icon-btn"><SmileyIcon /></Button>
              <Popover.Content placement="top end">
                <Popover.Dialog aria-label="Pick a reaction" className="yg-emoji">
                  {EMOJI.map((e) => <button key={e} type="button" onClick={() => { onReact(e); setEmojiOpen(false); }} aria-label={e}>{e}</button>)}
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
          )}
          {canEdit && m.body && <Tooltip><Button variant="ghost" size="sm" isIconOnly aria-label="Edit" className="yg-icon-btn" onPress={() => { setDraft(m.body); setEditing(true); }}><PencilSimpleIcon /></Button><Tooltip.Content>Edit</Tooltip.Content></Tooltip>}
          {canMod && <Tooltip><Button variant="ghost" size="sm" isIconOnly aria-label={m.pinned_at ? 'Unpin' : 'Pin'} className="yg-icon-btn" onPress={onPin}><PushPinIcon weight={m.pinned_at ? 'fill' : 'regular'} /></Button><Tooltip.Content>{m.pinned_at ? 'Unpin' : 'Pin'}</Tooltip.Content></Tooltip>}
          {canRemove && <Tooltip><Button variant="ghost" size="sm" isIconOnly aria-label="Remove" className="yg-icon-btn" onPress={onDelete}><TrashIcon /></Button><Tooltip.Content>Remove</Tooltip.Content></Tooltip>}
        </div>
      )}
    </article>
  );
}
