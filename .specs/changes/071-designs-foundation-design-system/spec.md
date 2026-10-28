---
id: "071"
slug: designs-foundation-design-system
title: Public designs area and the design system page
status: in-progress
started: 2026-10-28
base_commit: 276ffc29014c5113e8451f9bba1dac669c353719
created: 2026-10-28
fronts: [designs, app-messages, mobile, web]
depends_on: []
---

# 071 — Public designs area and the design system page

## Goal

People interested in the app can open `/{lang}/designs` on the public site and browse the app's design system
as it is built today, in the theme and language picked in the site header. Before the web gets it, the design
files in `.docs/designs` become editable and reviewable (readable sources and a pack script), and
`design-system.html` is brought in line with the code, absorbing `empty-and-error-states.html`. The spec also
lays the groundwork the next four design specs (auth flow, student, instructor, admin) reuse: the app's copy
shared between mobile and web, the phone frame and the mock UI pieces.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: roles (student, instructor, admin),
  the three app languages (pt-BR, es-ES, en-US), "The only web surface is a small public site", which this spec
  widens; Out of scope → ratings and photos and the dashboard metrics, which the designs drop (D-07).
- Requirements: [requirements.md → 6.1 Public web pages](../../../.docs/requirements.md#61-public-web-pages)
  — the public site this spec adds a designs area to;
  [user-journeys.md → header](../../../.docs/user-journeys.md#surf--skate-school-scheduling-platform---user-journeys)
  — its "Designs" line says the designs are exported from the Claude Design project into `.docs/designs/`, which
  D-02 changes.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications →
  `apps/web` (routes under `src/app/[lang]/`, `src/proxy.ts`, the dictionaries, the theme toggle and language
  picker), Applications → `apps/mobile` (i18next with `src/i18n/messages/*.ts`), Automated validation (Vitest
  and Playwright on web, Jest on mobile), Coverage (`apps/web/src/**` and, since this spec's planning,
  `.docs/designs/**` are excluded).
- Design tokens: `packages/design-tokens/src/tokens.ts` — the source the design system page shows; the web
  already maps them to Tailwind utilities in `apps/web/src/app/globals.css`.
- Existing design files: `.docs/designs/{design-system,auth-flow,student-app,instructor-app,admin-app,empty-and-error-states}.html`.
  Each is a bundled Claude Design export: a `__bundler/manifest` of base64 (some gzip-compressed) assets keyed
  by UUID, an `__bundler/ext_resources` map of names to UUIDs, a `__bundler/template` (the canvas page) and an
  unpacking script. The canvases place `<dc-import name="…" screen="…" theme="light|dark">` frames of one
  prototype page per app (`App Admin.dc.html`, `App Aluno.dc.html`, `App Instrutor.dc.html`,
  `Login Screen.dc.html`), written in an `x-dc` template language with `React.createElement` code, run by a
  bundled `support.js` runtime, React 18 UMD and Babel standalone. Their copy is hard-coded European
  Portuguese with Portuguese places (Nazaré, Cascais). The vendor assets (React, ReactDOM, Babel, the fonts
  CSS and woff2 files, `support.js`, the flags) are byte-identical across the files.
- Existing app code the designs reproduce: `apps/mobile/src/components/**` (shared components, props in each
  `*.types.ts`), `apps/mobile/src/modules/classes/components/{class-card,class-card-skeleton}`, the role tab
  layouts in `apps/mobile/src/app/(private)/<role>/(tabs)/_layout.tsx`, the copy in
  `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts` (`Messages` is declared by `en-US.ts`; i18next
  interpolation `{{name}}`, plural suffixes and `<tag>` rich text).
- The inventory of what the design system shows: [design-system-inventory.md](design-system-inventory.md).

## Scope

### In scope

- Readable sources of all six design files under `.docs/designs/src/`, with unpack and pack scripts and a
  `--check` mode.
- `design-system.html` updated to match the code (pt-BR, light and dark side by side, every inventory entry),
  with the content of `empty-and-error-states.html` merged in and that file deleted.
- A new package `@rochas-surf-school/app-messages` holding the app's three message files, imported by the
  mobile app instead of its local copies.
- On the web: `/designs` redirects, a wide layout for the design pages, the `/{lang}/designs` index, a
  "Designs" row on the home page, the app-copy helper, the phone frame and the mock components of the
  inventory, and the `/{lang}/designs/design-system` page.

### Out of scope

- The auth-flow, student, instructor and admin designs, in `.html` and on the web (specs 072–075; until
  then, those `.html` files are only unpacked, not changed, and the index doesn't list them).
- Android frames and any platform toggle.
- Features the app doesn't have (ratings, photos, instructor notes, dashboard metrics, profile photos).
- Clickable prototypes: every state is a static frame.
- Publishing the sources to the Claude Design project, or keeping that project in sync.
- Changing any mobile screen, component or copy (the mobile change is where the messages are imported from).
- Search-engine settings (robots, sitemap) for the design pages.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The `.html` files are updated first and stay in `.docs/designs`; the web pages then reproduce them in React. Both are maintained. | The user's choice: the `.html` files remain the reference designs, and the web makes them public and follows the header's theme and language. |
| D-02 | The `.html` files are edited through readable sources in `.docs/designs/src/<name>/` and rebuilt with `node .docs/designs/scripts/pack.mjs`; the vendor assets shared by every file are committed once, de-duplicated, in `.docs/designs/src/_shared/`. `pack.mjs --check` exits 1 when an `.html` doesn't match its sources. The Claude Design project is no longer where the designs are edited. | A packed `.html` is one multi-megabyte base64 line, so a change can't be reviewed; committed vendor assets make the pack work offline and give the same output every time. |
| D-03 | Only iOS phone frames, 402 × 874 points, as the prototypes draw them. | Halves the work; the platform differences are small and the product's designs were made on iOS. |
| D-04 | The `.html` files are in pt-BR only and show every frame in light and dark side by side. The web pages show one theme, the header's, and the language of the URL. | A static file can't read the site header; the web can, and the user asked for the header to drive it. pt-BR is the product's language (the prototypes' European Portuguese is not). |
| D-05 | The labels inside the frames are the app's real copy, from `@rochas-surf-school/app-messages`, in the page's language. The web's own text (section titles, explanations, each entry's note) lives in the web dictionaries (`apps/web/src/i18n/dictionaries/*.ts`) in pt-BR, es and en. | The copy can never drift from the app, and every word on the page follows the header's language. |
| D-06 | `@rochas-surf-school/app-messages` is built like `packages/shared` (TypeScript compiled with `tsc` to `dist/`, Jest tests in `test/`); the message files move there with `git mv`, keeping their content, and `Messages` stays the type declared by `en-US`. | Metro, Jest and Next all consume a compiled workspace package the way they already consume `@rochas-surf-school/shared` and `@rochas-surf-school/classes`. |
| D-07 | Screens, components and states the app doesn't have are left out of the designs. | The designs show what the app does today. |
| D-08 | Fidelity rule: an entry matches the code when it shows the same elements in the same order, the same copy, the same color, type and radius tokens and the same icon glyphs as the app renders for that state (on the iOS simulator, or as its component code draws it). Pixel-exact sizes, font antialiasing and the mock data's values aren't judged. | Gives the reviewer a pass/fail rule for "matches the code" without pixel diffs. |
| D-09 | The designs draw the app's own icon glyphs (Ionicons, Feather, FontAwesome, FontAwesome6, MaterialCommunityIcons, SimpleLineIcons) by name: on the web through the npm packages of those icon sets (for example `react-icons` and `@mdi/js`), in the `.html` as inline SVG paths in the shared icons script. Lucide stays only for the site's own pages. | The prototypes and the web use Lucide, which doesn't match the app. |
| D-10 | The mock data is fictional and Brazilian: Brazilian names, Fortaleza places (for example Praia de Iracema, Praia do Futuro), dates and times in America/Fortaleza. The same data in the `.html` and on the web. | The school is in Fortaleza; the prototypes' Portuguese places don't fit. |
| D-11 | The design system keeps the section numbers 01–08 it has today, with "08 — Regras" as the rules; the empty, loading and error states become section 09. Every entry has the id from the inventory (`DS-<section number>-<entry number>`), printed in the `.html` and set as `data-design-id` on the web. | `CLAUDE.md` points at section 08 for the usage rules; stable ids let the reviewer and the e2e suite check every entry. |
| D-12 | The web's designs code lives in `apps/web/src/modules/designs/` (`components/`, `i18n/`, `data/`, `pages/`), routes in `apps/web/src/app/[lang]/designs/`. The mock components keep the mobile component names and props and follow `.claude/rules/react.md`; they are presentational (no state, no effects) and styled with the web's token utilities. | One place for the designs, separate from the site's real components (`src/components/ui/{button,chip}`), which keep their own role. |
| D-13 | The index lists only the design pages that exist: after this spec, the design system. Each later spec adds its own entry. Design page slugs are fixed in a typed list (`generateStaticParams`, `dynamicParams = false`), so another slug answers 404. | No "coming soon" pages, and the pages stay statically generated like the rest of the site. |
| D-14 | `/designs` and `/designs/<slug>` without a language go through the existing language redirect (307, pt-BR fallback): `src/proxy.ts` adds `/designs` and `/designs/:path*` to its matcher. | Same behavior as the other public paths. |
| D-15 | The design pages use a container up to 1440 px wide; the privacy policy, terms, account deletion and home keep their 640 px column, header and footer. On viewports narrower than a phone frame, the frames scale down to fit, so the page never scrolls sideways. | The canvases need room for rows of frames; the legal pages must not change. |
| D-16 | `.docs/designs/**` is excluded from coverage (technical-context → Coverage); the pack scripts are tested with `node --test` round-trip tests. | Decided with the user while planning: the prototypes are checked by opening them, and the coverage tooling doesn't measure `node --test`. |

## Expected Results

### ER-01 — The design files rebuild from their sources

- **Front:** designs
- **Behavior:** Given the committed sources in `.docs/designs/src/`, when
  `node .docs/designs/scripts/pack.mjs --check` runs from the repo root, then it exits 0. Unpacking any
  current `.html` and packing it again gives an `.html` whose template, assets and pages decode to the same
  content as before, and that renders the same canvas when opened in a browser.
- **Edge and error cases:** after one source file changes without packing, `--check` exits 1 and names the
  `.html` that is stale; a source folder whose asset is missing makes `pack.mjs` exit 1 naming the asset; an
  `.html` without bundle data makes `unpack.mjs` exit 1.
- **Verify by:** `node --test .docs/designs/scripts/*.test.mjs` (the round-trip, stale and missing-asset
  tests) and `node .docs/designs/scripts/pack.mjs --check` exiting 0.

### ER-02 — The design system file shows the code's design system

- **Front:** designs
- **Behavior:** Given `.docs/designs/design-system.html` opened in a browser, then it shows every entry of
  [design-system-inventory.md](design-system-inventory.md) with its id, in pt-BR, each in light and dark side
  by side, and each entry matches the code by D-08. Section numbers 01–08 are kept, with the rules in 08 and the
  loading, empty and error states in 09; the icons are the app's glyphs (D-09).
- **Edge and error cases:** `.docs/designs/empty-and-error-states.html` and its source folder no longer
  exist; no European Portuguese wording is left (for example "ecrã", "folha", "Já a seguir", "As minhas");
  no entry shows a feature the app doesn't have (D-07).
- **Verify by:** open the file in a browser and walk the inventory, comparing each entry with the component
  code (and the simulator where a state is easy to reach); `node .docs/designs/scripts/pack.mjs --check`
  exits 0; `test ! -e .docs/designs/empty-and-error-states.html`.

### ER-03 — The app's copy lives in one package

- **Front:** app-messages
- **Behavior:** Given `@rochas-surf-school/app-messages`, when it is imported, then it exports the en-US,
  es-ES and pt-BR messages and the `Messages` type, and the three locales have exactly the same set of keys,
  with the same text the mobile app had before this spec.
- **Edge and error cases:** a key missing from or added to one locale fails `check-types`; the Jest test
  fails naming the key when the key sets differ.
- **Verify by:** `npm test --workspace @rochas-surf-school/app-messages` (the key-parity test) and
  `npm run check-types --workspace @rochas-surf-school/app-messages`.

### ER-04 — The mobile app reads its copy from the package

- **Front:** mobile
- **Behavior:** Given the mobile app, when it starts in any of its three languages, then every label is the
  same as before this spec, read from `@rochas-surf-school/app-messages`; `apps/mobile/src/i18n/messages/` no
  longer exists.
- **Edge and error cases:** the fallback language stays en-US; the stored language preference still applies.
- **Verify by:** `npm test --workspace @rochas-surf-school/mobile` (the whole suite passes unchanged, including
  `src/i18n/index.test.ts`) and launching the app in the iOS simulator: the sign-in screen shows "Continuar
  com o Google" with the phone in Portuguese.

### ER-05 — Designs URLs without a language redirect

- **Front:** web
- **Behavior:** Given a browser whose first matching language is Spanish, when it opens `/designs`, then it
  is redirected with 307 to `/es/designs`; `/designs/design-system` is redirected to
  `/es/designs/design-system`.
- **Edge and error cases:** no `Accept-Language` or no matching language → `/pt-br/...`;
  `/{lang}/designs/unknown` answers 404; `/fr/designs` answers 404.
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `redirects /designs to the browser language`,
  `falls back to pt-br`, `answers 404 for an unknown design page`, run by `node .specs/scripts/run-e2e.mjs 071`.

### ER-06 — The home page links to the designs

- **Front:** web
- **Behavior:** Given `/{lang}` for each of `pt-br`, `es` and `en`, then the page shows a fourth row, after
  account deletion, titled and described in that language, linking to `/{lang}/designs`.
- **Edge and error cases:** the three existing rows and their order don't change.
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `home links to the designs in every language`.

### ER-07 — The designs index lists the design pages

- **Front:** web
- **Behavior:** Given `/{lang}/designs`, then it shows a title and introduction in that language and one card
  per existing design page — after this spec only "design system" — with its title, description and a link to
  `/{lang}/designs/design-system`; the page sets its translated `<title>` and description.
- **Edge and error cases:** no card for the auth flow, student, instructor or admin pages (D-13).
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `index lists the design system in every language`.

### ER-08 — The design system page shows every inventory entry

- **Front:** web
- **Behavior:** Given `/{lang}/designs/design-system`, then for every id in
  [design-system-inventory.md](design-system-inventory.md) an element with `data-design-id="<id>"` is
  visible, showing the entry's title, its note and its samples or frames, which match the code by D-08 and the
  `.html` file's entry.
- **Edge and error cases:** entries that need a screen around them (sheets, toasts, tab bars, DS-09-04) are
  drawn in the iOS phone frame (D-03); no entry shows a feature the app doesn't have.
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `design system shows every inventory entry` (pt-br, es and
  en), and the reviewer walking the page in a browser against the `.html` and the component code.

### ER-09 — The design system page follows the page language

- **Front:** web
- **Behavior:** Given `/{lang}/designs/design-system`, then the copy inside the samples and frames is the
  app's copy in that language and the section titles, explanations and notes are in that language: for
  example the ErrorState retry button (DS-09-03) reads "Tentar de novo" on `/pt-br`, the es-ES text on `/es`
  and "Try again" on `/en`.
- **Edge and error cases:** choosing another language in the header's picker opens the same design page in
  that language; interpolated values and plurals are filled (no `{{…}}` or raw tags on the page).
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `design system follows the language`, and
  `apps/web/src/modules/designs/i18n/app-t.test.ts` (interpolation, plurals and rich-text tags).

### ER-10 — The design system page follows the header theme

- **Front:** web
- **Behavior:** Given `/{lang}/designs/design-system`, when the visitor presses the header's theme toggle,
  then every sample and frame switches to the other palette (one theme at a time, no light/dark pairs), and the
  choice is kept on reload like on the other pages.
- **Edge and error cases:** without a stored choice the page follows the OS color scheme; the color swatches
  (DS-01-01) still print both the light and dark value of each token.
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `design system follows the theme toggle` (the computed
  background of the `DS-01-01` `page` swatch and of a phone frame changes between the light and dark token
  values).

### ER-11 — Design pages are wide and never scroll sideways

- **Front:** web
- **Behavior:** Given a 1600 px wide viewport, then the design pages' content is up to 1440 px wide while
  `/{lang}/privacy-policy` keeps its 640 px column; given a 375 px wide viewport, then
  `/{lang}/designs/design-system` has no horizontal scroll and the phone frames are scaled down to fit.
- **Edge and error cases:** the header and footer of the legal pages don't change; the existing e2e tests
  keep passing.
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `design pages are wide` and
  `design pages fit a phone viewport` (`document.documentElement.scrollWidth <= innerWidth`), and the existing
  `apps/web/e2e/*.e2e.ts` suite passing.

## Tasks

### Designs (`.docs/designs`)

- [x] **T-01** — Write `.docs/designs/scripts/unpack.mjs` (an `.html` → `src/<name>/`: the template with
  asset UUIDs replaced by readable file names, the prototype pages, the `.jsx` frames and the file's own
  images; assets shared by every file into `src/_shared/`, de-duplicated by content) and
  `.docs/designs/scripts/pack.mjs` (sources → `.html`, every file or one by name, with `--check` comparing the
  decoded content of each `.html` with its sources), Node only (`node:zlib`, no dependencies), plus
  `.docs/designs/scripts/pack.test.mjs` (`node --test`: round trip on a small fixture bundle, a stale `.html`
  makes `--check` exit 1 naming it, a missing asset makes `pack` exit 1, an `.html` without bundle data makes
  `unpack` exit 1). Unpack all six current files, pack them again, and commit the sources and the repacked
  files; add the commands to `CLAUDE.md` (a "Designs" line under Commands). Covers: ER-01 · Done when:
  `node --test .docs/designs/scripts/*.test.mjs` passes, `node .docs/designs/scripts/pack.mjs --check` exits 0,
  and each repacked `.html` opens in a browser showing the same canvas as before.
  > ✅ 2026-10-28 14:10 — `unpack.mjs`/`pack.mjs` (+ shared `bundle.mjs`) written; the six files unpacked into
  > `src/<name>/{shell.html,template.html,bundle.json,assets}` with `asset://<file>` in place of UUIDs and shared
  > assets (fonts, React, Babel, flags, dc-runtime, iOS/Android frames) de-duplicated in `src/_shared/`; each
  > unpack verifies its own rebuild; all six repacked; `--check` compares the decoded content (not the gzip bytes);
  > files: `.docs/designs/scripts/{bundle,pack,unpack}.mjs`, `.docs/designs/scripts/pack.test.mjs`,
  > `.docs/designs/src/**`, `.docs/designs/{admin-app,auth-flow,design-system,empty-and-error-states,instructor-app,student-app}.html`,
  > `CLAUDE.md`; verified: `node --test .docs/designs/scripts/*.test.mjs` (7 passed),
  > `node .docs/designs/scripts/pack.mjs --check` (6 match, exit 0), design-system.html and student-app.html
  > opened in the browser pane and render their canvas; deviations: `--root <dir>` option added for the tests

- [ ] **T-02** — Bring sections 01–05 of `.docs/designs/src/design-system/` in line with the inventory
  (DS-01-01 to DS-05-03): pt-BR copy from the app's messages, the tokens' current values, the app's icon glyphs
  as inline SVG in the shared icons script (D-09), every entry labelled with its id, light and dark side by
  side; then repack `design-system.html`. Covers: ER-02 · Done when: the file opens in a browser showing every
  entry of sections 01–05 with its id, and `pack.mjs --check` exits 0.

- [ ] **T-03** — Bring sections 06–09 of the design-system sources in line with the inventory (DS-06-01 to
  DS-09-04), merging the loading, empty and error states of `empty-and-error-states` into section 09 (D-11),
  with the Fortaleza mock data (D-10); delete `.docs/designs/empty-and-error-states.html` and
  `.docs/designs/src/empty-and-error-states/`; repack `design-system.html`. Covers: ER-02 · Done when: the file
  opens in a browser showing every entry of sections 06–09 with its id, `grep -rlE "ecrã|Já a seguir|As minhas" .docs/designs/src/design-system`
  finds nothing, the states file is gone and `pack.mjs --check` exits 0.

### App messages (`packages/app-messages`)

- [x] **T-04** — Create `packages/app-messages` (`@rochas-surf-school/app-messages`) set up like
  `packages/shared` (`package.json` with `build`, `check-types` and `test` scripts, `tsconfig.json`,
  `jest.config.ts`); `git mv apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts packages/app-messages/src/`;
  `src/index.ts` exports `enUS`, `esES`, `ptBR`, a `messages` record keyed by `en-US` / `es-ES` / `pt-BR` and the
  `Messages` type; `test/messages.test.ts` checks the three locales have the same keys, naming any difference.
  Covers: ER-03 · Done when: `npm test --workspace @rochas-surf-school/app-messages` and its `check-types` and
  `build` pass.
  > ✅ 2026-10-28 14:40 — created `@rochas-surf-school/app-messages` like `packages/shared`; the three message files moved with
  > `git mv` (content unchanged); `src/index.ts` exports `enUS`, `esES`, `ptBR`, `messages` (keyed `en-US`/`es-ES`/`pt-BR`) and
  > the `Messages` type; `test/messages.test.ts` compares the key sets and names missing/extra keys; files:
  > `packages/app-messages/{package.json,tsconfig.json,jest.config.ts}`, `packages/app-messages/src/{index,en-US,es-ES,pt-BR}.ts`,
  > `packages/app-messages/test/messages.test.ts`, `package-lock.json`; verified: `npm test -w @rochas-surf-school/app-messages`
  > (4 passed), `npm run check-types` and `npm run build` for it (exit 0); deviations: T-04 executed before T-02/T-03 (independent,
  > and the design copy reads from this package); relative imports stay extensionless as in `packages/shared` (CJS output), not
  > `.js`

### Mobile (`apps/mobile`)

- [x] **T-05** — Make `apps/mobile` depend on `@rochas-surf-school/app-messages` and import the messages and
  `Messages` from it in `src/i18n/index.ts` and every other file that imported `./messages/*` (among them
  `src/navigation/stack-header/collapsing-header-title/`); remove `src/i18n/messages/`; update the i18n line of
  `CLAUDE.md` → Layout. Load the `vercel-react-native-skills` and `vercel-react-best-practices` skills first.
  Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills). Covers: ER-04 ·
  Done when: `npm test --workspace @rochas-surf-school/mobile`, its `lint` and `check-types` pass, and the app
  launched in the iOS simulator shows the sign-in screen in Portuguese.
  > ✅ 2026-10-28 15:05 — mobile depends on `@rochas-surf-school/app-messages` and `src/i18n/index.ts` imports `enUS`/`esES`/`ptBR`
  > from it; no other file imported `./messages/*`; `src/i18n/messages/` is gone (moved in T-04); CLAUDE.md Layout updated;
  > files: `apps/mobile/src/i18n/index.ts`, `apps/mobile/package.json`, `package-lock.json`, `CLAUDE.md`; verified:
  > `npm test -w @rochas-surf-school/mobile` (317 suites, 3443 tests passed), `npx turbo run lint check-types --filter=@rochas-surf-school/mobile`
  > (successful); deviations: the iOS-simulator launch was NOT done in this session (covered by `src/i18n/index.test.ts`; to be
  > checked by the user/reviewer)

