#!/usr/bin/env node
/**
 * Applies this app's database migrations to your Supabase project, even when the project already
 * holds other Yare Monster apps.
 *
 *   npm run db:push                      project taken from .env (VITE_SUPABASE_URL)
 *   npm run db:push -- --project-ref abc  or named explicitly
 *
 * Why not plain `supabase db push`: the Supabase CLI keeps one migration history per project and
 * refuses to push from a folder that does not list every version the project already has. Each
 * Yare Monster app is a standalone folder, so this script applies only this app's files that the
 * project has not seen, in order, and records each one in the history so the CLI stays consistent.
 *
 * Needs the Supabase CLI signed in (`npx supabase login`). Migration files are idempotent, so a
 * file applied twice does no harm. Nothing here ever needs or stores a secret key.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const app = resolve(fileURLToPath(import.meta.url), '../..');
const args = process.argv.slice(2);
const refIdx = args.indexOf('--project-ref');
let projectRef = refIdx >= 0 ? args[refIdx + 1] : process.env.SUPABASE_PROJECT_REF;
if (!projectRef && existsSync(join(app, '.env'))) {
  const m = /^VITE_SUPABASE_URL=https:\/\/([a-z0-9-]+)\.supabase\.co/m.exec(readFileSync(join(app, '.env'), 'utf8'));
  projectRef = m?.[1];
}
if (!projectRef) { console.error('No project. Fill VITE_SUPABASE_URL in .env or pass --project-ref <ref>.'); process.exit(1); }

const dir = join(app, 'supabase/migrations');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^\d{14}_.+\.sql$/.test(f)).sort() : [];
if (files.length === 0) { console.log('This app has no database migrations.'); process.exit(0); }

function sb(cmdArgs, { quiet = false } = {}) {
  const r = spawnSync('npx', ['--yes', 'supabase', ...cmdArgs], { cwd: app, encoding: 'utf8', env: { ...process.env, CI: '1' } });
  if (!quiet && r.stderr) process.stderr.write(r.stderr.split('\n').filter((l) => !/new version|recommend updating/i.test(l)).join('\n'));
  return r;
}

// 1. Link this folder to the project. An empty password skips the prompt for a signed-in CLI.
const link = sb(['link', '--project-ref', projectRef, '--password', ''], { quiet: true });
if (link.status !== 0) {
  console.error(link.stderr || link.stdout);
  console.error('\nCould not link. Sign in first with `npx supabase login`, then run this again.');
  process.exit(1);
}

// 2. Which versions does the project already have?
const hist = sb(['db', 'query', 'select version from supabase_migrations.schema_migrations', '--linked'], { quiet: true });
if (hist.status !== 0) { console.error(hist.stderr || hist.stdout); process.exit(1); }
const applied = new Set([...(hist.stdout.matchAll(/"version":\s*"(\d+)"/g))].map((m) => m[1]));

// 3. Apply what is missing, oldest first, and record each one.
let count = 0;
for (const file of files) {
  const version = file.slice(0, 14);
  if (applied.has(version)) continue;
  process.stdout.write(`Applying ${file}... `);
  // The file flag, not the SQL as an argument: a file that starts with a comment would read as a flag.
  const run = sb(['db', 'query', '--file', join(dir, file), '--linked'], { quiet: true });
  if (run.status !== 0) { console.log('failed'); console.error(run.stderr || run.stdout); process.exit(1); }
  const name = file.slice(15, -4);
  const rec = sb(['migration', 'repair', version, '--status', 'applied', '--linked'], { quiet: true });
  if (rec.status !== 0) { console.log('applied, but not recorded'); console.error(rec.stderr || rec.stdout); process.exit(1); }
  console.log(`done (${name})`);
  count++;
}
console.log(count === 0 ? `Up to date: the project already has all ${files.length} migration${files.length === 1 ? '' : 's'} of this app.` : `Applied ${count} migration${count === 1 ? '' : 's'}.`);
