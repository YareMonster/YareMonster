#!/usr/bin/env node
/**
 * Pushes the database migrations of every app (or the ones you name) to one Supabase project.
 *
 *   node scripts/db-push.mjs --project-ref <ref>              all apps with a database
 *   node scripts/db-push.mjs --project-ref <ref> forms sign   only those apps
 *
 * Why this exists: the Supabase CLI keeps a single migration history per project. When several
 * Yare Monster apps share a project, pushing from one app's folder sees the other apps' versions in the
 * history and refuses. This script gathers every app's migration files into one temporary CLI
 * project under .yare-db/ (git-ignored) and pushes from there, so the history always matches.
 * Each app owns its own version range, so files never collide.
 *
 * Installing a single app into its own project? `npm run db:push` inside that app is enough.
 *
 * Needs the Supabase CLI (`npx supabase login` first). It may ask for the database password.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const args = process.argv.slice(2);
const refIdx = args.indexOf('--project-ref');
const projectRef = refIdx >= 0 ? args[refIdx + 1] : process.env.SUPABASE_PROJECT_REF;
const wanted = args.filter((a, i) => !a.startsWith('--') && i !== refIdx + 1);
if (!projectRef) { console.error('usage: node scripts/db-push.mjs --project-ref <ref> [app …]'); process.exit(1); }

const apps = readdirSync(join(root, 'apps'))
  .filter((d) => existsSync(join(root, 'apps', d, 'supabase/migrations')))
  .filter((d) => wanted.length === 0 || wanted.includes(d) || wanted.includes(d.replace(/^yare-/, '')));

const work = join(root, '.yare-db');
rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, 'supabase/migrations'), { recursive: true });
writeFileSync(join(work, 'supabase/config.toml'), 'project_id = "yare-monster"\n');
let count = 0;
for (const app of apps) {
  const dir = join(root, 'apps', app, 'supabase/migrations');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql'))) { cpSync(join(dir, f), join(work, 'supabase/migrations', f)); count++; }
}
console.log(`${count} migration files from ${apps.length} app${apps.length === 1 ? '' : 's'}: ${apps.join(', ')}`);

function run(cmd) {
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: work, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
run(['npx', '--yes', 'supabase', 'link', '--project-ref', projectRef]);
// --include-all: apps own separate version ranges, so a new file for one app may sort before another app's latest.
run(['npx', '--yes', 'supabase', 'db', 'push', '--linked', '--include-all', ...(args.includes('--yes') ? ['--yes'] : [])]);
rmSync(work, { recursive: true, force: true });
