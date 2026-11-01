import { useGroup } from '../features/GroupContext';
import type { Member } from '../lib/supabase';
import { imageUrl } from '../lib/supabase';
import { initials, nameColor } from '../lib/format';

/** A member's picture, or their initials on a steady colour. The green dot means they have the app open. */
export function Avatar({ member, size = 40, showOnline = false, className }: { member: Member | undefined; size?: number; showOnline?: boolean; className?: string }) {
  const { db, online } = useGroup();
  const name = member?.display_name ?? 'Someone';
  const src = imageUrl(db, member?.avatar_path);
  return (
    <span className={['yg-avatar', className].filter(Boolean).join(' ')} style={{ width: size, height: size, fontSize: size * 0.38, background: src ? 'transparent' : nameColor(member?.user_id ?? name) }} aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" /> : initials(name)}
      {showOnline && member && online.has(member.user_id) && <span className="yg-avatar__dot" />}
    </span>
  );
}
