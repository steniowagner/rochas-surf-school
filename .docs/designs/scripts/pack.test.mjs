import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { encodeAsset, writeBundle } from './bundle.mjs';

const scripts = dirname(fileURLToPath(import.meta.url));
const run = (script, root, ...args) =>
  spawnSync(process.execPath, [join(scripts, script), '--root', root, ...args], { encoding: 'utf8' });

const PAGE_UUID = '11111111-1111-4111-8111-111111111111';
const LOGO_UUID = '22222222-2222-4222-8222-222222222222';
const FONT_UUID = '33333333-3333-4333-8333-333333333333';

/** A small bundle in the shape Claude Design exports: a page asset, a gzip script and a binary image. */
function fixture(title) {
  const text = (data, mime = 'text/html') => encodeAsset({ mime, compressed: true, bytes: Buffer.from(data) });
  return writeBundle({
    shell: '<!DOCTYPE html><html><head><title>Bundled</title></head><body>\n<script type="__bundler/manifest">\n@@manifest@@\n</script>\n<script type="__bundler/ext_resources">\n@@ext_resources@@\n</script>\n<script type="__bundler/page_order">\n@@page_order@@\n</script>\n<script type="__bundler/template">\n@@template@@\n</script></body></html>',
    manifest: {
      [PAGE_UUID]: text(`<h1>${title}</h1><img src="${LOGO_UUID}">`),
      [LOGO_UUID]: encodeAsset({ mime: 'image/png', compressed: false, bytes: Buffer.from([137, 80, 78, 71, 0, 1, 2]) }),
      [FONT_UUID]: text(`@font-face { src: url("${LOGO_UUID}") }`, 'text/css'),
    },
    extResources: [{ id: './Page One.dc.html', uuid: PAGE_UUID }, { id: 'logo', uuid: LOGO_UUID }],
    pageOrder: [],
    template: `<x-dc><dc-import src="${PAGE_UUID}"></dc-import><script src="${FONT_UUID}"></script></x-dc>`,
  });
}

describe('unpack and pack', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'designs-'));
    writeFileSync(join(root, 'one.html'), fixture('One'));
    writeFileSync(join(root, 'two.html'), fixture('Two'));
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  it('unpacks into readable sources and packs them back to the same content', () => {
    const unpacked = run('unpack.mjs', root);
    assert.equal(unpacked.status, 0, unpacked.stderr);

    const template = readFileSync(join(root, 'src/one/template.html'), 'utf8');
    assert.match(template, /asset:\/\/Page One\.dc\.html/);
    assert.doesNotMatch(template, /[0-9a-f]{8}-[0-9a-f]{4}-4/);
    assert.equal(readFileSync(join(root, 'src/one/Page One.dc.html'), 'utf8'), '<h1>One</h1><img src="asset://logo.png">');
    assert.ok(readdirSync(join(root, 'src/_shared')).includes('logo.png'), 'the image both files share is written once');

    const packed = run('pack.mjs', root);
    assert.equal(packed.status, 0, packed.stderr);
    assert.equal(run('pack.mjs', root, '--check').status, 0);
  });

  it('packs the file named on the command line only', () => {
    const packed = run('pack.mjs', root, 'one');
    assert.match(packed.stdout, /packed one\.html/);
    assert.doesNotMatch(packed.stdout, /two/);
  });

  it('--check exits 1 naming the stale file after a source changes', () => {
    writeFileSync(join(root, 'src/two/Page One.dc.html'), '<h1>Changed</h1>');
    const checked = run('pack.mjs', root, '--check');
    assert.equal(checked.status, 1);
    assert.match(checked.stderr, /stale: two\.html/);
    assert.doesNotMatch(checked.stderr, /one\.html/);
    assert.equal(run('pack.mjs', root, 'two').status, 0);
    assert.equal(run('pack.mjs', root, '--check').status, 0);
  });

  it('--check exits 1 when the html does not exist', () => {
    rmSync(join(root, 'one.html'));
    const checked = run('pack.mjs', root, '--check', 'one');
    assert.equal(checked.status, 1);
    assert.match(checked.stderr, /stale: one\.html/);
  });

  it('pack exits 1 naming a missing asset', () => {
    rmSync(join(root, 'src/_shared/logo.png'));
    const packed = run('pack.mjs', root, 'two');
    assert.equal(packed.status, 1);
    assert.match(packed.stderr, /missing asset src\/_shared\/logo\.png/);
  });

  it('pack exits 1 when a design has no sources', () => {
    const packed = run('pack.mjs', root, 'ghost');
    assert.equal(packed.status, 1);
    assert.match(packed.stderr, /ghost: src\/ghost\/bundle\.json not found/);
  });

  it('unpack exits 1 for an html without bundle data', () => {
    writeFileSync(join(root, 'plain.html'), '<html><body>no bundle here</body></html>');
    const unpacked = run('unpack.mjs', root, 'plain');
    assert.equal(unpacked.status, 1);
    assert.match(unpacked.stderr, /plain\.html: no bundle data/);
  });
});
