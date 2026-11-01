#!/usr/bin/env node
/**
 * After `vite build`: writes dist/yare.json with the two public Supabase values, so the Worker that
 * fills a page's <head> for search engines and agents can read them. Both are public by design
 * (the same two the app ships in its bundle); nothing secret ever goes here.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(fileURLToPath(import.meta.url), '..');
const env = { ...readDotEnv(join(app, '.env')), ...process.env };
const url = env.VITE_SUPABASE_URL ?? '';
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
writeFileSync(join(app, 'dist/yare.json'), JSON.stringify({ supabaseUrl: url, supabasePublishableKey: key }));

function readDotEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split('\n').map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
}
