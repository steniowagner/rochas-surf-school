#!/usr/bin/env node
// Unpacks the design bundles (`.docs/designs/*.html`) into readable sources (`.docs/designs/src/<name>/`).
//
//   node .docs/designs/scripts/unpack.mjs [--root <designs dir>] [<name or file.html> ...]
//
// Per design: `shell.html` (the page around the data), `template.html` (the canvas, with `asset://<file>` in
// place of the asset UUIDs), `bundle.json` (the asset index) and one file per asset. Assets with the same name and
// content in more than one design are written once, in `src/_shared/`.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REF, decodeAsset, isText, readBundle, sha } from './bundle.mjs';
import { checkDesign } from './pack.mjs';

const EXT_BY_MIME = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/svg+xml': '.svg',
  'font/woff2': '.woff2',
  'text/css': '.css',
  'text/html': '.html',
  'text/jsx': '.jsx',
  'text/javascript': '.js',
  'application/javascript': '.js',
};

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

function hintedName(id) {
  if (/^https?:/.test(id)) {
    const url = new URL(id);
    const last = basename(url.pathname);
    return url.hostname === 'fonts.googleapis.com' ? 'fonts.css' : last;
  }
  if (id.startsWith('./')) return decodeURIComponent(id.slice(2));
  return id;
}

function withExt(name, mime) {
  return extname(name) ? name : `${name}${EXT_BY_MIME[mime] ?? ''}`;
}

/** The names the bundle itself gives its assets: the ext_resources ids and the `uuid#/name` fragments. */
function collectHints({ extResources, template, manifest }) {
  const hints = new Map();
  for (const { id, uuid } of extResources) {
    if (manifest[uuid]) hints.set(uuid, withExt(hintedName(id), manifest[uuid].mime));
  }
  for (const [, uuid, fragment] of template.matchAll(/([0-9a-f-]{36})#\/([\w.-]+)/g)) {
    if (manifest[uuid] && !hints.has(uuid)) hints.set(uuid, fragment);
  }
  return hints;
}

function resolveDesign(file) {
  const bundle = readBundle(readFileSync(file, 'utf8'));
  const hints = collectHints(bundle);
  const uuids = Object.keys(bundle.manifest);
  const assets = new Map(uuids.map((uuid) => [uuid, decodeAsset(bundle.manifest[uuid])]));
  const names = new Map();

  const toRefs = (text) => text.replace(UUID, (uuid) => (assets.has(uuid) ? `${REF}${nameOf(uuid, [])}` : uuid));

  function contentOf(uuid, seen) {
    const asset = assets.get(uuid);
    if (!isText(asset.mime)) return asset.bytes;
    const text = asset.bytes.toString('utf8');
    if (!Buffer.from(text).equals(asset.bytes)) throw new Error(`asset ${uuid} is not valid UTF-8`);
    return Buffer.from(text.replace(UUID, (id) => (assets.has(id) && !seen.includes(id) ? `${REF}${nameOf(id, [...seen, uuid])}` : id)));
  }

  function nameOf(uuid, seen) {
    if (names.has(uuid)) return names.get(uuid);
    const asset = assets.get(uuid);
    const hint = hints.get(uuid);
    let name;
    if (hint) name = hint;
    else if (isText(asset.mime) && asset.bytes.toString('utf8', 0, 40).includes('GENERATED from dc-runtime')) name = 'dc-runtime.js';
    else if (isText(asset.mime) && asset.bytes.toString('utf8', 0, 60).startsWith('(function () {\n  var P = {')) name = 'icons.js';
    else {
      const kind = asset.mime.startsWith('font/') ? 'font' : asset.mime.startsWith('image/') ? 'image' : 'script';
      name = `${kind}-${sha(contentOf(uuid, [...seen, uuid])).slice(0, 8)}${EXT_BY_MIME[asset.mime] ?? ''}`;
    }
    if (!seen.length) names.set(uuid, name);
    return name;
  }

  for (const uuid of uuids) nameOf(uuid, []);
  const used = new Map();
  for (const uuid of uuids) {
    let name = names.get(uuid);
    const hash = sha(contentOf(uuid, [])).slice(0, 8);
    if (used.has(name) && used.get(name) !== hash) name = name.replace(/(\.[^.]*)?$/, `-${hash}$1`);
    used.set(name, hash);
    names.set(uuid, name);
  }
  return { bundle, assets, names, content: (uuid) => contentOf(uuid, []), toRefs };
}

export function unpack(files, designsDir) {
  const src = join(designsDir, 'src');
  const designs = files.map((file) => {
    const name = basename(file, '.html');
    try {
      return { name, ...resolveDesign(file) };
    } catch (error) {
      throw new Error(`${basename(file)}: ${error.message}`);
    }
  });

  const owners = new Map();
  for (const design of designs) {
    for (const uuid of design.assets.keys()) {
      const key = `${design.names.get(uuid)}\0${sha(design.content(uuid))}`;
      owners.set(key, (owners.get(key) ?? 0) + 1);
    }
  }

  for (const design of designs) {
    const dir = join(src, design.name);
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(src, '_shared'), { recursive: true });
    const index = [];
    for (const uuid of design.assets.keys()) {
      const name = design.names.get(uuid);
      const bytes = design.content(uuid);
      const shared = owners.get(`${name}\0${sha(bytes)}`) > 1 || existsShared(src, name, bytes);
      const file = shared ? `_shared/${name}` : `${design.name}/${name}`;
      writeFileSync(join(src, file), bytes);
      const { mime, compressed } = design.bundle.manifest[uuid];
      index.push({ uuid, file, mime, compressed: Boolean(compressed) });
    }
    if (design.bundle.template.includes(REF)) {
      throw new Error(`${design.name}: the template already contains "${REF}", which the sources use as the asset marker`);
    }
    writeFileSync(join(dir, 'shell.html'), design.bundle.shell);
    writeFileSync(join(dir, 'template.html'), design.toRefs(design.bundle.template));
    const json = { extResources: design.bundle.extResources, pageOrder: design.bundle.pageOrder, assets: index };
    writeFileSync(join(dir, 'bundle.json'), `${JSON.stringify(json, null, 2)}\n`);
  }
  return designs.map((design) => design.name);
}

function existsShared(src, name, bytes) {
  const path = join(src, '_shared', name);
  return existsSync(path) && readFileSync(path).equals(bytes);
}

function main(argv) {
  const args = [...argv];
  let root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const flag = args.indexOf('--root');
  if (flag >= 0) root = resolve(args.splice(flag, 2)[1]);
  const wanted = args.length
    ? args.map((arg) => (arg.endsWith('.html') ? resolve(arg) : join(root, `${arg}.html`)))
    : readdirSync(root).filter((file) => file.endsWith('.html')).map((file) => join(root, file));
  try {
    const names = unpack(wanted, root);
    for (const name of names) {
      const stale = checkDesign(name, root);
      if (stale) throw new Error(`${name}: the sources do not rebuild the original (${stale})`);
      console.log(`unpacked ${name}`);
    }
  } catch (error) {
    console.error(`unpack: ${error.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
