// Kept free of React Native imports so tailwind.config.ts can load it in Node.
// Same naming as packages/design-tokens/scripts/build-css.mjs: ink2 -> ink-2, onColor -> on-color.
export const kebab = (name: string) =>
  name.replace(/[A-Z0-9]+/g, (match) => `-${match.toLowerCase()}`);

/** CSS variable that holds a color token, e.g. `ink2` -> `--ds-ink-2`. */
export const colorVariable = (token: string) => `--ds-${kebab(token)}`;
