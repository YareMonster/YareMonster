#!/usr/bin/env node
/**
 * Scaffolds a Yare Monster app folder with everything an app needs to run on its own: Vite + React +
 * HeroUI configuration, the shared design system (copied by sync-ui), sign-in against the
 * operator's Supabase project, the allow-list migrations, Cloudflare configuration, and
 * documentation drafts. It does not invent features: the page says what is not built yet.
 *
 *   node scripts/new-app.mjs <slug> [--no-db]
 *
 * --no-db leaves out Supabase and sign-in (for a static guide such as Yare Pages).
 * Existing files are never overwritten.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const [slug, ...flags] = process.argv.slice(2);
const noDb = flags.includes('--no-db');
const names = { forms: 'Yare Forms', sign: 'Yare Sign', pages: 'Yare Pages', contacts: 'Yare Contacts', meet: 'Yare Meet', transfer: 'Yare Transfer', bill: 'Yare Bill', book: 'Yare Book', looks: 'Yare Looks', analytics: 'Yare Analytics', blocks: 'Yare Blocks', canvas: 'Yare Canvas', coms: 'Yare Coms', crypto: 'Yare Crypto', dash: 'Yare Dash', fit: 'Yare Fit', flash: 'Yare Flash', fonts: 'Yare Fonts', lingo: 'Yare Lingo', persona: 'Yare Persona', groups: 'Yare Groups', links: 'Yare Links' };
if (!slug || !names[slug]) { console.error(`usage: node scripts/new-app.mjs <${Object.keys(names).join('|')}> [--no-db]`); process.exit(1); }

const name = names[slug];
const prefix = `yare${slug}_`;
const port = 4600 + Object.keys(names).indexOf(slug) + 1;
const dir = join(root, 'apps', `yare-${slug}`);
const today = '18 October 2026';
// Every app owns a version range so several apps can share one Supabase project: the CLI keeps a
// single migration history per project. Launcher uses 20261018000xxx; the apps use 2026101810xxxx and up.
const slots = { forms: '10', sign: '11', pages: '18', contacts: '12', meet: '13', transfer: '14', bill: '15', book: '16', looks: '17', analytics: '19', blocks: '20', canvas: '21', coms: '22', crypto: '23', dash: '24', fit: '25', flash: '26', fonts: '27', lingo: '28', persona: '29', groups: '30', links: '31' };
const stamp = `20261018${slots[slug]}0001`;

const files = {};

files['package.json'] = JSON.stringify({
  name: `yare-${slug}`,
  version: '0.0.1',
  private: true,
  description: `${name}: part of Yare Monster. Scope not yet defined; this folder holds the runnable shell.`,
  license: 'SEE LICENSE IN LICENSE',
  type: 'module',
  engines: { node: '>=20' },
  scripts: {
    dev: `vite --port ${port}`,
    build: 'tsc -b && vite build',
    preview: `vite preview --port ${port + 100}`,
    check: 'tsc -b',
    deploy: 'npm run build && wrangler deploy',
    ...(noDb ? {} : { 'db:link': 'supabase link', 'db:push': 'node scripts/db-push.mjs' }),
  },
  dependencies: {
    '@fontsource-variable/inter': '^5.3.0',
    '@fontsource-variable/nunito': '^5.3.0',
    '@heroui/react': '^3.2.6',
    '@heroui/styles': '^3.2.6',
    '@phosphor-icons/react': '^2.1.10',
    ...(noDb ? {} : { '@supabase/supabase-js': '^2.118.0' }),
    react: '^19.2.0',
    'react-dom': '^19.2.0',
  },
  devDependencies: {
    '@tailwindcss/vite': '^4.1.0',
    '@types/node': '^24.0.0',
    '@types/react': '^19.2.0',
    '@types/react-dom': '^19.2.0',
    '@vitejs/plugin-react': '^6.1.0',
    ...(noDb ? {} : { supabase: '^2.0.0' }),
    tailwindcss: '^4.1.0',
    typescript: '^5.9.0',
    vite: '^8.0.0',
    wrangler: '^4.0.0',
  },
}, null, 2) + '\n';

files['index.html'] = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="robots" content="noindex, nofollow" />
    <link rel="icon" href="/yare/favicon/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/yare/favicon/favicon-32.png" sizes="32x32" type="image/png" />
    <link rel="apple-touch-icon" href="/yare/favicon/apple-touch-icon.png" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

files['vite.config.ts'] = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
`;

files['tsconfig.json'] = `{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
`;
files['tsconfig.app.json'] = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
`;
files['tsconfig.node.json'] = `{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
`;

files['wrangler.jsonc'] = `{
  // Cloudflare Workers, static assets only: \`npm run build\` then \`npx wrangler deploy\`.
  // Or connect the repository in the Cloudflare dashboard with root directory \`apps/yare-${slug}\`,
  // build command \`npm run build\` and deploy command \`npx wrangler deploy\`. See DEPLOYMENT.md.
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "yare-${slug}",
  "compatibility_date": "2026-10-01",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  },
  // Lets Cloudflare build a preview of a branch before it merges (\`wrangler preview\`).
  "previews": {}
}
`;

files['public/_headers'] = `# Response headers for Cloudflare static assets.
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`;

if (!noDb) {
  files['.env.example'] = `# ${name}: environment variables
# Copy to .env for local development. Set the same names as build variables in Cloudflare.
# Both values are PUBLIC: they are compiled into the browser bundle. Never put a service-role
# key or a database password in a VITE_ variable.

# Supabase > Project Settings > Data API > Project URL
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co

# Supabase > Project Settings > API Keys > Publishable key (starts with sb_publishable_).
# Legacy projects may still show an "anon" JWT key; that works too.
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
`;
  files['supabase/config.toml'] = `# Supabase CLI configuration for ${name}.
# Only the project id is needed to link this folder to your own project and push its migrations:
#   npx supabase link --project-ref <your-project-ref>
#   npx supabase db push --linked
project_id = "yare-${slug}"
`;
  files[`supabase/migrations/${stamp}_${prefix}owner.sql`] = `-- ${name} · migration ${stamp} · one owner per deployment
--
-- Yare Monster apps are built for a single operator. The app shows "Create your account" on first run;
-- this trigger makes that safe: the first account to register becomes the owner, and
-- registration closes behind it. Every Yare Monster app ships this rule under its own prefix so it is in
-- place whichever app is installed first. Idempotent; harmless when several apps share a project.
--
-- To allow a second account later, drop the trigger:
--   drop trigger if exists ${prefix}single_owner on auth.users;

create or replace function public.${prefix}enforce_single_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users where id <> new.id) then
    raise exception 'Registration is closed. This Yare Monster deployment already has its owner.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists ${prefix}single_owner on auth.users;
create trigger ${prefix}single_owner
  before insert on auth.users
  for each row execute function public.${prefix}enforce_single_owner();
`;
  files[`supabase/migrations/${stamp.slice(0, -1)}2_${prefix}access.sql`] = `-- ${name} · migration ${stamp.slice(0, -1)}2 · who may create an account
--
-- Before anyone can create an account in this deployment, their email has to be on the allow list.
-- Whoever sets the deployment up adds it, usually by asking their assistant:
--
--   insert into public.yare_allowed_emails (email) values ('you@domain.com') on conflict do nothing;
--
-- The list is shared by every Yare Monster app in this project (hence the yare_ prefix instead of
-- the app's own), so one entry opens every app the operator installs. Each app installs the same
-- rule under its own name; several copies of the rule are harmless. This replaces the earlier
-- "first account wins" rule.

create table if not exists public.yare_allowed_emails (
  email     text primary key check (email = lower(email) and email ~ '^[^@\\s]+@[^@\\s]+$'),
  note      text,
  added_at  timestamptz not null default now()
);
comment on table public.yare_allowed_emails is 'Yare Monster: emails allowed to create an account in this deployment. Shared by every Yare Monster app.';

alter table public.yare_allowed_emails enable row level security;
revoke all on public.yare_allowed_emails from anon;
grant select on public.yare_allowed_emails to authenticated;
drop policy if exists "yare_allowed_emails: signed-in users read" on public.yare_allowed_emails;
create policy "yare_allowed_emails: signed-in users read" on public.yare_allowed_emails
  for select to authenticated using (true);

-- Convenience for setup scripts: select public.yare_allow_email('you@domain.com');
create or replace function public.yare_allow_email(p_email text)
returns void language sql security definer set search_path = '' as $$
  insert into public.yare_allowed_emails (email) values (lower(trim(p_email))) on conflict do nothing;
$$;
revoke all on function public.yare_allow_email(text) from public;

create or replace function public.${prefix}enforce_allowed_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.yare_allowed_emails a where a.email = lower(new.email)) then
    raise exception 'This email is not on the list for this deployment. Ask whoever set it up to add it.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists ${prefix}single_owner on auth.users;
drop trigger if exists ${prefix}allowed_email on auth.users;
create trigger ${prefix}allowed_email
  before insert on auth.users
  for each row execute function public.${prefix}enforce_allowed_email();
`;

  files['src/lib/env.ts'] = `/**
 * Public configuration, read at build time from VITE_* variables (see .env.example).
 * Missing values are reported on screen instead of crashing.
 */
