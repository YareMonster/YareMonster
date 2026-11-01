#!/usr/bin/env node
/**
 * Copies the shared design system into every app.
 *
 *   packages/ui/src     -> apps/yare-<app>/src/yare
 *   packages/ui/charts  -> apps/yare-<app>/src/yare-charts   (only apps that depend on recharts)
 *   packages/ui/assets  -> apps/yare-<app>/public/yare
 *   LICENSE             -> apps/yare-<app>/LICENSE
 *
 * Why copy instead of a workspace package: an app folder must run on its own when someone copies
 * only that folder. The vendored copy is generated; edit packages/ui and run `npm run sync-ui`.
 *
 *   node scripts/sync-ui.mjs           write the copies
 *   node scripts/sync-ui.mjs --check   exit 1 if any copy or dependency is out of date
 *
 * Also checks that each app's package.json declares every peer dependency packages/ui needs.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const check = process.argv.includes('--check');
const uiSrc = join(root, 'packages/ui/src');
const uiAssets = join(root, 'packages/ui/assets');
const licence = join(root, 'LICENSE');
const uiPkg = JSON.parse(readFileSync(join(root, 'packages/ui/package.json'), 'utf8'));
const required = Object.keys(uiPkg.peerDependencies ?? {});

const GENERATED_NOTE = `# Generated folder

This is a generated copy from \`packages/ui\` in the Yare Monster repository, placed here so this app
runs on its own. Do not edit it in place: change \`packages/ui\` and run \`npm run sync-ui\` at the
repository root. If you only have this app folder, treat it as part of the app and edit freely.
`;

function listFiles(dir, base = dir) {
  if (!existsSync(dir)) return new Map();
  const out = new Map();
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) for (const [k, v] of listFiles(p, base)) out.set(k, v);
    else out.set(relative(base, p), readFileSync(p));
  }
  return out;
}

function same(a, b) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) { const w = b.get(k); if (!w || !v.equals(w)) return false; }
  return true;
}

const apps = readdirSync(join(root, 'apps')).filter((d) => existsSync(join(root, 'apps', d, 'package.json')));
let failed = false;

for (const app of apps) {
  const appDir = join(root, 'apps', app);
  const pkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8'));
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };
  const targets = [
    [uiSrc, join(appDir, 'src/yare'), { note: true }],
    // Charts need recharts, which only dashboards carry; the folder exists only where it is used.
    ...(declared.recharts ? [[join(root, 'packages/ui/charts'), join(appDir, 'src/yare-charts'), { note: true }]] : []),
    [uiAssets, join(appDir, 'public/yare'), {}],
    [join(root, 'packages/ui/tools'), join(appDir, 'scripts'), {}],
  ];
  for (const [from, to, opts] of targets) {
    const want = listFiles(from);
    if (opts.note) want.set('README.md', Buffer.from(GENERATED_NOTE));
    const have = listFiles(to);
    have.delete('LICENSE.txt'); // written separately below
    if (same(want, have)) continue;
    if (check) { console.error(`out of date: ${relative(root, to)}`); failed = true; continue; }
    rmSync(to, { recursive: true, force: true });
    mkdirSync(to, { recursive: true });
    cpSync(from, to, { recursive: true });
    if (opts.note) writeFileSync(join(to, 'README.md'), GENERATED_NOTE);
    console.log(`updated ${relative(root, to)}`);
  }
  // Licence copies: one at the folder root, one the deployed app serves at /yare/LICENSE.txt
  for (const licTarget of [join(appDir, 'LICENSE'), join(appDir, 'public/yare/LICENSE.txt')]) {
    if (!existsSync(licTarget) || !readFileSync(licTarget).equals(readFileSync(licence))) {
      if (check) { console.error(`out of date: ${relative(root, licTarget)}`); failed = true; }
      else { mkdirSync(join(licTarget, '..'), { recursive: true }); cpSync(licence, licTarget); console.log(`updated ${relative(root, licTarget)}`); }
    }
  }
  // Dependency check
  if (!declared.recharts && existsSync(join(appDir, 'src/yare-charts'))) {
    if (check) { console.error(`out of date: ${app}/src/yare-charts (no recharts dependency)`); failed = true; }
    else { rmSync(join(appDir, 'src/yare-charts'), { recursive: true, force: true }); console.log(`removed ${app}/src/yare-charts`); }
  }
  const missing = required.filter((d) => !declared[d]);
  if (missing.length) { console.error(`${app}/package.json is missing: ${missing.join(', ')}`); failed = true; }
}

if (failed) process.exit(1);
if (!check) console.log(`synced ${apps.length} app${apps.length === 1 ? '' : 's'}`);