### Web (`apps/web`)

- [x] **T-06** — Add `@rochas-surf-school/app-messages` to `apps/web`, and write
  `src/modules/designs/i18n/` with the map from the site's locales (`pt-br`, `es`, `en`) to the app's
  (`pt-BR`, `es-ES`, `en-US`) and an `appT(locale, key, params?)` that reads a dotted key, fills `{{name}}`
  values, picks i18next plural suffixes with `Intl.PluralRules`, and renders `<tag>…</tag>` rich text with given
  components; with `app-t.test.ts` (Vitest) covering each of those and a missing key. Covers: ER-09 · Done when:
  `npx vitest run src/modules/designs/i18n` passes in `apps/web`.
  > ✅ 2026-10-28 15:25 — web depends on app-messages; `appT(locale, key, params)` (dotted key, `{{name}}`, plural via
  > `Intl.PluralRules` with `_other` fallback, throws on a missing key) and `appRich` (`<tag>` rich text through given components)
  > written with the site-locale → app-locale map; files: `apps/web/package.json`, `package-lock.json`,
  > `apps/web/src/modules/designs/i18n/{app-locale,app-t,app-t.test}.ts`; verified:
  > `npx vitest run src/modules/designs/i18n` in apps/web (7 passed), `npx tsc --noEmit` (clean); deviations: rich text is a
  > separate `appRich` function (returns ReactNode) next to `appT` (returns string)

