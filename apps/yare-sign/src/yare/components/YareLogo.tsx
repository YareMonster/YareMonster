import type { AppIdentity } from '../brand';
import { yareMarkSrc } from '../brand';

/** An app's lockup, sized by height. The PNGs are 192px tall, so 48px renders at 4x. */
export function YareLogo({ app, height = 40, align = 'start', className }: { app: AppIdentity; height?: number; align?: 'start' | 'center'; className?: string }) {
  return (
    <img
      src={app.logoSrc}
      alt={app.name}
      height={height}
      style={{ height, width: 'auto', maxWidth: '100%', objectFit: 'contain', alignSelf: align === 'center' ? 'center' : 'flex-start' }}
      className={className}
      draggable={false}
    />
  );
}

/** The monster head on its own: favicons, the Powered-by credit, empty states. Decorative unless given an alt. */
export function YareMark({ size = 24, alt = '', className }: { size?: number; alt?: string; className?: string }) {
  return <img src={yareMarkSrc(size > 64 ? 256 : 64)} alt={alt} width={size} height={size} className={className} draggable={false} />;
}
