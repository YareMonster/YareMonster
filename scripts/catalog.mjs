#!/usr/bin/env node
/**
 * Writes catalog.json at the repository root: the machine-readable list of apps that tools such
 * as the Yare Monster MCP server read from GitHub. Source of truth is the folders themselves plus
 * the one-line descriptions in packages/ui/src/catalog.ts. Run after adding or changing an app.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const lines = Object.fromEntries([...readFileSync(join(root, 'packages/ui/src/catalog.ts'), 'utf8').matchAll(/^\s+(\w+): '([^']+)',$/gm)].map((m) => [m[1], m[2]]));
const ranges = { launcher: '20261018000xxx', forms: '20261018100xxx', sign: '20261018110xxx', contacts: '20261018120xxx', meet: '20261018130xxx', transfer: '20261018140xxx', bill: '20261018150xxx', book: '20261018160xxx', looks: '20261018170xxx', pages: '20261018180xxx', analytics: '20261018190xxx', canvas: '20261018210xxx', coms: '20261018220xxx', crypto: '20261018230xxx', dash: '20261018240xxx', fit: '20261018250xxx', flash: '20261018260xxx', lingo: '20261018280xxx', persona: '20261018290xxx', groups: '20261018300xxx', links: '20261018310xxx' };

const apps = readdirSync(join(root, 'apps')).filter((d) => d.startsWith('yare-')).sort().map((folder) => {
  const slug = folder.replace(/^yare-/, '');
  const pkg = JSON.parse(readFileSync(join(root, 'apps', folder, 'package.json'), 'utf8'));
  const readme = readFileSync(join(root, 'apps', folder, 'README.md'), 'utf8');
  const status = /\*\*Status:\*\*\s*(.+?)\.(?:\s|$)/.exec(readme)?.[1].trim() ?? '';
  const dev = /vite --port (\d+)/.exec(pkg.scripts?.dev ?? '')?.[1];
  const migrations = existsSync(join(root, 'apps', folder, 'supabase/migrations'));
  return {
    slug,
    name: slug === 'launcher' ? 'Yare Launcher' : `Yare ${slug[0].toUpperCase()}${slug.slice(1)}`,
    folder: `apps/${folder}`,
    description: slug === 'launcher' ? 'Set up the whole collection on your own accounts and keep track of it.' : lines[slug] ?? '',
    status,
    // 'app' has features people can use; 'shell' runs but has no features yet.
    stage: /^Not started/i.test(status) ? 'shell' : 'app',
    version: pkg.version,
    needsDatabase: migrations,
    migrationRange: migrations ? ranges[slug] : null,
    devPort: dev ? Number(dev) : null,
    readme: `apps/${folder}/README.md`,
    deployment: `apps/${folder}/DEPLOYMENT.md`,
    // Agent skills: self-contained instructions an assistant loads on demand (SKILL.md files).
    skills: existsSync(join(root, 'apps', folder, 'skills')) ? Object.fromEntries(readdirSync(join(root, 'apps', folder, 'skills')).sort().map((k) => [k, `apps/${folder}/skills/${k}/SKILL.md`])) : {},
  };
});

const catalog = {
  project: 'Yare Monster',
  url: 'https://yare.monster',
  repository: 'https://github.com/YareMonster/YareMonster',
  licence: 'Yare Monster Community License 1.0 (LICENSE)',
  requires: ['Your own Supabase project', 'Your own Cloudflare account', 'Optionally, your own domain'],
  accountAccess: "Only emails on the deployment's allow list may create an account: select public.yare_allow_email('you@domain.com')",
  install: {
    singleApp: ['git clone <repository>', 'cd <folder>', 'npm install', 'copy .env.example to .env and fill the two public Supabase values', 'npx supabase login && npm run db:push', "npx supabase db query \"select public.yare_allow_email('<email>')\" --linked", 'npm run build && npx wrangler deploy'],
    severalApps: ['same, but push every database once from the repository root: node scripts/db-push.mjs --project-ref <ref> [slugs...]'],
  },
  apps,
};
writeFileSync(join(root, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
console.log(`catalog.json: ${apps.length} apps`);