- [ ] **T-07** — Add `/designs` and `/designs/:path*` to the matcher in `src/proxy.ts`; restructure
  `src/app/[lang]/` so the design pages get a container up to 1440 px wide while the existing pages keep their
  640 px column (D-15); add `src/app/[lang]/designs/page.tsx` (the index, from a typed list of design pages in
  `src/modules/designs/data/`, with `generateMetadata`) and `src/app/[lang]/designs/[slug]/` or per-page routes
  with `dynamicParams = false`; add the index copy to the three dictionaries and `dictionary.types.ts`; write
  `e2e/designs.e2e.ts` with the redirect, 404, index and width tests. Covers: ER-05, ER-07, ER-11 · Done when:
  those tests and the existing `e2e/*.e2e.ts` pass with `npm run test:e2e --workspace apps/web`.

- [ ] **T-08** — Add the "Designs" row to `src/app/[lang]/page.tsx` (a `LinkRow` after account deletion, a
  Lucide icon) with its title and description in the three dictionaries; add
  `home links to the designs in every language` to `e2e/designs.e2e.ts`. Covers: ER-06 · Done when: that test
  passes.

- [ ] **T-09** — Write the designs' building blocks in `src/modules/designs/components/`: `phone-frame` (iOS,
  402 × 874, status bar, scales down below its width), `design-section` (number and title), `design-entry` (id
  badge, title, note, `data-design-id`), `app-icon` (renders an Ionicons, Feather, FontAwesome, FontAwesome6,
  MaterialCommunityIcons or SimpleLineIcons glyph by set and name, D-09), and the mock components of sections
  04–05 with the mobile names and props: `button`, `header-button`, `text-button`, `text-input`, `text-area`,
  `otp-input`, `checkbox`, `segmented-control`, `step-tabs`, `phone-number-field`, `country-picker`, `chip`;
  each folder per `.claude/rules/react.md`, with a Vitest test rendering its variants. Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices). Covers: ER-08 · Done
  when: `npx vitest run src/modules/designs/components` passes and `npm run check-types --workspace apps/web`
  exits 0.

