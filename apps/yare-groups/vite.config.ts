import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Which app this is and which version, so the app can tell when the repository holds a newer one.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { name: string; version: string };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __YARE_APP__: JSON.stringify({ slug: pkg.name.replace(/^yare-/, ''), version: pkg.version }) },
});
