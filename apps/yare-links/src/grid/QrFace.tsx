import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { PublicBlock } from '../lib/supabase';

/** The block's link as a QR code, drawn in the block's own colours, the title under it when there is room. */
export function QrFace({ block: b, fg, bg }: { block: PublicBlock; fg: string; bg: string }) {
  const [svg, setSvg] = useState<string>('');
  useEffect(() => {
    let gone = false;
    QRCode.toString(b.url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: fg, light: bg } }).then((s) => { if (!gone) setSvg(s); }).catch(() => { if (!gone) setSvg(''); });
    return () => { gone = true; };
  }, [b.url, fg, bg]);
  return (
    <span className="yg-qr" data-words={b.title && b.h >= 3 ? 'true' : undefined}>
      <span className="yg-qr__code" dangerouslySetInnerHTML={{ __html: svg }} />
      {b.title && b.h >= 3 && <span className="yg-block__title yg-qr__title">{b.title}</span>}
    </span>
  );
}
