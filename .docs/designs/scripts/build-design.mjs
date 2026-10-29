#!/usr/bin/env node
// Builds the sources of a design `.html` from its page on the web (`/pt-br/designs/<slug>`): every entry is drawn
// twice, light and dark side by side, in pt-BR, with the web's own compiled CSS and the images the page draws.
//
//   node .docs/designs/scripts/build-design.mjs <slug> [--url http://localhost:3100]
//   node .docs/designs/scripts/pack.mjs <slug>
//
// `<slug>` is `design-system`, `auth-flow`, `student-app`, `instructor-app` or `admin-app`. Needs the web app running (`npm run build -w @rochas-surf-school/web`,
// then `npx next start -p 3100` in apps/web). Run it again after changing the web's design components or the app's
// messages. Every design shares the design system's loader (`shell.html`), fonts (`fonts.css`) and font assets; the
// rest of `src/<slug>/` (an old prototype's files, for one) is removed.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const BASE_DESIGN = 'design-system';
const IMAGE_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = args.indexOf('--url');
const base = flag >= 0 ? args[flag + 1] : 'http://localhost:3100';
const slug = args.find((arg, index) => !arg.startsWith('--') && (flag < 0 || index !== flag + 1));
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('usage: node .docs/designs/scripts/build-design.mjs <slug> [--url http://localhost:3100]');
  process.exit(1);
}

const src = join(root, 'src', slug);
const baseSrc = join(root, 'src', BASE_DESIGN);
mkdirSync(src, { recursive: true });

const get = async (path, binary = false) => {
  const response = await fetch(new URL(path, base));
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return binary ? Buffer.from(await response.arrayBuffer()) : response.text();
};

const page = new JSDOM(await get(`/pt-br/designs/${slug}`));
const { document } = page.window;

const css = (
  await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => get(link.getAttribute('href'))))
)
  .join('\n')
  // next/font faces point at files the .html doesn't have; the fonts come from fonts.css.
  .replace(/@font-face\s*\{[^}]*\/_next\/[^}]*\}/g, '');

const content = document.querySelector('main > div');
if (!content) throw new Error(`the ${slug} page has no content`);

// The images the page draws become assets of the bundle, named as the file the web imports (no build hash).
const images = new Map();
for (const image of content.querySelectorAll('img[src]')) {
  const path = image.getAttribute('src');
  if (!images.has(path)) {
    const file = path.split('/').pop().split('?')[0].replace(/\.[\w-]{8,}(\.\w+)$/, '$1');
    const extension = file.split('.').pop().toLowerCase();
    if (!IMAGE_MIME[extension]) throw new Error(`${path}: unknown image type`);
    images.set(path, { file, mime: IMAGE_MIME[extension], bytes: await get(path, true) });
  }
  image.setAttribute('src', `asset://${images.get(path).file}`);
}

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

// The page's title is "<name> | <site>"; the .html prints "<name> · <site>".
const title = document.title.replace(' | ', ' · ');

if (slug !== BASE_DESIGN) {
  copyFileSync(join(baseSrc, 'shell.html'), join(src, 'shell.html'));
  copyFileSync(join(baseSrc, 'fonts.css'), join(src, 'fonts.css'));
}

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
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

// The page is plain markup: the bundle only needs the fonts and the images.
const bundlePath = join(src, 'bundle.json');
const previous = existsSync(bundlePath) ? JSON.parse(readFileSync(bundlePath, 'utf8')) : { assets: [] };
const bundle = JSON.parse(readFileSync(join(baseSrc, 'bundle.json'), 'utf8'));
bundle.extResources = [];
bundle.assets = bundle.assets.filter((asset) => asset.file.endsWith('.woff2'));
for (const { file, mime, bytes } of images.values()) {
  writeFileSync(join(src, file), bytes);
  const known = previous.assets.find((asset) => asset.file === `${slug}/${file}`);
  bundle.assets.push({ uuid: known?.uuid ?? randomUUID(), file: `${slug}/${file}`, mime, compressed: false });
}
writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);

// Whatever else the folder holds is not used by the bundle any more.
const used = new Set(['template.html', 'shell.html', 'fonts.css', 'bundle.json', ...[...images.values()].map(({ file }) => file)]);
for (const file of readdirSync(src)) {
  if (!used.has(file)) {
    rmSync(join(src, file), { recursive: true });
    console.log(`removed src/${slug}/${file}`);
  }
}

console.log(`wrote src/${slug}/template.html (${Math.round(html.length / 1024)} KB)`);