export interface PublicEnv {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

export function readEnv(): { ok: true; env: PublicEnv } | { ok: false; missing: string[] } {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const missing: string[] = [];
  if (!supabaseUrl || supabaseUrl.includes('YOUR-PROJECT-REF')) missing.push('VITE_SUPABASE_URL');
  if (!supabasePublishableKey || supabasePublishableKey.includes('REPLACE_ME')) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (missing.length) return { ok: false, missing };
  return { ok: true, env: { supabaseUrl: supabaseUrl!, supabasePublishableKey: supabasePublishableKey! } };
}
`;
  files['src/lib/supabase.ts'] = `import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PublicEnv } from './env';

/**
 * Table types for ${name}. Empty until the app's schema exists; add tables here as migrations
 * create them, prefixed ${prefix} (see docs/SUPABASE.md at the repository root).
 */
export type Database = {
  public: {
    Tables: { [_ in never]: never };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Client = SupabaseClient<Database>;

export function createSupabase(env: PublicEnv): Client {
  // The publishable key only grants what row-level security allows.
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
}
`;
  files['src/features/ConfigMissing.tsx'] = `import { Card } from '@heroui/react';
import { Notice, YareMark } from '../yare';

/** Shown instead of the app when a VITE_ variable is absent or still a placeholder. */
export function ConfigMissing({ missing }: { missing: string[] }) {
  return (
    <div className="yare-signin">
      <Card className="yare-signin__card">
        <YareMark size={48} />
        <h1 className="text-2xl">Almost there</h1>
        <p className="text-sm text-muted">
          This deployment is missing configuration. Set the variables below in your environment and rebuild. The README explains where each value comes from.
        </p>
        <Notice status="warning" title="Missing configuration">
          <ul className="list-disc ps-4">
            {missing.map((m) => <li key={m}><code>{m}</code></li>)}
          </ul>
        </Notice>
      </Card>
    </div>
  );
}
`;
}

files['src/main.tsx'] = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './yare/theme.css';
import { YareProvider } from './yare';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <YareProvider>
      <App />
    </YareProvider>
  </StrictMode>,
);
`;

files['src/features/HomePage.tsx'] = `import { useState } from 'react';
import { Button } from '@heroui/react';
import { ArrowSquareOutIcon, HouseIcon, PlugsConnectedIcon } from '@phosphor-icons/react';
import { AppShell, ConnectionsPanel, PageHeader, SetupGuideButton, YareMark, catalog, type AppIdentity } from '../yare';

interface Props {
  app: AppIdentity;
  /** This app's entry in the catalogue, for the setup guide. */
  slug: (typeof catalog)[number]['slug'];
  user?: { name: string; detail?: string };
  onSignOut?: () => void;
  /** The Supabase project this app runs on, from its configuration. Undefined for an app without a database. */
  supabase?: { url: string; publishableKey: string };
}

type Page = 'home' | 'connections';

/** The shell with the shared Connections page and an empty home. Replace the home when the app's scope is defined. */
export function HomePage({ app, slug, user, onSignOut, supabase }: Props) {
  const [page, setPage] = useState<Page>('home');
  const short = app.name.replace('Yare ', '');
  const entry = catalog.filter((c) => c.slug === slug);
  const guide = (
    <SetupGuideButton apps={entry} repoUrl={null} supabaseUrl={supabase?.url} supabasePublishableKey={supabase?.publishableKey} email={user?.detail} />
  );
  return (
    <AppShell
      app={app}
      nav={[{
        id: 'main', items: [
          { id: 'home', label: 'Home', icon: <HouseIcon />, isActive: page === 'home', onPress: () => setPage('home') },
          { id: 'connections', label: 'Connections', icon: <PlugsConnectedIcon />, isActive: page === 'connections', onPress: () => setPage('connections') },
        ],
      }]}
      user={user}
      onSignOut={onSignOut}
      onSettings={() => setPage('connections')}
      topbar={<PageHeader crumbs={[{ label: short }, { label: page === 'home' ? 'Home' : 'Connections' }]} actions={page === 'connections' ? guide : undefined} />}
    >
      {page === 'connections' ? (
        <ConnectionsPanel
          appLabel={app.name}
          supabase={supabase ? { url: supabase.url, publishableKey: supabase.publishableKey, isDefault: true } : undefined}
          repoUrl={null}
        />
      ) : (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
          <YareMark size={72} />
          <h2 className="text-2xl">Nothing built here yet</h2>
          <p className="text-sm text-muted">
            {app.name} is scaffolded but its features are still being defined. This folder already carries the shared design system${noDb ? '' : ', sign-in'} and deployment setup it will use.
          </p>
          {app.docsUrl && (
            <Button variant="outline" onPress={() => window.open(app.docsUrl, '_blank', 'noopener,noreferrer')}>
              Read the plan <ArrowSquareOutIcon />
            </Button>
          )}
        </div>
      )}
    </AppShell>
  );
}
`;

files['src/App.tsx'] = noDb
  ? `import { yareApp } from './yare';
import { HomePage } from './features/HomePage';

/** ${name} has no database and no sign-in: it is a guide, served as static pages. */
const identitySlug = '${slug}' as const;
export const identity = yareApp(identitySlug);

export function App() {
  return <HomePage app={identity} slug={identitySlug} />;
}
`
  : `import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Spinner } from '@heroui/react';
import { SignIn, yareApp } from './yare';
import { readEnv } from './lib/env';
import { createSupabase } from './lib/supabase';
import { ConfigMissing } from './features/ConfigMissing';
import { HomePage } from './features/HomePage';

const identitySlug = '${slug}' as const;
export const identity = yareApp(identitySlug);

export function App() {
  const config = useMemo(readEnv, []);
  if (!config.ok) return <ConfigMissing missing={config.missing} />;
  return <Authenticated supabaseUrl={config.env.supabaseUrl} supabasePublishableKey={config.env.supabasePublishableKey} />;
}

function Authenticated(env: { supabaseUrl: string; supabasePublishableKey: string }) {
  const db = useMemo(() => createSupabase(env), [env.supabaseUrl, env.supabasePublishableKey]);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = db.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, [db]);

  if (session === undefined) {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true">
        <Spinner aria-label="Loading" />
      </div>
    );
  }

  if (!session) {
    return (
      <SignIn
        app={identity}
        onSignIn={async ({ email, password }) => {
          const { error } = await db.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }}
        onCreateAccount={async ({ email, password }) => {
          // The database accepts only emails on the deployment's allow list.
          const { data, error } = await db.auth.signUp({ email, password });
          if (error) throw error;
          if (data.session) return;
          return \`We sent a confirmation link to \${email}. Open it, then sign in.\`;
        }}
      />
    );
  }

  const email = session.user.email ?? 'Signed in';
  const user = { name: (session.user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0] ?? 'You', detail: email };
  return <HomePage app={identity} slug={identitySlug} user={user} onSignOut={() => db.auth.signOut()} supabase={{ url: env.supabaseUrl, publishableKey: env.supabasePublishableKey }} />;
}
`;

const dbNote = noDb
  ? `${name} is planned as a guided learning project, not an application with a database. It will help people use an AI assistant, GitHub, Astro and Cloudflare to build and deploy their own website and connect a domain. This folder holds the shell it will be presented in. There is no Supabase setup and no sign-in.`
  : `Sign-in and first-run account creation work against your own Supabase project. Nothing else is built: the home page says so.`;

files['README.md'] = `# ${name}

**Status:** Not started. The folder is scaffolded with the shared Yare Monster design system, ${noDb ? 'the app shell' : 'sign-in'} and the deployment setup every Yare Monster app uses. Its features are not defined yet; nothing on this page describes functionality that exists.

Part of [Yare Monster](https://yare.monster), created by Orlando Pedro.
Free to self-host for personal use and for your own business under the
[Yare Monster Community License](LICENSE). This folder is self-contained: copy it, follow
[DEPLOYMENT.md](DEPLOYMENT.md), and it runs on your own accounts.

## What exists today

${dbNote}

## Install it with your AI assistant

Hand this folder to your assistant and say:

> Make the \`apps/yare-${slug}\` folder the root of my project. Follow its DEPLOYMENT.md. I will give you
> my Supabase project URL, publishable key${noDb ? '' : ' and, for the migrations, my database password'}, and I
> will sign in to Cloudflare myself when you ask.

The assistant needs nothing from Yare Monster. Everything it needs is in this folder; the guide
says where each value comes from.

## Run it locally

\`\`\`sh
# in this folder
${noDb ? '' : 'cp .env.example .env     # then fill in the two values (see DEPLOYMENT.md, step 4)\n'}npm install
npm run dev              # http://localhost:${port}
\`\`\`

## Where things are

\`\`\`
src/App.tsx               ${noDb ? 'renders the shell' : 'configuration check, session, sign-in or the home page'}
src/features/HomePage.tsx the shell with the empty state
src/yare/                 the shared Yare Monster design system (generated copy; see docs/DESIGN.md at the repo root)
public/yare/              shared logos and marks (generated copy)
${noDb ? '' : `supabase/migrations/      ${stamp}_${prefix}owner.sql (one owner per deployment)
.env.example              both environment variables, explained
`}wrangler.jsonc            Cloudflare configuration
\`\`\`

## What changed

- **v0.0.1** (${today}): scaffold only.

## Credit

${name} is part of Yare Monster, created by Orlando Pedro. See [ATTRIBUTION.md](../../ATTRIBUTION.md)
in the repository (or the Help menu inside the app). Dependencies keep their own licences.
`;

files['DEPLOYMENT.md'] = noDb
  ? `# Deploying ${name}

${name} is static: no database, no sign-in. This is the generic deployment for the scaffold; it
will be rewritten when the guide itself exists.

## On your computer

\`\`\`sh
cd apps/yare-${slug}
npm install
npm run dev            # http://localhost:${port}
npm run build          # writes dist/
npx wrangler deploy    # signs you in to Cloudflare the first time
\`\`\`

## From GitHub

Cloudflare dashboard → Workers & Pages → Create → Import a repository. Root directory
\`apps/yare-${slug}\`, build command \`npm run build\`, deploy command \`npx wrangler deploy\`.

## Your domain

Worker → Settings → Domains & Routes → Add → Custom domain. Cloudflare issues the certificate.

## Check

The address loads over HTTPS and shows the ${name} shell. Help → About ${name} opens the credit.
`
  : `# Deploying ${name}

From nothing to ${name} running at your own address, in about 20 minutes. Follow it yourself or
hand it to an AI assistant. You sign in to Supabase and Cloudflare yourself when asked; nothing
here needs a credential sent to anyone.

Commands marked **on your computer** run in a terminal inside this folder (\`apps/yare-${slug}\`).

## 1. Accounts

- A [Supabase](https://supabase.com) account and a project. Reuse the project you use for other
  Yare Monster apps if you have one: this app's tables are prefixed \`${prefix}\`.
- A [Cloudflare](https://cloudflare.com) account.
- Optional: a domain whose DNS you control.

## 2. Get the code

**On your computer**: clone the repository and work in this folder, or copy just this folder.

\`\`\`sh
git clone https://github.com/YareMonster/YareMonster.git
cd yare/apps/yare-${slug}
npm install
\`\`\`

## 3. Database

**On your computer**, sign in to Supabase once, then let the app push its own migrations. The
script reads your project from \`.env\` (step 4, so do that first), applies only the files your
project has not seen, and works whether the project is empty or already holds other Yare Monster
apps.

\`\`\`sh
npx supabase login
npm run db:push
\`\`\`

Without the CLI: open each file in \`supabase/migrations/\` in order, paste it into Supabase → SQL
Editor, run it. The files are safe to run twice.

## 4. Environment variables

**On your computer**, copy \`.env.example\` to \`.env\` and fill in:

| Variable | Public or secret | Where to find it |
| --- | --- | --- |
| \`VITE_SUPABASE_URL\` | Public | Supabase → Project Settings → Data API → Project URL |
| \`VITE_SUPABASE_PUBLISHABLE_KEY\` | Public | Supabase → Project Settings → API Keys → Publishable key |

Both end up in the browser bundle. Never put a secret or service-role key in a \`VITE_\` variable.

## 5. Allow your email, then create your account

Only emails on the deployment's allow list may create an account. **On your computer** (or ask
your assistant), add yours:

\`\`\`sh
npx supabase db query "select public.yare_allow_email('you@domain.com')" --linked
\`\`\`

Without the CLI: Supabase → SQL Editor → \`select public.yare_allow_email('you@domain.com');\`.
The list is shared by every Yare Monster app in the project, so one entry opens all of them.

Then:

\`\`\`sh
npm run dev            # http://localhost:${port}
\`\`\`

The sign-in screen offers **Create your account**; use the email you allowed. If your Supabase
project requires email confirmation (the default), confirm the email it sends, then sign in.

## 6. Deploy to Cloudflare

**Option A, on your computer:** \`npm run build\` then \`npx wrangler deploy\`.

**Option B, from GitHub:** Cloudflare dashboard → Workers & Pages → Create → Import a repository.
Root directory \`apps/yare-${slug}\`, build command \`npm run build\`, deploy command
\`npx wrangler deploy\`, build variables \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_PUBLISHABLE_KEY\`.

## 7. Your domain (optional)

Worker → Settings → Domains & Routes → Add → Custom domain. If the domain's DNS is on Cloudflare,
that is all; otherwise create the CNAME it shows you.

## 8. Check

1. The address loads over HTTPS and shows the ${name} sign-in with its lockup.
2. Your account signs in. A private window, signed out, shows the sign-in screen only.
3. "Create your account" with an email that is not on the list is refused.
4. Help → About ${name} opens the credit dialog.

## Updating, backups, troubleshooting

See the launcher's guide for the shared procedures; this app has no data of its own yet.
`;

let written = 0;
for (const [rel, content] of Object.entries(files)) {
  const path = join(dir, rel);
  if (existsSync(path)) { console.log(`kept ${rel}`); continue; }
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content);
  written++;
}
console.log(`${name}: ${written} files written to apps/yare-${slug}. Now run: npm run sync-ui`);
