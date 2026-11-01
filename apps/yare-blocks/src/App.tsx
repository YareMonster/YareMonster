import { yareApp } from './yare';
import { HomePage } from './features/HomePage';

/** Yare Blocks has no database and no sign-in: it is a guide, served as static pages. */
const identitySlug = 'blocks' as const;
export const identity = yareApp(identitySlug);

export function App() {
  return <HomePage app={identity} slug={identitySlug} />;
}
