#!/usr/bin/env node
// Packs the readable sources (`.docs/designs/src/<name>/`) into the design bundles (`.docs/designs/<name>.html`).
//
//   node .docs/designs/scripts/pack.mjs [--check] [--root <designs dir>] [<name> ...]
//
// `--check` writes nothing: it exits 1 naming every `.html` whose content differs from what its sources build.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REF, encodeAsset, isText, summarize, writeBundle } from './bundle.mjs';

export function buildDesign(name, root) {
  const dir = join(root, 'src', name);
  const read = (file) => readFileSync(join(dir, file), 'utf8');
  if (!existsSync(join(dir, 'bundle.json'))) throw new Error(`${name}: src/${name}/bundle.json not found`);
  const index = JSON.parse(read('bundle.json'));

  const uuidByName = new Map();
  for (const { uuid, file } of index.assets) uuidByName.set(file.split('/').pop(), uuid);
  const names = [...uuidByName.keys()].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`${REF.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const toUuids = (text) => (names.length ? text.replace(pattern, (_, file) => uuidByName.get(file)) : text);

  const manifest = {};
  for (const { uuid, file, mime, compressed } of index.assets) {
    const path = join(root, 'src', file);
    if (!existsSync(path)) throw new Error(`${name}: missing asset src/${file}`);
    const bytes = readFileSync(path);
    manifest[uuid] = encodeAsset({ mime, compressed, bytes: isText(mime) ? Buffer.from(toUuids(bytes.toString('utf8'))) : bytes });
  }
  return writeBundle({
    shell: read('shell.html'),
    manifest,
    extResources: index.extResources,
    pageOrder: index.pageOrder,
    template: toUuids(read('template.html')),
  });
}

/** Returns why `<name>.html` does not match its sources, or null when it does. */
export function checkDesign(name, root) {
  const target = join(root, `${name}.html`);
  if (!existsSync(target)) return 'the file does not exist';
  const built = buildDesign(name, root);
  return summarize(built) === summarize(readFileSync(target, 'utf8')) ? null : 'its content differs from the sources';
}

function main(argv) {
  const args = [...argv];
  const check = args.includes('--check');
  let root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const flag = args.indexOf('--root');
  if (flag >= 0) root = resolve(args.splice(flag, 2)[1]);
  const names = args.filter((arg) => !arg.startsWith('--')).map((arg) => arg.replace(/\.html$/, ''));
  const all = names.length ? names : readdirSync(join(root, 'src'), { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== '_shared').map((e) => e.name);
  let failed = false;
  for (const name of all) {
    try {
      if (check) {
        const why = checkDesign(name, root);
        if (why) {
          console.error(`stale: ${name}.html (${why}); run: node .docs/designs/scripts/pack.mjs ${name}`);
          failed = true;
        }
      } else {
        writeFileSync(join(root, `${name}.html`), buildDesign(name, root));
        console.log(`packed ${name}.html`);
      }
    } catch (error) {
      console.error(`pack: ${error.message}`);
      failed = true;
    }
  }
  if (check && !failed) console.log(`${all.length} design file(s) match their sources`);
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
