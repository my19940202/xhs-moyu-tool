import { execFileSync } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { FISH } from '../src/catalog.js';
await access('dist/index.html'); await access('dist/app.js');
for (const fish of FISH) await access(`dist/assets/fish/${fish.file}.js`);
const html=await readFile('dist/index.html','utf8');
const main=await readFile('src/main.js','utf8');
for (const [,id] of main.matchAll(/\$\('([^']+)'\)/g)) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing element #${id}`);
}
for (const path of ['app.js','style.css']) if (!html.includes(path)) throw new Error(`Missing ${path}`);
execFileSync(process.execPath,['/Users/xishengbo/.codex/skills/minitool-zip-builder/scripts/audit_artifact.mjs','dist'],{stdio:'inherit'});
