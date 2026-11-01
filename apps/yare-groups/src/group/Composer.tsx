import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Button, toast } from '@heroui/react';
import { LockSimpleIcon, PaperPlaneRightIcon, PaperclipIcon, PlusCircleIcon, XIcon } from '@phosphor-icons/react';
import { useGroup } from '../features/GroupContext';
import type { Channel } from '../lib/supabase';
import { sendMessage, uploadAttachment } from '../lib/groups-api';
import { formatBytes } from '../lib/format';

/** Where a post is written: words, one picture or file, Enter to send. */
export function Composer({ channel }: { channel: Channel }) {
  const { db, userId, group, canPost, needsRules, setRulesOpen } = useGroup();
  const allowed = canPost(channel);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const maxBytes = group.max_upload_mb * 1048576;
  const accept = [group.allow_images && 'image/png,image/jpeg,image/webp', group.allow_gifs && 'image/gif', group.allow_files && '*/*'].filter(Boolean).join(',');

  useEffect(() => { setText(''); setFile(null); area.current?.focus(); }, [channel.id]);
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) { setPreview(null); return; }
    const u = URL.createObjectURL(file); setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  function pick(f: File | undefined) {
    if (!f) return;
    if (f.size > maxBytes) { toast.danger(`That file is over ${group.max_upload_mb} MB.`); return; }
    const gif = f.type === 'image/gif'; const image = f.type.startsWith('image/') && !gif;
    if (gif && !group.allow_gifs) { toast.danger('GIFs are off in this group.'); return; }
    if (image && !group.allow_images) { toast.danger('Pictures are off in this group.'); return; }
    if (!gif && !image && !group.allow_files) { toast.danger('Only pictures can be posted here.'); return; }
    setFile(f);
  }
  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const f = Array.from(e.clipboardData.files)[0];
    if (f && accept) { e.preventDefault(); pick(f); }
  }
  function grow() {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); }
  }
  async function send() {
    const body = text.trim();
    if ((!body && !file) || sending) return;
    setSending(true);
    try {
      const attachment = file ? await uploadAttachment(db, channel.id, file) : undefined;
      await sendMessage(db, { channel_id: channel.id, author_id: userId, body, attachment });
      setText(''); setFile(null);
      requestAnimationFrame(grow);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not post that.');
    } finally {
      setSending(false);
      area.current?.focus();
    }
  }

  if (!allowed.ok) return (
    <div className="yg-compose--off" role="status">
      <LockSimpleIcon className="size-4 flex-none" /> <span className="flex-1">{allowed.reason}</span>
      {needsRules && <Button size="sm" variant="primary" onPress={() => setRulesOpen(true)}>Read the rules</Button>}
    </div>
  );

  const kinds = [group.allow_images && 'pictures', group.allow_gifs && 'GIFs', group.allow_files && 'files'].filter(Boolean) as string[];
  return (
    <div className="yg-compose">
      {file && (
        <div className="yg-compose__file">
          {preview ? <img src={preview} alt="" /> : <PaperclipIcon className="size-5" />}
          <span className="min-w-0"><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></span>
          <button type="button" className="yg-icon-btn grid size-7 place-items-center rounded-full" aria-label="Remove the file" onClick={() => setFile(null)}><XIcon /></button>
        </div>
      )}
      <div className="yg-compose__box">
        {accept && <button type="button" className="yg-compose__attach" aria-label="Add a picture or file" onClick={() => picker.current?.click()}><PlusCircleIcon className="size-6" weight="fill" /></button>}
        <textarea ref={area} value={text} rows={1} maxLength={4000} placeholder={`Post in #${channel.name}`} aria-label={`Post in ${channel.name}`} onChange={(e) => { setText(e.target.value); grow(); }} onKeyDown={onKey} onPaste={onPaste} />
        <button type="button" className="yg-compose__send" aria-label="Send" disabled={sending || (!text.trim() && !file)} onClick={() => void send()}><PaperPlaneRightIcon className="size-4" weight="fill" /></button>
      </div>
      <p className="yg-compose__hint">Enter sends, Shift+Enter for a new line.{kinds.length > 0 && ` ${kinds.join(', ').replace(/^./, (c) => c.toUpperCase())} up to ${group.max_upload_mb} MB.`}</p>
      {accept && <input ref={picker} type="file" hidden accept={accept} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />}
    </div>
  );
}
