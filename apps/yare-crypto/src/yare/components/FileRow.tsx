import type { ReactNode } from 'react';
import { FileIcon, FileImageIcon, FilePdfIcon, FileTextIcon, FileVideoIcon, FileZipIcon, MusicNoteIcon } from '@phosphor-icons/react';

export function formatBytes(n: number): string {
  if (n >= 1073741824) return `${(n / 1073741824).toFixed(2)} GB`;
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/** An icon for a file, from its type or its name. */
export function FileKindIcon({ name, type, size = 24 }: { name: string; type?: string | null; size?: number }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const t = type ?? '';
  if (t.startsWith('image/')) return <FileImageIcon size={size} />;
  if (t.startsWith('video/')) return <FileVideoIcon size={size} />;
  if (t.startsWith('audio/')) return <MusicNoteIcon size={size} />;
  if (t === 'application/pdf' || ext === 'pdf') return <FilePdfIcon size={size} />;
  if (['zip', 'rar', '7z', 'gz', 'tar'].includes(ext) || t.includes('zip')) return <FileZipIcon size={size} />;
  if (t.startsWith('text/') || ['md', 'txt', 'csv', 'doc', 'docx'].includes(ext)) return <FileTextIcon size={size} />;
  return <FileIcon size={size} />;
}

export interface FileRowProps {
  name: string;
  size: number;
  type?: string | null;
  /** Right side: a download button, a delete button, a progress. */
  actions?: ReactNode;
  /** 0 to 1 while uploading. */
  progress?: number | null;
  className?: string;
}

/** One line of a file list: icon, name, size, and what you can do with it. */
export function FileRow({ name, size, type, actions, progress, className }: FileRowProps) {
  return (
    <div className={['yare-file', className].filter(Boolean).join(' ')}>
      <span className="yare-file__icon" aria-hidden="true"><FileKindIcon name={name} type={type} /></span>
      <span className="yare-file__text">
        <span className="yare-file__name" title={name}>{name}</span>
        <span className="yare-file__meta">{progress !== null && progress !== undefined && progress < 1 ? `Uploading… ${Math.round(progress * 100)}%` : formatBytes(size)}</span>
        {progress !== null && progress !== undefined && progress < 1 && <span className="yare-file__bar"><span style={{ width: `${progress * 100}%` }} /></span>}
      </span>
      {actions && <span className="yare-file__actions">{actions}</span>}
    </div>
  );
}
