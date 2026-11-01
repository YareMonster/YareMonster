import { useState, type ReactNode } from 'react';

export interface TokenIconProps {
  /** An image of the coin or token; a lettered disc when missing. */
  src?: string | null;
  symbol: string;
  size?: number;
  className?: string;
}

const hue = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

/** A coin's logo, or its first letters on a tinted disc when there is none. */
export function TokenIcon({ src, symbol, size = 36, className }: TokenIconProps) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.34) } as React.CSSProperties;
  if (src && !broken) return <img src={src} alt="" width={size} height={size} className={['yare-token', className].filter(Boolean).join(' ')} style={style} loading="lazy" draggable={false} onError={() => setBroken(true)} />;
  return <span className={['yare-token yare-token--letters', className].filter(Boolean).join(' ')} style={{ ...style, background: `oklch(0.92 0.06 ${hue(symbol)})`, color: `oklch(0.42 0.12 ${hue(symbol)})` }} aria-hidden="true">{symbol.slice(0, 3).toUpperCase()}</span>;
}

export interface AssetRowProps {
  icon?: ReactNode;
  name: string;
  symbol: string;
  /** Right side, top line: an amount, a value. */
  primary: ReactNode;
  /** Right side, second line, muted. */
  secondary?: ReactNode;
  onPress?: () => void;
  className?: string;
}

/** One line of a holdings list: logo, name and symbol on the left, two figures on the right. */
export function AssetRow({ icon, name, symbol, primary, secondary, onPress, className }: AssetRowProps) {
  const Tag = onPress ? 'button' : 'div';
  return (
    <Tag type={onPress ? 'button' : undefined} className={['yare-asset', className].filter(Boolean).join(' ')} onClick={onPress}>
      {icon ?? <TokenIcon symbol={symbol} />}
      <span className="yare-asset__text">
        <span className="yare-asset__name">{name}</span>
        <span className="yare-asset__symbol">{symbol}</span>
      </span>
      <span className="yare-asset__figures">
        <span className="yare-asset__primary">{primary}</span>
        {secondary && <span className="yare-asset__secondary">{secondary}</span>}
      </span>
    </Tag>
  );
}