- [ ] **T-10** — Write the mock components of sections 06–09 the same way: `class-card` (every state of
  DS-06), `class-card-skeleton`, `tab-bar` (student and instructor/admin tabs), `stack-header`,
  `screen-intro`, `user-header`, `calendar-week-row`, `calendar-month-grid`, `week-month-calendar`,
  `bottom-modal`, `toast`, `language-sheet`, `theme-sheet`, `deny-sheet`, `decision-card`, `account-status`,
  `skeleton`, `empty-state`, `error-state`, with the Fortaleza mock data in `src/modules/designs/data/`
  (D-10) and a Vitest test per component. Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices). Covers: ER-08 · Done
  when: `npx vitest run src/modules/designs/components` passes.

- [ ] **T-11** — Write the design system page (`src/modules/designs/pages/design-system/` and its route under
  `src/app/[lang]/designs/`): sections 01–09 with every inventory entry and id, the tokens read from
  `@rochas-surf-school/design-tokens` (swatches printing both values), the app copy through `appT` and the
  section text and notes in the three dictionaries; add the page to the index list; add
  `design system shows every inventory entry`, `design system follows the language`,
  `design system follows the theme toggle` and `design pages fit a phone viewport` to `e2e/designs.e2e.ts`.
  Covers: ER-08, ER-09, ER-10, ER-11 · Done when: `npm run test:e2e --workspace apps/web` passes and the page,
  opened in a browser, matches `design-system.html` entry by entry.

