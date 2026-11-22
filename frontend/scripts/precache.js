import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files = await readdir(new URL('../dist/assets/', import.meta.url));
// Exports stay on demand; store only public app code and fonts; features still require a server session.
const paths = [
  '/',
  '/favicon.svg',
  '/images/hero-leaves.webp',
  ...files
    .filter((f) => !/(jspdf|html2canvas|purify|index\.es-)/.test(f) && !f.endsWith('.woff'))
    .map((f) => `/assets/${f}`),
];
await writeFile(new URL('../dist/precache.json', import.meta.url), JSON.stringify(paths));
const version = createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 12);
const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
await writeFile(
  new URL('../dist/sw.js', import.meta.url),
  source.replace('pilihanku-shell-v1', `pilihanku-shell-${version}`)
);
console.log(`Offline public shell: ${paths.length} assets; private API excluded.`);
