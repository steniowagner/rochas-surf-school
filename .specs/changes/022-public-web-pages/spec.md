---
id: "022"
slug: public-web-pages
title: Privacy policy and account deletion pages
status: in-progress
created: 2026-10-12
started: 2026-10-12
base_commit: 9bf05d07ed8b0121f5c1a7d145f4bd71f69e2657
fronts: [web]
depends_on: []
---

# 022 — Privacy policy and account deletion pages

## Goal

Publish the two public web pages the App Store and Google Play require — a privacy policy, and a page that
explains how to delete an account, with the school's WhatsApp number for people who no longer have the app —
each in Brazilian Portuguese, Spanish and English. They are built with the design system and the patterns the
mobile app already uses (the auth flow's header and language pill, `ScreenIntro`, `ChoiceRow`, the
closed-account screens), so the site reads as part of the same product. The web app's framework template code
goes away in the same change.

## Context

- Product: [product.md](../../memory/product.md) — "The only web surface is a small public site with the
  privacy policy and the account-deletion page"; decisions "Deleting and removing are different" and "Erasure
  keeps the school's history without the person" (what the deletion page must explain).
- Requirements: [requirements.md → 6.1 Public web pages](../../../.docs/requirements.md#61-public-web-pages)
  — both pages, public, in pt-BR, es and en;
  [Privacy policy page](../../../.docs/requirements.md#privacy-policy-page) — what is collected, why, how long,
  which services, deleted accounts erased after 30 days;
  [Account deletion page](../../../.docs/requirements.md#account-deletion-page) — in-app steps, the school's
  WhatsApp number, what is erased, what is kept without a name, when;
  [Handling deletion requests from the page](../../../.docs/requirements.md#handling-deletion-requests-from-the-page)
  — admins remove the account (the page says so; the admin tool is not built here);
  [Page languages](../../../.docs/requirements.md#page-languages) — the whole page in the chosen language;
  [Erasure](../../../.docs/requirements.md#erasure) — the facts the deletion page states.
- Technical: [technical-context.md](../../memory/technical-context.md) — Applications (`apps/web`: Next.js 16,
  Tailwind 4, "no sign-in, no private area and no API calls", no test runner), Fixed conventions (Design
  system, Template code, Languages), Coverage (`apps/web/src/**` is excluded: checked in a browser), Deployment
  (not decided).
- Design: `.docs/designs/design-system.html` — 02 typography, 03 shape and space (20px screen margin, 12px
  between cards, 22px between groups, Lucide icons with stroke 2, 44px touch targets), 08 rules (one primary
  action per screen, grape only for highlights, light and dark themes); `.docs/designs/auth-flow.html` — the
  sign-in header with the sun tile and the language pill.
- Existing code this builds on:
  - `apps/web/src/app/{layout.tsx,page.tsx,globals.css}` — the root layout with the Barlow Condensed and Nunito
    fonts, a design-token preview page (template), and the token → Tailwind mapping.
  - `apps/web/src/components/ui/{button,chip}.tsx` — the web design-system components (flat files, not yet in
    the folder layout of `.claude/rules/react.md`).
  - `packages/shared` — `PhoneNumberRule` (E.164, accepted by `libphonenumber-js`), already a web dependency.
  - Mobile references for the visual pattern: `apps/mobile/src/modules/auth/components/auth/auth.component.tsx`
    (sun tile with the waves icon, language pill: flag, acronym, chevron),
    `apps/mobile/src/modules/auth/components/language-sheet/` (list of flag, native name, check on the current
    one), `apps/mobile/src/components/ui/screen-intro/`, `apps/mobile/src/modules/auth/components/choice-row/`,
    `apps/mobile/src/components/account-status/` (cards, "Falar com a escola"), and
    `apps/mobile/src/i18n/locales.ts` (`localeNames`, `localeAcronyms`, `localeFlags`, `resolveAppLocale`).
  - Next.js 16 docs bundled in `node_modules/next/dist/docs/01-app/02-guides/internationalization.md` (`app/[lang]`,
    `proxy.ts`, dictionaries) — `apps/web/AGENTS.md` says to read them before writing code.

## Scope

### In scope

- The privacy policy page and the account deletion page, each in pt-BR, es and en, with their copy.
- A home page per language linking both pages.
- Language in the URL, a language picker on every page, and redirects of unprefixed URLs by the browser's
  language.
- The school's WhatsApp number from build-time configuration, validated at build.
- Removing the web template code (design-token preview, stock `public/*.svg`, template README content) and
  moving the existing web components into the folder layout of `.claude/rules/react.md`.

### Out of scope

- Deploying the site, choosing a host or a domain, and filling in the App Store / Google Play listings — a
  later spec.
- The link to the privacy policy from the mobile app (mobile work; the "Opening the policy from the app"
  scenario stays open).
- Building in-app account deletion, an admin removing an account, or the 30-day erasure of deleted and removed
  accounts — the pages describe them; their own specs build them.
- Reading the WhatsApp number from the backend, or any API call from web.
- A terms-of-use page (product.md: the school rules play that role).
- A final legal review of the copy, and the school's legal identifiers (CNPJ, legal name, data-protection
  officer) — see Assumptions.
- Automated tests for web (no runner; `apps/web/src/**` is excluded from coverage), cookie banners and
  analytics (the site sets no cookies and has no tracking).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | URLs are `/{lang}/privacy-policy`, `/{lang}/account-deletion` and `/{lang}`, with `lang` one of `pt-br`, `es`, `en` (lowercase) and English slugs in every language. All pages are statically generated (`generateStaticParams`); `dynamicParams = false`, so any other `lang` answers 404. | One stable link pattern for the stores and the app; the app can link straight to its own language; slugs don't move when copy is translated. |
| D-02 | `apps/web/src/proxy.ts` (Next 16's replacement for middleware) redirects `/`, `/privacy-policy` and `/account-deletion` with 307 to the same path under the language picked from `Accept-Language`: the first entry, in quality order, whose ISO 639 language code is `pt`, `es` or `en` (pt-PT → `pt-br`, es-MX → `es`, en-GB → `en`), like mobile's `resolveAppLocale`; **pt-BR when none matches or the header is missing**. Hand-written, no dependency. Paths that already carry a locale, `_next` and static files pass through. | Store listings get one URL that adapts to each visitor. The fallback is pt-BR (the user's choice, unlike mobile's en-US) because the school and most visitors are in Brazil. |
| D-03 | The root layout lives in `app/[lang]/layout.tsx` and sets `<html lang>` to `pt-BR`, `es` or `en` and a translated `<title>` and `description` per page. | Screen readers and search engines read the right language; each page has its own title in the browser tab. |
| D-04 | Copy lives in typed dictionaries, `apps/web/src/i18n/dictionaries/{pt-br,es,en}.ts`, each satisfying one `Dictionary` type (`src/i18n/dictionary.types.ts`), loaded server-side by `getDictionary(lang)`. No text is hard-coded in components. | A missing or extra key fails `check-types`, which is how "the whole page in Spanish" is enforced without a test runner; a legal reviewer edits text only. |
| D-05 | The policy's copy is complete, written by this spec from the requirements and the memory — no lorem ipsum or unfinished markers. Providers already chosen are named: Google (sign-in; Maps for class locations), Apple (sign-in), Resend (sign-in code emails), Expo (push notifications). Providers not chosen yet are described by category: the cloud host of the app and database, an AI language model provider that receives only class details and the rule text, and S3-compatible photo storage. | The stores need a real policy; naming undecided providers would be wrong, and a category is accurate today. The provider specs update the copy when they choose. |
| D-06 | The data controller is "Rocha's Surf School", with the school's WhatsApp number as the privacy contact. No CNPJ, legal name or encarregado. | The user has no legal identifiers to give yet; the LGPD review adds them (Assumptions). |
| D-07 | The WhatsApp number comes from the server-only variable `SCHOOL_WHATSAPP_NUMBER` (E.164, e.g. `+5585999999999`), read by `apps/web/src/config/school-whatsapp.ts`, which validates it with the shared `PhoneNumberRule` and throws an error naming the variable when it is missing or invalid — so prerendering the deletion page fails `next build`. The page shows it formatted with `libphonenumber-js` `parsePhoneNumber(...).formatInternational()` and links it to `https://wa.me/<digits without +>`. Documented in `apps/web/.env.example`. | Web must not call the API (technical-context.md). Failing the build means a site without a valid number can't ship. |
| D-08 | The site needs a Node runtime (`next build && next start`, or a platform that runs Next such as Vercel) because of the proxy; static export is not used. No host-specific config is added. | Deployment is decided by its own spec; the code shouldn't presume a host. |
| D-09 | Visual pattern, following the auth flow and the mobile app: (a) a header with the 44px `bg-sun` tile with the waves icon (the brand mark of the sign-in screen) linking to `/{lang}`, and a language pill (flag, acronym `PT`/`ES`/`EN`, chevron) that opens a list of the three languages (flag, native name — Português, Español, English — and a check on the current one), like `LanguageSheet`, built with `<details>`/`<summary>` so it works without JavaScript; each option links to the same page in that language; (b) each page opens with a web `ScreenIntro` (same name and props as mobile: icon tile `bg-sand` by default, optional eyebrow, `ds-text-screen-title`, `ds-text-body` description); (c) content sections are cards (`bg-surface`, `rounded-card`, `border border-line`) with a `ds-text-section-label` heading and `ds-text-body` text; (d) 20px screen margin, 12px between cards, 22px between groups, content column at most 640px wide and centered; (e) one primary action per screen: on the deletion page, the `primary` (sun) `Button` "Falar com a escola no WhatsApp" (es "Hablar con la escuela por WhatsApp", en "Message the school on WhatsApp") linking to `wa.me`; the privacy page and the home page have none; (f) the home rows copy `ChoiceRow` (48px `bg-sand` icon tile with a `text-grape` icon, list title and subtitle, chevron). | The user asked for the site to follow the design system, the auth-flow designs and the mobile app. |
| D-10 | Icons come from `lucide-react` with stroke width 2: `Waves` (brand tile), `ShieldCheck` (privacy), `UserX` (account deletion), `MessageCircle` (WhatsApp button), `ChevronDown` (language pill), `ChevronRight` (home rows), `Check` (current language). | Section 03 of the design system specifies Lucide with stroke 2; mobile's icon set is React Native only. |
| D-11 | Web components follow `.claude/rules/react.md` (one folder per component: `*.component.tsx`, `*.types.ts`, `index.ts`, `*.hook.ts` only when needed). `Button` and `Chip` move into `components/ui/button/` and `components/ui/chip/` with unchanged class names; `Button` gains an optional `href` and then renders an `<a>` with the same classes. | Every component written or touched follows the rule. A web link must be an anchor; this is the one deliberate difference from mobile's `Button`. |
| D-12 | The in-app steps on the deletion page read "Perfil → Excluir conta" (es "Perfil → Eliminar cuenta", en "Profile → Delete account"), followed by the confirmation. | In-app deletion isn't designed yet; the profile spec uses this path or updates this copy (Assumptions). |

## Expected Results

### ER-01 — Privacy policy page in each language

- **Front:** web
- **Behavior:** Given the site is built with a valid `SCHOOL_WHATSAPP_NUMBER` and started, when someone opens
  `/pt-br/privacy-policy`, `/es/privacy-policy` or `/en/privacy-policy`, then the server answers 200 with
  `<html lang>` `pt-BR`, `es` or `en` and a `<title>` in that language, and the page shows, in that language:
  what the app collects (name, email, photo, WhatsApp number, sign-in identities, class requests and
  attendance, ratings and comments, photos, push tokens, the language chosen); why; how long it's kept —
  including that deleted accounts are erased 30 days after deletion, removed accounts and denied registrations
  30 days after the removal or denial, guest data 30 days after the class; the services that handle it, named
  or by category per D-05, with the language model receiving only class details; the controller and contact
  per D-06 (the formatted WhatsApp number); and a "Last updated" date.
- **Edge and error cases:** `/fr/privacy-policy` and `/pt/privacy-policy` answer 404.
- **Verify by:** with the site running (`npm run build && npm run start` in `apps/web`):
  `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/es/privacy-policy` prints `200`, and
  `…/fr/privacy-policy` prints `404`; then a browser journey on each of the three URLs checks every item
  listed above.

### ER-02 — Account deletion page explains deletion and gives the school's WhatsApp number

- **Front:** web
- **Behavior:** Given the site is built with `SCHOOL_WHATSAPP_NUMBER=+5585999999999`, when someone opens
  `/{lang}/account-deletion` (any of the three), then the page shows, in that language: how to delete the
  account in the app (D-12, after a confirmation); that people without the app can ask the school on WhatsApp,
  with the number shown as `+55 85 99999 9999` (`formatInternational`) and the primary button linking to
  `https://wa.me/5585999999999`; that an admin carries out the request by removing the account; what is erased
  (name, email, photo, WhatsApp number, comments) and what stays without a name (star ratings; classes and
  photos show "Former student" / "Former instructor" in the person's place, in the page's language); and that
  erasure happens 30 days after the deletion or removal.
- **Edge and error cases:** the page has exactly one primary (sun) button; an unknown `lang` answers 404.
- **Verify by:** browser journey on `/pt-br/account-deletion`, `/es/account-deletion` and
  `/en/account-deletion` checking every item above; `curl -s http://localhost:3000/en/account-deletion | grep -c 'href="https://wa.me/5585999999999"'`
  prints at least `1`.

### ER-03 — Unprefixed URLs open in the browser's language

- **Front:** web
- **Behavior:** Given the site is running, when a request for `/`, `/privacy-policy` or `/account-deletion`
  arrives, then the server answers 307 with `Location` set to the same path under the language picked by D-02.
- **Edge and error cases:** `Accept-Language: es-MX,es;q=0.9` → `/es/…`; `en-GB` → `/en/…`;
  `fr-FR,en;q=0.5` → `/en/…`; `fr-FR` alone, `de`, or no header → `/pt-br/…`; `pt-PT` → `/pt-br/…`; a path that
  already has a locale (`/es/privacy-policy`) is not redirected; `/_next/…` and files in `public/` are not
  redirected.
- **Verify by:** `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" -H "Accept-Language: es-MX,es;q=0.9" http://localhost:3000/privacy-policy`
  (prints `307 http://localhost:3000/es/privacy-policy`), repeated with each header value and path of the cases above; each prints `307` and the expected URL (and `200` for `/es/privacy-policy`).

### ER-04 — Language picker switches the whole page

- **Front:** web
- **Behavior:** Given someone is on `/pt-br/privacy-policy`, when they open the language pill and choose
  "Español", then `/es/privacy-policy` opens and every visible text (header, intro, sections, footer, `<title>`)
  is in Spanish, and the list marks Español with a check; the same holds on the deletion and home pages and for
  every pair of languages.
- **Edge and error cases:** the picker works with JavaScript disabled; the pill shows the current language's
  flag and acronym; a dictionary missing a key or with an extra one makes `check-types` fail.
- **Verify by:** browser journey on each page, switching through the three languages (and once with
  JavaScript disabled); remove one key from `src/i18n/dictionaries/es.ts` locally and confirm
  `npx turbo run check-types --filter=@rochas-surf-school/web` fails, then restore it.

### ER-05 — Build refuses a missing or invalid WhatsApp number

- **Front:** web
- **Behavior:** Given `SCHOOL_WHATSAPP_NUMBER` is unset, when `npm run build` runs in `apps/web`, then the build
  exits non-zero and its output names `SCHOOL_WHATSAPP_NUMBER`.
- **Edge and error cases:** `85999999999` (no `+` country code), `+55 85 99999-9999` (spaces and dash) and
  `+5512` (too short) fail the same way; `+5585999999999` builds.
- **Verify by:** `SCHOOL_WHATSAPP_NUMBER= npm run build` and `SCHOOL_WHATSAPP_NUMBER=85999999999 npm run build`
  in `apps/web` exit non-zero with the variable named in the output; `SCHOOL_WHATSAPP_NUMBER=+5585999999999 npm run build`
  exits 0.

### ER-06 — Home page links both pages

- **Front:** web
- **Behavior:** Given someone opens `/{lang}`, then they see the school's name, a short description of the
  site, and two rows — privacy policy and account deletion — each with icon, title, description and chevron,
  linking to `/{lang}/privacy-policy` and `/{lang}/account-deletion`.
- **Edge and error cases:** the brand tile in the header of every page links to `/{lang}`.
- **Verify by:** browser journey on `/en`, `/es` and `/pt-br`, following both rows and the header tile.

### ER-07 — Template code is gone

- **Front:** web
- **Behavior:** Given the change is applied, then `apps/web` has no design-token preview page
  (`src/app/page.tsx` is gone; `/` only redirects), no stock `public/{file,globe,next,vercel,window}.svg`, and
  `apps/web/README.md` describes this site (what it serves, the env var, how to run it) instead of the
  create-next-app text.
- **Edge and error cases:** nothing references the removed files (`npx turbo run build --filter=@rochas-surf-school/web` passes).
- **Verify by:** `ls apps/web/public apps/web/src/app` and `grep -c "create-next-app" apps/web/README.md`
  (prints `0`).

### ER-08 — Pages follow the design system

- **Front:** web
- **Behavior:** Given any of the nine pages, then: colors, fonts, radii and shadows come only from the token
  utilities and `ds-text-*` classes; the page follows the system's light or dark theme; every link and button
  (language pill and options, home rows, header tile, the WhatsApp button) is at least 44px tall; and at 375px
  width there is no horizontal scroll.
- **Edge and error cases:** long words in Spanish and Portuguese wrap inside the cards; grape is used only for
  highlights (icon accents), never for body text or backgrounds of whole sections.
- **Verify by:** `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|font-family|\[[0-9.]+px\]" apps/web/src --include=*.tsx`
  shows no color or font literals (spacing in `[...px]` is allowed only for the design system's 20/22px values);
  in the browser at 375×812, light and dark, `document.documentElement.scrollWidth <= window.innerWidth` on
  every page, and every `a, button, summary` has `getBoundingClientRect().height >= 44`.

## Tasks

### Web (`apps/web`)

- [x] **T-01** — Remove the template: delete `src/app/page.tsx` and `public/{file,globe,next,vercel,window}.svg`,
  rewrite `README.md` for this site, and move `src/components/ui/button.tsx` and `chip.tsx` into
  `src/components/ui/button/` and `src/components/ui/chip/` (`*.component.tsx`, `*.types.ts`, `index.ts`, per
  `.claude/rules/react.md`), with `Button` gaining an optional `href` that renders an `<a>` with the same
  classes (D-11). Add `lucide-react` as a dependency (D-10).
  Covers: ER-07 · Done when: `npx turbo run lint check-types --filter=@rochas-surf-school/web` passes and the
  `ls`/`grep` in ER-07's Verify by show the files gone and no create-next-app text.
  > ✅ 2026-10-12 — template removed, components moved, `Button` renders an `<a>` with an `href`; files:
  > `apps/web/src/app/page.tsx` (deleted), `apps/web/public/{file,globe,next,vercel,window}.svg` (deleted),
  > `apps/web/README.md`, `apps/web/src/components/ui/button/{button.component.tsx,button.types.ts,index.ts}`,
  > `apps/web/src/components/ui/chip/{chip.component.tsx,chip.types.ts,index.ts}`, `apps/web/package.json`,
  > `package-lock.json` (`lucide-react`, `libphonenumber-js` — the latter is T-05's dependency, added here with
  > the other install); verified: `npm run check-types` and `npm run lint` in `apps/web` pass (after clearing the
  > stale `.next` types of the deleted page), `ls apps/web/public` → missing, `grep -c create-next-app
  > apps/web/README.md` → `0`; deviations: none

- [ ] **T-02** — Locales and routing: `src/i18n/locales.ts` (`locales = ["pt-br", "es", "en"]`, `defaultLocale
  = "pt-br"`, `hasLocale`, `matchLocale(acceptLanguage)` per D-02, the `<html lang>` value, native names,
  acronyms and flags), `src/i18n/dictionary.types.ts` and `src/i18n/get-dictionary.ts` with the three
  dictionaries holding the shared strings (site name, header, language picker, footer); move the root layout to
  `src/app/[lang]/layout.tsx` (fonts, `<html lang>`, `generateStaticParams`, `dynamicParams = false`,
  `generateMetadata`); add `src/proxy.ts` with the redirects of D-02 and its `matcher`. Read the bundled Next 16
  docs first (`internationalization.md`, `proxy`).
  Covers: ER-03, ER-04 · Done when: `npm run build && npm run start` in `apps/web`, and every `curl` case of
  ER-03 prints the expected status and URL.

- [ ] **T-03** — Shared layout and home page: components `site-header` (brand tile linking to `/{lang}` +
  `language-picker`), `language-picker` (`<details>` pill and list, D-09a), `screen-intro`, `content-card` and
  `link-row` under `src/components/`, each per `.claude/rules/react.md`; the header in `[lang]/layout.tsx`; and
  `src/app/[lang]/page.tsx` with the home content (D-09f) and its strings in the three dictionaries.
  Covers: ER-04, ER-06, ER-08 · Done when: in the browser, `/es` shows the home in Spanish with both rows, the
  picker switches to `/en` and `/pt-br` (also with JavaScript off), and at 375px there is no horizontal scroll
  and the pill, its options and the rows are at least 44px tall.

- [ ] **T-04** — Privacy policy page: `src/app/[lang]/privacy-policy/page.tsx` (with `generateMetadata`) built
  from `ScreenIntro` (`ShieldCheck`) and content cards, and the full policy copy of ER-01 in
  `src/i18n/dictionaries/{pt-br,es,en}.ts` (D-05, D-06).
  Covers: ER-01, ER-08 · Done when: the three URLs answer 200, `/fr/privacy-policy` answers 404, and the browser
  journey of ER-01 finds every listed item in each language.

- [ ] **T-05** — WhatsApp config and account deletion page: `src/config/school-whatsapp.ts` (D-07, using
  `PhoneNumberRule` from `@rochas-surf-school/shared` and `libphonenumber-js`, added as a dependency),
  `SCHOOL_WHATSAPP_NUMBER` in `apps/web/.env.example` (and a local `.env` value);
  `src/app/[lang]/account-deletion/page.tsx` (with `generateMetadata`) built from `ScreenIntro` (`UserX`),
  content cards and the primary `Button` with `href` to `wa.me` (D-09e); the copy of ER-02 in the three
  dictionaries (D-12); the privacy policy's contact (T-04) reads the same config.
  Covers: ER-02, ER-05, ER-08 · Done when: the three builds of ER-05's Verify by behave as stated, and the
  browser journey and `curl | grep` of ER-02 pass.

### Verification

- [ ] **T-06** — Run every command in the Verification Plan from the repo root, and follow the user journeys;
  all pass. Record the output summary as evidence.
  Covers: all · Done when: every automated command exits 0 and each journey's observations are recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 022` — the tests related to the change pass (web has no runner,
    so it is expected to find none for `apps/web`).
  - `node .specs/scripts/check-coverage.mjs 022` — every line this spec adds or changes is covered
    (`apps/web/src/**` is excluded by technical-context.md → Coverage).
  - `node .specs/scripts/run-e2e.mjs 022` — runs the e2e suites of the apps this spec touches (none is declared
    for web).
  - `SCHOOL_WHATSAPP_NUMBER=+5585999999999 npx turbo run lint check-types build --filter=@rochas-surf-school/web`
    — no errors.
  - ER-05's three builds — two fail naming `SCHOOL_WHATSAPP_NUMBER`, one passes.
  - With the site running (`npm run start` in `apps/web`), the `curl` checks of ER-01, ER-02 and ER-03 print the
    expected status codes, `Location` URLs and the `wa.me` link.
  - ER-07's `ls` and `grep`, and ER-08's `grep` for color and font literals.
  - ER-04's dictionary check: removing a key from `es.ts` fails `check-types` (then restored).
- User journeys (in a browser, against `npm run start`):
  - ER-01 and ER-02 on each of the three languages, checking every listed item of the copy.
  - ER-04: switching languages on each page with the pill, also with JavaScript disabled.
  - ER-06: the home page in each language, both rows and the header tile.
  - ER-08: every page at 375×812 and at desktop width, in light and dark, with the `scrollWidth` and 44px checks.

## Memory Impact

- `memory/structure.md` — the `apps/web` section: `src/app/[lang]/{layout,page}.tsx`, `privacy-policy/`,
  `account-deletion/`, `src/proxy.ts`, `src/i18n/`, `src/config/school-whatsapp.ts`, `src/components/` and
  `components/ui/{button,chip}/`; the pages now exist.
- `memory/technical-context.md` — Applications → `apps/web`: language in the URL (`pt-br`/`es`/`en`), the proxy
  redirect by `Accept-Language` with pt-BR fallback, typed dictionaries (copy changes are text-only),
  `SCHOOL_WHATSAPP_NUMBER` validated at build, `lucide-react`, `libphonenumber-js`, needs a Node runtime (no
  static export); Fixed conventions → Template code: web's template removed; External integrations: note that
  the privacy policy names the providers, so a spec that chooses a provider (hosting, language model, photo
  storage) updates the policy copy.
- `memory/product.md` — Current state: the public pages exist (not deployed yet); Relevant product decisions:
  the deletion page sends people without the app to the school's WhatsApp, and the site's number is a build-time
  copy of the school setting.

## Assumptions

- Someone familiar with LGPD reviews the policy and the deletion page before launch (requirements §6), and adds
  the school's legal identifiers (legal name, CNPJ, data-protection officer) then; until that review the copy
  names only "Rocha's Surf School" and the WhatsApp contact.
- When an admin changes the school's WhatsApp number in the app, the site keeps the old one until
  `SCHOOL_WHATSAPP_NUMBER` is updated and the site rebuilt.
- The future profile spec places account deletion at "Perfil → Excluir conta", or updates the deletion page copy.
- The pages describe in-app deletion, admin removal and 30-day erasure of deleted and removed accounts before
  those are built; they are built before the app launches.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
