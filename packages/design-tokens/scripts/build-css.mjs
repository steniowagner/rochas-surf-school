// Generates src/tokens.css from src/tokens.ts. Variables use a --ds- prefix so they never clash
// with Tailwind's theme namespaces (--color-*, --radius-*, --shadow-*).
// --ds-font-display and --ds-font-body are set by each app's font loader. Run with --check to fail when the committed CSS is stale.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { colors, elevation, radii, typography } from '../src/tokens.ts';

const cssPath = fileURLToPath(new URL('../src/tokens.css', import.meta.url));
const kebab = (name) => name.replace(/[A-Z0-9]+/g, (match) => `-${match.toLowerCase()}`);

function colorVars(scheme) {
  return Object.entries(colors[scheme])
    .map(([name, value]) => `  --ds-${kebab(name)}: ${value};`)
    .join('\n');
}

const css = `/* Generated from tokens.ts by scripts/build-css.mjs — do not edit by hand. */

:root,
[data-theme='light'] {
${colorVars('light')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${colorVars('dark').replace(/^/gm, '  ')}
  }
}

[data-theme='dark'] {
${colorVars('dark')}
}

:root {
${Object.entries(radii)
  .map(([name, value]) => `  --ds-radius-${kebab(name)}: ${value}px;`)
  .join('\n')}
${Object.entries(elevation)
  .map(
    ([name, { offsetY, blur, color }]) =>
      `  --ds-elevation-${kebab(name)}: 0 ${offsetY}px ${blur}px var(--ds-${kebab(color)});`
  )
  .join('\n')}
}
${Object.entries(typography)
  .map(
    ([name, t]) => `
.ds-text-${kebab(name)} {
  font-family: var(--ds-font-${t.font}), ${t.font === 'display' ? 'sans-serif' : 'system-ui, sans-serif'};
  font-weight: ${t.weight};
  font-size: ${t.size}px;
  line-height: ${t.lineHeight};
  letter-spacing: ${t.letterSpacing}em;
  text-transform: ${t.uppercase ? 'uppercase' : 'none'};
}`
  )
  .join('\n')}
`;

if (process.argv.includes('--check')) {
  if (readFileSync(cssPath, 'utf8') !== css) {
    console.error('tokens.css is out of date. Run `npm run build -w @rochas-surf-school/design-tokens`.');
    process.exit(1);
  }
} else {
  writeFileSync(cssPath, css);
}
