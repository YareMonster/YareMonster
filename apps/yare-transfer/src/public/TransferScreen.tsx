import { useState } from 'react';
import { DownloadSimpleIcon, LockSimpleIcon } from '@phosphor-icons/react';
import { FileKindIcon, PoweredByYare, formatBytes, publicThemeById, publicThemeStyle } from '../yare';
import '../yare/public-page.css';
import './transfer.css';

export interface ScreenFile { id: string; name: string; size_bytes: number; content_type: string }
export interface ScreenData {
  title: string; body: string; theme: string; buttonLabel: string;
  logoUrl: string | null; imageUrl: string | null;
  expiresAt: string | null; open: boolean; needsPassword: boolean;
  files: ScreenFile[];
}

interface Props {
  data: ScreenData;
  /** The owner looking at a draft. Nothing is counted. */
  preview?: boolean;
  /** The password the recipient typed and the function accepted, or null. */
  unlocked?: boolean;
  onUnlock?: (password: string) => Promise<boolean>;
  onDownload?: (file: ScreenFile) => Promise<void>;
  onDownloadAll?: () => Promise<void>;
  busyId?: string | null;
}

const left = (iso: string | null) => {
  if (!iso) return '';
  const h = Math.round((new Date(iso).getTime() - Date.now()) / 3600000);
  if (h <= 0) return 'Expired';
  if (h < 48) return `Available for ${h} more hour${h === 1 ? '' : 's'}`;
  return `Available for ${Math.round(h / 24)} more days`;
};

/** The recipient's page, and the owner's preview of it: like the first screen of a form, with the files instead of a question. */
export function TransferScreen({ data, preview, unlocked, onUnlock, onDownload, onDownloadAll, busyId }: Props) {
  const theme = publicThemeById(data.theme);
  const [password, setPassword] = useState('');
  const [wrong, setWrong] = useState(false);
  const [checking, setChecking] = useState(false);
  const locked = data.needsPassword && !unlocked && !preview;
  const total = data.files.reduce((n, f) => n + f.size_bytes, 0);

  async function unlock() {
    if (!onUnlock || !password) return;
    setChecking(true);
    try { const ok = await onUnlock(password); setWrong(!ok); } finally { setChecking(false); }
  }

  return (
    <div className="yp" data-dark={theme.dark || undefined} style={publicThemeStyle(theme) as React.CSSProperties}>
      {preview && <div className="yp__preview" role="status">Preview. Nothing is counted. {!data.open && 'Publish to share the link.'}</div>}
      {data.logoUrl && <div className="yp__logo"><img src={data.logoUrl} alt="" /></div>}
      <main className="yp__main">
        <div className="yp__screen yt">
          {data.imageUrl && <img className="yp__image yt__image" src={data.imageUrl} alt="" />}
          <h1 className="yp__title">{data.title}</h1>
          {data.body && <p className="yp__desc yt__body">{data.body}</p>}
          {!data.open && !preview ? (
            <p className="yp__hint">This transfer has expired. The files are no longer available.</p>
          ) : locked ? (
            <form className="yt__lock" onSubmit={(e) => { e.preventDefault(); void unlock(); }}>
              <label className="yp__hint" htmlFor="yt-password"><LockSimpleIcon /> This transfer has a password.</label>
              <input id="yt-password" className="yp__field" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setWrong(false); }} placeholder="Password" autoComplete="off" />
              {wrong && <p className="yp__error">That is not the password.</p>}
              <div className="yp__actions"><button type="submit" className="yp__btn" disabled={!password || checking}>Open</button></div>
            </form>
          ) : (
            <>
              <ul className="yt__files">
                {data.files.map((f) => (
                  <li key={f.id} className="yt__file">
                    <span className="yt__file-icon"><FileKindIcon name={f.name} type={f.content_type} size={22} /></span>
                    <span className="yt__file-text"><span className="yt__file-name">{f.name}</span><span className="yt__file-size">{formatBytes(f.size_bytes)}</span></span>
                    <button type="button" className="yp__btn yp__btn--ghost yt__file-btn" onClick={() => void onDownload?.(f)} disabled={preview || busyId === f.id} aria-label={`Download ${f.name}`}><DownloadSimpleIcon /></button>
                  </li>
                ))}
              </ul>
              <div className="yp__actions">
                <button type="button" className="yp__btn" onClick={() => void (data.files.length === 1 && data.files[0] ? onDownload?.(data.files[0]) : onDownloadAll?.())} disabled={preview || busyId === 'all' || data.files.length === 0}>
                  <DownloadSimpleIcon weight="bold" /> {data.buttonLabel || 'Download'}{data.files.length > 1 ? ` all (${formatBytes(total)})` : ''}
                </button>
                {data.expiresAt && <span className="yp__hint">{left(data.expiresAt)}</span>}
              </div>
            </>
          )}
        </div>
      </main>
      <PoweredByYare />
    </div>
  );
}
