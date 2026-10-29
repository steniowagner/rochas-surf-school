#!/usr/bin/env node
// Builds the sources of design-system.html from the web's design system page (`/pt-br/designs/design-system`):
// every entry is drawn twice, light and dark side by side, in pt-BR, with the web's own compiled CSS.
//
//   node .docs/designs/scripts/build-design-system.mjs [--url http://localhost:3100]
//   node .docs/designs/scripts/pack.mjs design-system
//
// Needs the web app running (`npm run build -w @rochas-surf-school/web`, then `npx next start -p 3100` in apps/web).
// Run it again after changing the web's design components or the app's messages.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'design-system');
const args = process.argv.slice(2);
const base = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:3100';

const get = async (path) => {
  const response = await fetch(new URL(path, base));
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
};

const page = new JSDOM(await get('/pt-br/designs/design-system'));
const { document } = page.window;

const css = (
  await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => get(link.getAttribute('href'))))
)
  .join('\n')
  // next/font faces point at files the .html doesn't have; the fonts come from fonts.css.
  .replace(/@font-face\s*\{[^}]*\/_next\/[^}]*\}/g, '');

const content = document.querySelector('main > div');
if (!content) throw new Error('the design system page has no content');

const pair = (article) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'ds-pair';
  for (const theme of ['light', 'dark']) {
    const cell = document.createElement('div');
    cell.setAttribute('data-theme', theme);
    cell.className = 'ds-cell';
    cell.append(article.cloneNode(true));
    wrapper.append(cell);
  }
  article.replaceWith(wrapper);
};
content.querySelectorAll('article[data-design-id]').forEach(pair);

const pairCss = `
.ds-pair{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,520px),1fr));gap:16px}
.ds-cell{background:var(--ds-page);color:var(--ds-ink);border-radius:var(--ds-radius-sheet);padding:16px;min-width:0;border:1px solid var(--ds-line)}
.ds-page{max-width:1440px;margin:0 auto;padding:56px 32px 96px;display:flex;flex-direction:column;gap:40px}
[data-theme]{--ds-font-display:'Barlow Condensed';--ds-font-body:'Nunito'}
html{background:#FDF8F3}body{margin:0;font-family:'Nunito',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
`;

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sistema de design · Rocha's Surf School</title>
<style>
${readFileSync(join(src, 'fonts.css'), 'utf8')}
</style>
<style>
${css}
${pairCss}
</style>
</head>
<body>
<div data-theme="light" class="ds-page">
${content.innerHTML}
</div>
</body>
</html>
`;

writeFileSync(join(src, 'template.html'), html);

// The page is plain markup: the bundle only needs the fonts.
const bundle = JSON.parse(readFileSync(join(src, 'bundle.json'), 'utf8'));
bundle.extResources = [];
bundle.assets = bundle.assets.filter((asset) => asset.file.endsWith('.woff2'));
writeFileSync(join(src, 'bundle.json'), `${JSON.stringify(bundle, null, 2)}\n`);

console.log(`wrote src/design-system/template.html (${Math.round(html.length / 1024)} KB)`);
