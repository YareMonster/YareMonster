import { ImageBrokenIcon } from '@phosphor-icons/react';

export interface NftTileProps {
  image?: string | null;
  name: string;
  collection?: string;
  href?: string;
  className?: string;
}

/** A square picture with its name under it, for anything collected: an NFT, a photo, a design. */
export function NftTile({ image, name, collection, href, className }: NftTileProps) {
  const body = (
    <>
      <span className="yare-tile__image">
        {image ? <img src={image} alt="" loading="lazy" draggable={false} /> : <ImageBrokenIcon />}
      </span>
      <span className="yare-tile__name" title={name}>{name}</span>
      {collection && <span className="yare-tile__sub" title={collection}>{collection}</span>}
    </>
  );
  const cls = ['yare-tile', className].filter(Boolean).join(' ');
  return href ? <a className={cls} href={href} target="_blank" rel="noopener noreferrer">{body}</a> : <div className={cls}>{body}</div>;
}
