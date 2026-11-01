import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertDialog, Button, toast } from '@heroui/react';
import { Notice } from '../yare';
import { useGroup } from '../features/GroupContext';
import type { Channel, Message, Reaction } from '../lib/supabase';
import { PAGE, addReaction, editMessage, listMessages, listReactions, pinMessage, removeMessage, removeReaction, signedUrls } from '../lib/groups-api';
import { dayKey, dayLabel } from '../lib/format';
import { ChannelIcon } from './ChannelIcon';
import { MessageItem, type ReactionSummary } from './MessageItem';

const sameReaction = (a: Reaction, b: Reaction) => a.message_id === b.message_id && a.user_id === b.user_id && a.emoji === b.emoji;
const GROUP_WINDOW = 5 * 60 * 1000;

/** The posts of a channel, oldest first, kept live. Earlier pages load on request. */
export function MessageList({ channel }: { channel: Channel }) {
  const { db, userId, memberById, isMod, group, canPost, markRead, canEditOwn, canRemoveOwn } = useGroup();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map());
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const fetchUrls = useCallback(async (ms: Message[]) => {
    const paths = ms.map((m) => m.attachment_path).filter((p): p is string => !!p);
    if (!paths.length) return;
    const map = await signedUrls(db, paths).catch(() => null);
    if (map) setUrls((prev) => new Map([...prev, ...map]));
  }, [db]);

  useEffect(() => {
    let gone = false;
    setMessages(null); setReactions([]); setHasMore(false); setError(null); stick.current = true;
    (async () => {
      try {
        const ms = await listMessages(db, channel.id);
        if (gone) return;
        setMessages(ms); setHasMore(ms.length === PAGE);
        const [rs] = await Promise.all([listReactions(db, ms.map((m) => m.id)), fetchUrls(ms)]);
        if (!gone) setReactions(rs);
      } catch (err) {
        if (!gone) setError(err instanceof Error ? err.message : 'Could not load this channel.');
      }
    })();
    const live = db.channel(`yaregroups:channel:${channel.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'yaregroups_messages', filter: `channel_id=eq.${channel.id}` }, (p) => {
        const m = p.new as Message;
        setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
        void fetchUrls([m]);
        markRead(channel.id);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'yaregroups_messages', filter: `channel_id=eq.${channel.id}` }, (p) => {
        const m = p.new as Message;
        setMessages((prev) => (prev ? (m.deleted_at ? prev.filter((x) => x.id !== m.id) : prev.map((x) => (x.id === m.id ? m : x))) : prev));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'yaregroups_reactions' }, (p) => {
        const r = p.new as Reaction;
        setReactions((prev) => (prev.some((x) => sameReaction(x, r)) ? prev : [...prev, r]));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'yaregroups_reactions' }, (p) => {
        const r = p.old as Reaction;
        setReactions((prev) => prev.filter((x) => !sameReaction(x, r)));
      })
      .subscribe();
    return () => { gone = true; void db.removeChannel(live); };
  }, [db, channel.id, fetchUrls, markRead]);

  // Stay at the bottom while the person is at the bottom.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, urls]);
  const onMedia = useCallback(() => { const el = scroller.current; if (el && stick.current) el.scrollTop = el.scrollHeight; }, []);
  const onScroll = () => {
    const el = scroller.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  async function loadMore() {
    const el = scroller.current;
    if (!messages?.length || !el) return;
    setLoadingMore(true);
    const before = el.scrollHeight;
    try {
      const older = await listMessages(db, channel.id, messages[0]!.created_at);
      setMessages((prev) => (prev ? [...older, ...prev] : older));
      setHasMore(older.length === PAGE);
      stick.current = false;
      const rs = await listReactions(db, older.map((m) => m.id));
      setReactions((prev) => [...prev, ...rs.filter((r) => !prev.some((x) => sameReaction(x, r)))]);
      void fetchUrls(older);
      requestAnimationFrame(() => { el.scrollTop += el.scrollHeight - before; });
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not load earlier posts.');
    } finally {
      setLoadingMore(false);
    }
  }

  const reactionsByMessage = useMemo(() => {
    const out = new Map<string, ReactionSummary[]>();
    for (const r of reactions) {
      const list = out.get(r.message_id) ?? [];
      const hit = list.find((x) => x.emoji === r.emoji);
      if (hit) { hit.count++; if (r.user_id === userId) hit.mine = true; }
      else list.push({ emoji: r.emoji, count: 1, mine: r.user_id === userId });
      out.set(r.message_id, list);
    }
    return out;
  }, [reactions, userId]);

  const toggleReaction = async (m: Message, emoji: string) => {
    const mine = reactions.some((r) => r.message_id === m.id && r.user_id === userId && r.emoji === emoji);
    try { if (mine) await removeReaction(db, m.id, userId, emoji); else await addReaction(db, m.id, emoji); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not react.'); }
  };
  const edit = async (m: Message, body: string) => {
    try { const next = await editMessage(db, m.id, body); setMessages((prev) => prev?.map((x) => (x.id === m.id ? next : x)) ?? prev); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not save the edit.'); }
  };
  const pin = async (m: Message) => {
    try { const next = await pinMessage(db, m.id, !m.pinned_at); setMessages((prev) => prev?.map((x) => (x.id === m.id ? next : x)) ?? prev); toast.success(next.pinned_at ? 'Pinned' : 'Unpinned'); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not pin.'); }
  };
  const destroy = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try { await removeMessage(db, toDelete); setMessages((prev) => prev?.filter((x) => x.id !== toDelete.id) ?? prev); setToDelete(null); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not remove the post.'); }
    finally { setDeleting(false); }
  };

  const canReact = group.allow_reactions && canPost(channel).ok;

  return (
    <>
      <div className="yg-msgs" ref={scroller} onScroll={onScroll}>
        {error && <div className="px-4"><Notice status="danger" title="Could not load this channel">{error}</Notice></div>}
        {messages === null && !error && (
          <div className="flex flex-col gap-4 p-4" aria-busy="true" aria-label="Loading posts">
            {[0, 1, 2].map((i) => <div key={i} className="grid grid-cols-[2.5rem_1fr] gap-3"><div className="yg-skel h-10 w-10 rounded-full" /><div className="flex flex-col gap-2"><div className="yg-skel h-4 w-40" /><div className="yg-skel h-4 w-3/4" /></div></div>)}
          </div>
        )}
        {messages !== null && (hasMore ? (
          <div className="yg-msgs__more"><Button variant="outline" size="sm" isPending={loadingMore} onPress={() => void loadMore()}>Earlier posts</Button></div>
        ) : (
          <div className="yg-start">
            <div className="yg-start__icon"><ChannelIcon channel={channel} className="size-7" /></div>
            <h2>Welcome to #{channel.name}</h2>
            <p>{channel.topic || (channel.post_policy === 'admins' ? 'Announcements from the admins.' : 'This is the start of the channel.')}</p>
          </div>
        ))}
        {messages?.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
          const continued = !newDay && !!prev && prev.author_id === m.author_id && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < GROUP_WINDOW && !prev.pinned_at && !m.pinned_at;
          return (
            <Fragment key={m.id}>
              {newDay && <div className="yg-day" role="separator">{dayLabel(m.created_at)}</div>}
              <MessageItem
                message={m}
                author={memberById.get(m.author_id ?? '')}
                continued={continued}
                url={m.attachment_path ? urls.get(m.attachment_path) : undefined}
                reactions={reactionsByMessage.get(m.id) ?? []}
                canEdit={m.author_id === userId && canEditOwn}
                canRemove={(m.author_id === userId && canRemoveOwn) || isMod}
                canMod={isMod}
                canReact={canReact}
                onReact={(emoji) => void toggleReaction(m, emoji)}
                onEdit={(body) => edit(m, body)}
                onPin={() => void pin(m)}
                onDelete={() => setToDelete(m)}
                onMedia={onMedia}
              />
            </Fragment>
          );
        })}
      </div>
      <AlertDialog isOpen={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Remove post">
              <AlertDialog.Header><AlertDialog.Heading>Remove this post?</AlertDialog.Heading></AlertDialog.Header>
              <AlertDialog.Body><p className="text-sm text-muted">It disappears for everyone. There is no undo.</p></AlertDialog.Body>
              <AlertDialog.Footer className="gap-2">
                <Button variant="outline" onPress={() => setToDelete(null)}>Keep it</Button>
                <Button variant="danger" onPress={() => void destroy()} isPending={deleting}>Remove</Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}