### Verification

- [ ] **T-12** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0 and `check-coverage.mjs` prints
  `COVERAGE OK` and `run-e2e.mjs` prints `E2E PASSED`.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 071` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 071` — every line this spec adds or changes is covered
    (`.docs/designs/**` and `apps/web/src/**` are excluded by technical-context)
  - `node .specs/scripts/run-e2e.mjs 071` — the web Playwright suite passes, including `e2e/designs.e2e.ts`
  - `node --test .docs/designs/scripts/*.test.mjs` — the pack and unpack tests pass
  - `node .docs/designs/scripts/pack.mjs --check` — every `.html` matches its sources
  - `test ! -e .docs/designs/empty-and-error-states.html` — the merged file is gone
  - `npm test --workspace @rochas-surf-school/app-messages` and
    `npx turbo run build check-types --filter=@rochas-surf-school/app-messages` — the package builds, type
    checks and its key-parity test passes
  - `npm test --workspace @rochas-surf-school/mobile` and
    `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — the whole mobile suite passes
  - `npm test --workspace @rochas-surf-school/web` and
    `npx turbo run lint check-types build --filter=@rochas-surf-school/web` — the web tests, lint, type check
    and build pass
- User journeys (followed in a browser or simulator):
  - Open `.docs/designs/design-system.html` in a browser: every inventory entry is there with its id, in pt-BR,
    light and dark side by side; spot-check entries against the component code by D-08.
  - Run the web app, open `/pt-br/designs/design-system`, switch the theme and the language from the header:
    the samples and frames follow both; compare the page with the `.html` entry by entry.
  - Launch the mobile app in the iOS simulator with the phone in Portuguese, English and Spanish: the sign-in
    screen's labels are the same as before.

## Memory Impact

- `memory/product.md` — the public site also hosts the designs (`/{lang}/designs`): "For whom" and Current
  state; Source documents: the design files are edited through `.docs/designs/src/` and the pack script,
  `empty-and-error-states.html` is gone, and the web's designs area reproduces them; drop the stale Out of scope
  line about a light/dark switch on the site (the theme toggle exists since spec 024).
- `memory/technical-context.md` — Applications → `apps/web`: the `/designs` routes, the wide layout,
  `src/modules/designs/` (app-copy helper, mock components, icon packages) and the new dependency on
  `app-messages`; Applications → `apps/mobile`: the messages come from `@rochas-surf-school/app-messages`; a new
  `packages/app-messages` entry; the `.docs/designs` sources and pack commands; Coverage keeps the
  `.docs/designs/**` line added while planning.
- `memory/structure.md` — `packages/app-messages`, `.docs/designs/{scripts,src}`, `apps/web/src/modules/designs/`
  and the `src/app/[lang]/designs/` routes; `apps/mobile/src/i18n/messages/` removed.
- `memory/modules.md` — None (no business module changes).

## Assumptions

- The vendor assets inside the current bundles (React 18 UMD, Babel standalone, the `x-dc` runtime, the fonts)
  may be committed in the repository as they are, about 4.5 MB once; the user accepted this while planning.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)
- [Design system inventory](design-system-inventory.md)

## Amendments

## Review
