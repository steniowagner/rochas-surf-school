---
id: "024"
slug: web-theme-toggle
title: Theme toggle in the web header
template: quick
status: in-progress
created: 2026-10-13
started: 2026-10-13
base_commit: b873515f3b0042c413a1d700245add6b4735513d
fronts: [web]
depends_on: []
---

# 024 — Theme toggle in the web header

## Goal

Visitors can switch the public site between light and dark with an icon button in the header. The site follows
the system's color scheme until they choose, and the choice is kept across pages and languages.

## Context

- Requirements: [requirements.md → Public web pages](../../../.docs/requirements.md#6-public-web-pages) — the
  public site; the app's theme rule (follow the device until the user chooses) is applied to the site.
- Existing code this changes: `apps/web/src/components/site-header/site-header.component.tsx` — home link and
  `LanguagePicker`, no theme control. `packages/design-tokens/src/tokens.css` already defines the dark palette
  for `@media (prefers-color-scheme: dark)` (when `<html>` is not `data-theme="light"`) and for
  `[data-theme='dark']`, so no token changes are needed.

## Decisions

| ID | Decision | Reason |
| --- | --- | --- |
| D-01 | The choice persists in `localStorage` under the key `theme` (`light` or `dark`); an inline script in `<head>` sets `data-theme` on `<html>` before first paint. | Language and page links are full page loads; without persistence the choice would reset on each one. |
| D-02 | The icon swap is CSS only: both icons are rendered and the sun is hidden whenever the effective theme is dark (the media query without `data-theme="light"`, or `data-theme="dark"`). | The server can't know the theme; state-driven icons would mismatch on hydration or flash. |
| D-03 | The accessible name is one static string, `header.themeLabel`: "Toggle theme" (en), "Cambiar tema" (es), "Alternar tema" (pt-BR). | The label doesn't depend on the current theme. |
| D-04 | There is no "system" option in the UI. | The request is a single icon button; clearing site data returns to the system default. |

## Expected Results

### ER-01 — Default follows the system

- **Front:** web
- **Behavior:** Given a visitor who has never pressed the toggle, when a page loads, then it uses the OS color
  scheme (dark OS → dark page, light OS → light page), `<html>` has no `data-theme` and nothing is stored. The
  button shows a sun in light mode and a moon in dark mode.
- **Edge and error cases:** A stored value other than `light` or `dark` is ignored and the system preference is
  used.
- **Verify by:** browser check by the reviewer (`apps/web/src/**` has no test runner and is excluded from
  coverage): emulate `prefers-color-scheme` light and dark on `/en`, with `localStorage` cleared.

### ER-02 — Pressing the toggle switches the theme

- **Front:** web
- **Behavior:** Given the page in light mode, when the visitor presses the button, then the page turns dark and
  the icon becomes a moon; pressing again turns it light with a sun.
- **Edge and error cases:** The button is a native `<button>` with a 44px touch target and an accessible name in
  en, es and pt-BR. If `localStorage` is unavailable the toggle still works for the current page.
- **Verify by:** browser check by the reviewer: press the button on `/en`, `/es` and `/pt-br`, check the
  colors, icon and `aria-label`.

### ER-03 — The choice persists across pages and languages

- **Front:** web
- **Behavior:** Given a visitor who pressed the toggle, when they reload or open another page or language,
  then the same theme applies from first paint, with no flash of the other theme.
- **Edge and error cases:** The choice wins over the OS scheme in both directions (light chosen on a dark OS,
  dark chosen on a light OS).
- **Verify by:** browser check by the reviewer: press the toggle, reload, switch language and open another page;
  repeat with the OS scheme opposite to the choice.

## Tasks

### Web (`apps/web`)

- [x] **T-01** — Add `ThemeToggle` in `src/components/theme-toggle/` (`theme-toggle.component.tsx`,
  `theme-toggle.hook.ts`, `theme-toggle.types.ts`, `index.ts`, following `.claude/rules/react.md`): a button
  with lucide `Sun` and `Moon`, 44px target, styled with the design tokens. The icon swap is CSS in
  `src/app/globals.css`. The hook reads the effective theme (`data-theme`, else `matchMedia`), flips it, sets
  `data-theme` on `<html>` and writes `localStorage` in a try/catch. Add `header.themeLabel` to
  `src/i18n/dictionary.types.ts` and the en, es and pt-br dictionaries.
  Covers: ER-01, ER-02, ER-03 · Done when: `npx turbo run lint check-types --filter=@rochas-surf-school/web`
  passes.
  > ✅ 2026-10-13 — added `ThemeToggle` (button with `Sun`/`Moon`, 44px, tokens), hook flipping `data-theme` and writing `localStorage` in try/catch, CSS icon swap, `header.themeLabel` in the dictionaries; files: `apps/web/src/components/theme-toggle/{index.ts,theme-toggle.component.tsx,theme-toggle.hook.ts,theme-toggle.types.ts}`, `apps/web/src/app/globals.css`, `apps/web/src/i18n/dictionary.types.ts`, `apps/web/src/i18n/dictionaries/{en,es,pt-br}.ts`; verified: `npx turbo run lint check-types --filter=@rochas-surf-school/web` (4 tasks successful); deviations: none
- [ ] **T-02** — In `src/app/[lang]/layout.tsx`, add the inline `<head>` script that validates the stored value
  and sets `data-theme`, and `suppressHydrationWarning` on `<html>`. Render `ThemeToggle` in
  `src/components/site-header/site-header.component.tsx` next to `LanguagePicker`, with its label passed from the
  dictionary (update `site-header.types.ts`).
  Covers: ER-01, ER-03 · Done when: with the dev server running, the toggle appears in the header on `/en` and
  its choice survives a reload without a flash.

### Verification

- [ ] **T-03** — Run every command in the Verification Plan from the repo root; all pass, and check ER-01 to
  ER-03 in a browser. Record the output summary as evidence. Covers: all · Done when: every command exits 0.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 024` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 024` — every line this spec adds or changes is covered (`apps/web/src/**` is excluded in the technical context).
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/web` — no errors.
- Manual: ER-01 to ER-03 in a browser, as described in each `Verify by`.

## Memory Impact

- `memory/technical-context.md` — Applications → `apps/web`: theme handling (`data-theme` on `<html>`,
  `localStorage` key `theme`, pre-paint script in `[lang]/layout.tsx`, CSS-only icon swap).

## Amendments

## Review
