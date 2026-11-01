import { YARE } from '../brand';
import { YareMark } from './YareLogo';

/**
 * The credit every public-facing Yare Monster page shows: a published form, a booking page, a shared file.
 * Required by the licence (section 6). It reads "Pwrd by Yare Monster" on screen, with the full
 * words for assistive technology. It names where the app comes from; it does not mean Yare Monster
 * operates or can see the deployment, so it never carries the operator's data.
 */
export function PoweredByYare({ className }: { className?: string }) {
  return (
    <footer className={['yare-powered', className].filter(Boolean).join(' ')}>
      <a className="yare-powered__link" href={YARE.url} target="_blank" rel="noopener noreferrer" aria-label="Powered by Yare Monster">
        <YareMark size={18} />
        <span aria-hidden="true">Pwrd by Yare Monster</span>
      </a>
    </footer>
  );
}
