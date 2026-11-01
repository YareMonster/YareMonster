import { HashIcon, LockSimpleIcon, MegaphoneIcon } from '@phosphor-icons/react';
import type { Channel } from '../lib/supabase';

/** A hash for a channel, a lock for a private one, a megaphone for announcements. */
export function ChannelIcon({ channel, className }: { channel: Channel; className?: string }) {
  if (channel.is_private) return <LockSimpleIcon className={className} weight="fill" />;
  if (channel.post_policy === 'admins') return <MegaphoneIcon className={className} weight="fill" />;
  return <HashIcon className={className} weight="bold" />;
}
