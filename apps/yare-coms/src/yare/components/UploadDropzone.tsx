import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Button } from '@heroui/react';
import { UploadSimpleIcon } from '@phosphor-icons/react';

export interface UploadDropzoneProps {
  /** Accepted types, as for an input: "application/pdf" or "image/png,image/jpeg". */
  accept: string;
  multiple?: boolean;
  /** Files over this size are refused with a message instead of handed over. */
  maxBytes?: number;
  onFiles: (files: File[]) => void;
  /** The line in the box, e.g. "Drop a PDF here". */
  title: string;
  /** Under the title: what is accepted and how big. */
  hint?: string;
  buttonLabel?: string;
  icon?: ReactNode;
  isDisabled?: boolean;
  className?: string;
}

function formatBytes(n: number) { return n >= 1048576 ? `${Math.round(n / 1048576)} MB` : `${Math.round(n / 1024)} KB`; }

/** A drop area with a button inside: drag files onto it or pick them. One component for every app that takes a file. */
export function UploadDropzone({ accept, multiple, maxBytes, onFiles, title, hint, buttonLabel = 'Choose file', icon, isDisabled, className }: UploadDropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const id = useId();

  function take(list: FileList | null) {
    if (!list) return;
    const accepted = accept.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const ok: File[] = [];
    for (const f of Array.from(list)) {
      const type = f.type.toLowerCase();
      const ext = `.${f.name.split('.').pop()?.toLowerCase() ?? ''}`;
      // "*/*" or "*" means any file. A browser may leave the type empty (zips often), so the extension counts too.
      const matches = accepted.length === 0 || accepted.includes('*/*') || accepted.includes('*')
        || accepted.some((a) => a === type || a === ext || (a.endsWith('/*') && type !== '' && type.startsWith(a.slice(0, -1))));
      if (!matches) { setProblem(`${f.name} is not a type this accepts.`); continue; }
      if (maxBytes && f.size > maxBytes) { setProblem(`${f.name} is over ${formatBytes(maxBytes)}.`); continue; }
      ok.push(f);
      if (!multiple) break;
    }
    if (ok.length) { setProblem(null); onFiles(ok); }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setOver(false);
    if (isDisabled) return;
    take(e.dataTransfer.files);
  }

  return (
    <div
      className={['yare-dropzone', className].filter(Boolean).join(' ')}
      data-over={over || undefined}
      data-disabled={isDisabled || undefined}
      onDragOver={(e) => { e.preventDefault(); if (!isDisabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <span className="yare-dropzone__icon" aria-hidden="true">{icon ?? <UploadSimpleIcon />}</span>
      <div className="yare-dropzone__text">
        <div className="yare-dropzone__title">{title}</div>
        {hint && <div className="yare-dropzone__hint">{hint}</div>}
        {problem && <div className="yare-dropzone__problem" role="alert">{problem}</div>}
      </div>
      <Button variant="outline" size="sm" isDisabled={isDisabled} onPress={() => input.current?.click()}>{buttonLabel}</Button>
      <input id={id} ref={input} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
