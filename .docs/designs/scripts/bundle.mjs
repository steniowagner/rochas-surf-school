// Shared by unpack.mjs and pack.mjs: reading and writing the bundles that Claude Design exports.
//
// A bundle is one `.html` with four data blocks (`<script type="__bundler/manifest|ext_resources|page_order|template">`)
// and a script that unpacks them in the browser. The manifest maps asset UUIDs to base64 (some gzip-compressed)
// content, and the template and the text assets refer to each other by UUID. In the sources, the references are
// `asset://<file name>` so that a change can be read and reviewed.
import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';

export const BLOCKS = ['manifest', 'ext_resources', 'page_order', 'template'];
export const REF = 'asset://';

const TEXT_MIME = /^text\/|javascript|json|xml/i;

export const isText = (mime) => TEXT_MIME.test(mime);
export const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

function findBlock(html, name) {
  const open = `<script type="__bundler/${name}">`;
  const start = html.indexOf(open);
  if (start < 0) return null;
  const from = start + open.length;
  const end = html.indexOf('</script>', from);
  if (end < 0) return null;
  return { from, end };
}

/** Splits a bundle `.html` into its shell (the page with the data blocks replaced by `@@name@@`) and its data. */
export function readBundle(html) {
  const found = {};
  for (const name of BLOCKS) {
    const block = findBlock(html, name);
    if (!block) throw new Error(`no bundle data (missing the ${name} block)`);
    found[name] = block;
  }
  const data = {};
  if (/@@(manifest|ext_resources|page_order|template)@@/.test(html)) {
    throw new Error('the file already contains an @@block@@ marker, which the sources use as a placeholder');
  }
  let shell = html;
  for (const name of [...BLOCKS].sort((a, b) => found[b].from - found[a].from)) {
    const { from, end } = found[name];
    data[name] = JSON.parse(html.slice(from, end));
    const raw = html.slice(from, end);
    const lead = raw.length - raw.trimStart().length;
    const trail = raw.length - raw.trimEnd().length;
    shell = `${shell.slice(0, from + lead)}@@${name}@@${shell.slice(end - trail)}`;
  }
  return { shell, manifest: data.manifest, extResources: data.ext_resources, pageOrder: data.page_order, template: data.template };
}

export function decodeAsset({ mime, compressed, data }) {
  const bytes = Buffer.from(data, 'base64');
  return { mime, compressed: Boolean(compressed), bytes: compressed ? gunzipSync(bytes) : bytes };
}

export function encodeAsset({ mime, compressed, bytes }) {
  const payload = compressed ? gzipSync(bytes, { level: 9 }) : bytes;
  return { mime, compressed, data: payload.toString('base64') };
}

export function writeBundle({ shell, manifest, extResources, pageOrder, template }) {
  const values = {
    manifest: JSON.stringify(manifest),
    ext_resources: JSON.stringify(extResources),
    page_order: JSON.stringify(pageOrder),
    template: JSON.stringify(template).replace(/<\/script>/gi, '<\\u002Fscript>'),
  };
  let html = shell;
  for (const name of BLOCKS) {
    if (!html.includes(`@@${name}@@`)) throw new Error(`the shell has no @@${name}@@ placeholder`);
    html = html.replace(`@@${name}@@`, () => values[name]);
  }
  return html;
}

/** What two bundles must share to render the same canvas, independent of how the assets are compressed. */
export function summarize(html) {
  const { shell, manifest, extResources, pageOrder, template } = readBundle(html);
  const assets = Object.entries(manifest).map(([uuid, asset]) => {
    const { mime, compressed, bytes } = decodeAsset(asset);
    return [uuid, mime, compressed, sha(bytes)];
  });
  return JSON.stringify({ shell: sha(shell), extResources, pageOrder, template: sha(template), assets });
}
