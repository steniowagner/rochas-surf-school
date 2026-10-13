---
id: "023"
slug: terms-and-lgpd-privacy
title: Terms of use page and an LGPD-complete privacy policy
status: in-progress
created: 2026-10-13
started: 2026-10-13
base_commit: 82427a24d8fc63dc0541f384c1c8f4ff5a3c37c9
fronts: [web]
depends_on: []
---

# 023 — Terms of use page and an LGPD-complete privacy policy

## Goal

Add a terms of use page to the public site, in Brazilian Portuguese, Spanish and English, and rework the
privacy policy so it says everything LGPD requires and matches what App Store Connect and Google Play's Data
safety form will declare: the controller's legal name, the data protection contact (encarregado), the legal
basis of each purpose, every retention period, transfers abroad, that the app is for adults only, and people's
full rights. It extends the site spec 022 built — same URLs, language routing, dictionaries and visual
pattern — so the stores and Apple's guideline 1.2 (user-generated content) find a policy and terms specific to
this app.

## Context

- Product: [product.md](../../memory/product.md) — Out of scope currently says "A terms-of-use page; the school
  rules play that role inside the app" (reversed by D-02); concepts **Sign-in code** (expires in 10 minutes),
  **Guest** (name and WhatsApp number entered by an admin, erased 30 days after the class), the account
  statuses and their 30-day erasures, **School rules**, and the decisions "Erasure keeps the school's history
  without the person", "Guests get nothing from the app and leave no trace", "Text written by admins is shown
  as written".
- Requirements: [requirements.md → 6.1 Public web pages](../../../.docs/requirements.md#61-public-web-pages) —
  the public pages the stores require, in pt-BR, es and en;
  [Privacy policy page](../../../.docs/requirements.md#privacy-policy-page) — what is collected, why, how long,
  which services, deleted accounts erased after 30 days;
  [Page languages](../../../.docs/requirements.md#page-languages) — the whole page in the chosen language (now
  three pages). The terms of use page is new: spec-finish adds it to §6.1.
- Technical: [technical-context.md](../../memory/technical-context.md) — Applications → `apps/web` (Next.js 16,
  Tailwind 4, no API calls, no test runner), Authentication (refresh token valid 30 days after its last use,
  sliding; `SignOut` deletes the device's push token), Coverage (`apps/web/src/**` excluded: checked in a
  browser), External integrations (the policy names the providers), Deployment (not decided).
- Prior spec: [022-public-web-pages](../../finished/20261013000213-022-public-web-pages/spec.md) — its decisions
  D-01 (URLs), D-02 (proxy redirect by `Accept-Language`, pt-BR fallback), D-03 (`<html lang>` and metadata),
  D-04 (typed dictionaries), D-07 (`SCHOOL_WHATSAPP_NUMBER`), D-08 (Node runtime), D-09/D-10 (visual pattern,
  Lucide icons) and D-11 (component folders) still bind this spec.
- Existing code this builds on:
  - `apps/web/src/app/[lang]/privacy-policy/page.tsx` — the policy page: `ScreenIntro` (`ShieldCheck`), a "Last
    updated" line and seven `ContentCard`s rendered from `privacyPolicy` in the dictionaries.
  - `apps/web/src/app/[lang]/page.tsx` — the home page with two `LinkRow`s.
  - `apps/web/src/app/[lang]/account-deletion/page.tsx` — the deletion page (unchanged; a link
    target).
  - `apps/web/src/i18n/dictionary.types.ts`, `apps/web/src/i18n/dictionaries/{pt-br,es,en}.ts` — every string of
    the site; a missing or extra key fails `check-types`.
  - `apps/web/src/config/school-whatsapp.ts` — the pattern for build-time config: reads a server-only variable,
    validates it with a shared rule and throws an error naming the variable, so prerendering fails `next build`.
  - `apps/web/src/proxy.ts` — redirects `/`, `/privacy-policy`, `/account-deletion` (its `matcher`).
  - `packages/shared/src/validation/rules/email.rule.ts` — `EmailRule`, already reachable from web through
    `@rochas-surf-school/shared`.
  - Next.js 16 docs bundled in `apps/web/node_modules/next/dist/docs/` (or the root `node_modules`) —
    `apps/web/AGENTS.md` says to read the relevant guide before writing code.

## Scope

### In scope

- A terms of use page at `/{lang}/terms-of-use` in pt-BR, es and en, with its copy (D-06).
- The privacy policy's copy and sections reworked in the three languages (D-05).
- The school's legal name, optional CNPJ and the encarregado's name and email from build-time configuration,
  validated at build (D-03).
- Navigation: a third row on the home page, cross-links between the three pages, and the redirect of the
  unprefixed `/terms-of-use` by browser language.

### Out of scope

- Deploying the site (host, domain, Google's consent screen and the store listings) — a quick spec right after
  this one.
- Linking the terms or the policy from the mobile app, including the onboarding line spec 012 left out.
- A report button for objectionable content in the app (accepted risk; the terms send reports to WhatsApp).
- The admin tool that removes an account, and the 30-day erasure of deleted and removed accounts and of guest
  data — the pages describe them; their own specs build them.
- Changes to the account deletion page's copy.
- A final legal review of the copy (see Assumptions).
- Automated tests for web (no runner; `apps/web/src/**` is excluded from coverage), cookie banners and
  analytics (the site still sets no cookies and has no tracking).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Spec 022's decisions still hold. The terms page lives at `/{lang}/terms-of-use` (English slug in every language), statically generated under `app/[lang]` like the others (so an unknown `lang` answers 404), with its own translated `<title>` and `description`, and `FileText` (Lucide, stroke 2) as its `ScreenIntro` and home-row icon. | One link pattern for the stores and the app; nothing about routing or the visual pattern changes. |
| D-02 | The site gets a terms of use page, reversing product.md's "A terms-of-use page; the school rules play that role inside the app". The school rules keep governing conduct at the school; the terms govern the app (accounts, user content, payments, what the app is not). | Apple guideline 1.2 asks apps with user content for terms that forbid objectionable content and say how it is handled; the school rules are written by admins and can't be relied on to say that. |
| D-03 | Legal identity comes from server-only build-time variables, read by `apps/web/src/config/school-legal.ts` (same pattern as `school-whatsapp.ts`): `SCHOOL_LEGAL_NAME` (required, non-blank after trimming), `SCHOOL_CNPJ` (optional; when set, 14 digits after removing `.`, `/` and `-`, with valid check digits; shown as `00.000.000/0000-00`; when unset or empty, no CNPJ line is shown), `DPO_NAME` (required, non-blank), `DPO_EMAIL` (required, valid by the shared `EmailRule`, shown as a `mailto:` link). A missing or invalid value throws an error naming the variable, so `next build` fails. All four are documented in `apps/web/.env.example` (with example values) and in `apps/web/README.md`. | LGPD Art. 41 requires the encarregado's identity and contact to be public; failing the build means a site with a missing value can't ship, and real values change without a code change. |
| D-04 | All copy is drafted by this spec from `.docs/` and the memory — complete, no placeholder or unfinished markers — in the three languages. The policy's "Last updated" date (and the terms') is the date the executing task writes the copy. "Rocha's Surf School" stays the name used in text; the legal name appears where the controller is identified. | Final copy isn't available; a lawyer or the school reviews this draft before the store submission (Assumptions). |
| D-05 | The privacy policy page shows, in this order, one `ContentCard` each: (1) **Who is responsible** — "Rocha's Surf School", the legal name, the formatted CNPJ when set, and the WhatsApp contact (formatted, linked to `wa.me`); (2) **Data protection contact (encarregado)** — `DPO_NAME` and `DPO_EMAIL` as a `mailto:` link; (3) **What we collect** — name, email, photo; WhatsApp number and whether the person agrees to show it to others at the school; sign-in identities (Google or Apple account, or the sign-in code's email); class requests and attendance; star ratings and comments; class photos the person appears in or uploads; the device's push token; the language chosen; and guest data (name and WhatsApp number of someone without an account, entered by an admin); (4) **Why and on what legal basis** — each purpose with its LGPD basis: account, approval of the registration, classes, attendance, ratings and comments, notices in the app → performance of a contract (Art. 7, V); push notifications and showing the WhatsApp number to others → consent (Art. 7, I), withdrawable in the phone's or the app's settings; keeping ratings and the school's class history without the person's name after erasure, and guest data for the class they attend → legitimate interest (Art. 7, IX); (5) **Who handles the data** — Google (sign-in; Maps for class locations), Apple (sign-in), Resend (sign-in code emails: email and code), Expo (push: device token and notification text), a cloud host for the app and database, an AI language model service receiving only the class details and the rule text — never personal data, and an S3-compatible photo storage service; (6) **Transfers outside Brazil** — these services may process data in other countries, under the safeguards LGPD Art. 33 allows (contractual clauses and the providers' own commitments); (7) **How long we keep it** — sign-in codes 10 minutes; sessions 30 days after the last use; push token until sign-out on that device or the account is erased; account data while the account exists; deleted account → erased 30 days after deletion (reactivation can be requested meanwhile); removed account → 30 days after removal; denied registration → 30 days after denial; guest name and WhatsApp number → 30 days after the class finishes or is cancelled; after erasure star ratings stay without a name and classes and photos show "Former student" / "Former instructor" (in the page's language); (8) **How we protect it** — encrypted connections (HTTPS), access limited by role, sign-in without passwords; (9) **Adults only** — the app is for people 18 or older; no accounts for minors; an account found to belong to a minor is removed and erased; (10) **Your rights** — the LGPD Art. 18 rights listed (confirmation that data is processed, access, correction, anonymization, blocking or deletion of unnecessary data, portability, deletion of data processed with consent, information about who it is shared with and about refusing consent, withdrawing consent), how to exercise them (email the encarregado or message the school on WhatsApp), and the right to complain to the ANPD (Autoridade Nacional de Proteção de Dados); (11) **Deleting your account** — one sentence and a link to `/{lang}/account-deletion`; (12) **Terms of use** — a link to `/{lang}/terms-of-use`; (13) **This website** — no cookies, no tracking or analytics; (14) **Changes to this policy** — a new version is published on this page with a new "Last updated" date. | The user's list of contents plus what LGPD requires of a complete policy (Arts. 7, 9, 18, 33, 41, 46); naming undecided providers would be wrong (022 D-05). |
| D-06 | The terms of use page shows, in this order, one `ContentCard` each: (1) **About these terms** — they apply to the Rocha's Surf School app; using the app means accepting them; (2) **Who can use the app** — adults (18+) only; every account is approved by the school; in the app, admins' decisions (approvals, denials, roles, removals) are final; the school can remove an account that breaks these terms or the school rules; (3) **School rules** — the school rules accepted in the app also apply; (4) **What you post** — comments and photos must respect people; forbidden: harassment, hate speech, nudity or sexual content, violence, illegal content, and other people's private data; admins delete content that breaks these rules and can remove the account that posted it; (5) **Reporting content** — there is no report button; to report a comment, a photo or a person, message the school on WhatsApp (the formatted number, linked to `wa.me`); (6) **Payments** — the app takes no payments; (7) **What these terms don't cover** — they are not a liability waiver: the risks of surfing and skating, and payments, are covered by the school's own agreement with each student; (8) **Privacy** — a link to `/{lang}/privacy-policy` and one to `/{lang}/account-deletion`; (9) **Changes to these terms** — a new version is published on this page with a new "Last updated" date; (10) **Applicable law** — Brazilian law applies. A "Last updated" line follows the intro, as on the policy. | The user's list; Apple 1.2 needs forbidden content, how it is handled and a way to report it — WhatsApp is the route without building a button (accepted risk). |
| D-07 | The terms name no forum (court). | Under the CDC, a forum chosen against the consumer can be struck down as abusive; "Brazilian law applies" is safe. |
| D-08 | The terms page has no primary (sun) button; the WhatsApp number and the cross-links are inline links (`min-h-11`, like the policy's links). | The page's job is reading; one primary action per screen is a rule, not a quota. |
| D-09 | The home page gets a third `LinkRow` — terms of use, after privacy policy and before account deletion — with `FileText`, a title and a description in each language. `proxy.ts`'s `matcher` adds `/terms-of-use`. | The store reviewers and users reach every page from the home; the unprefixed URL behaves like the other two. |

## Expected Results

### ER-01 — Terms of use page in each language

- **Front:** web
- **Behavior:** Given the site is built with valid `SCHOOL_WHATSAPP_NUMBER`, `SCHOOL_LEGAL_NAME`, `DPO_NAME` and
  `DPO_EMAIL` and started, when someone opens `/pt-br/terms-of-use`, `/es/terms-of-use` or `/en/terms-of-use`,
  then the server answers 200 with `<html lang>` `pt-BR`, `es` or `en` and a `<title>` in that language, and the
  page shows, in that language, a "Last updated" line and the ten sections of D-06 with their content — including
  adults only, approval by the school, admins' decisions final, accounts can be removed, the forbidden content
  list, admins deleting content and removing accounts, no report button and the formatted WhatsApp number linked
  to `https://wa.me/<digits>`, no payments, not a waiver (surf/skate risks and payments in the school's own
  agreement), links to the policy and the deletion page, and that Brazilian law applies.
- **Edge and error cases:** `/fr/terms-of-use` and `/pt/terms-of-use` answer 404; no forum or court is named.
- **Verify by:** with the site running (`npm run build && npm run start` in `apps/web`),
  `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/es/terms-of-use` prints `200` and
  `…/fr/terms-of-use` prints `404`; `curl -s http://localhost:3000/en/terms-of-use | grep -c 'href="https://wa.me/5585999999999"'`
  prints at least `1` (with `SCHOOL_WHATSAPP_NUMBER=+5585999999999`); then a browser journey on the three URLs
  checks every item above.

### ER-02 — The policy identifies the controller and the encarregado

- **Front:** web
- **Behavior:** Given the site is built with `SCHOOL_LEGAL_NAME="Rocha Escola de Surf Ltda"`,
  `SCHOOL_CNPJ=11222333000181`, `DPO_NAME="Maria Rocha"` and `DPO_EMAIL=privacidade@example.com`, when someone
  opens `/{lang}/privacy-policy` (any of the three), then the "Who is responsible" card shows "Rocha's Surf
  School", "Rocha Escola de Surf Ltda", the CNPJ as `11.222.333/0001-81` and the formatted WhatsApp number linked
  to `wa.me`, and the encarregado card shows "Maria Rocha" and `privacidade@example.com` linked to
  `mailto:privacidade@example.com`.
- **Edge and error cases:** built with `SCHOOL_CNPJ` unset or empty, the page shows no CNPJ line (and no empty
  label); `SCHOOL_CNPJ=11.222.333/0001-81` (masked) is accepted and shown the same way.
- **Verify by:** with the site built and started with those values,
  `curl -s http://localhost:3000/en/privacy-policy | grep -o '11.222.333/0001-81\|mailto:privacidade@example.com\|Rocha Escola de Surf Ltda\|Maria Rocha' | sort -u`
  prints the four values; rebuilt with `SCHOOL_CNPJ=` the same `curl` finds no `11.222.333/0001-81` and the
  browser shows no CNPJ label on the three languages.

### ER-03 — The policy covers what LGPD and the store declarations need

- **Front:** web
- **Behavior:** Given the site is running, when someone reads `/{lang}/privacy-policy` in each of the three
  languages, then the page shows the fourteen cards of D-05 in that order, in that language, with: every collected
  item (including guest data and whether the WhatsApp number is shown); each purpose with its legal basis
  (contract, consent — and how to withdraw it —, legitimate interest); the named providers and the categories,
  with the language model receiving only class details and the rule text; transfers outside Brazil; every
  retention period (codes 10 minutes, sessions 30 days after last use, push token, account data, deleted /
  removed / denied 30 days, guests 30 days after the class, ratings kept without a name, "Former student" /
  "Former instructor"); security; adults only; the Art. 18 rights, how to exercise them and the ANPD; links to the
  deletion page and the terms; no cookies; changes to the policy; and a "Last updated" date.
- **Edge and error cases:** no provider other than Google, Apple, Resend and Expo is named; no placeholder text
  (`TODO`, `TBD`, `lorem ipsum`, `XX`) appears in any dictionary.
- **Verify by:** browser journey on `/pt-br/privacy-policy`, `/es/privacy-policy` and `/en/privacy-policy`
  checking every item above; `grep -nE "\bTODO\b|\bTBD\b|[Ll]orem ipsum|\bXX\b" apps/web/src/i18n/dictionaries/*.ts`
  prints nothing.

### ER-04 — Build refuses missing or invalid legal configuration

- **Front:** web
- **Behavior:** Given a valid `SCHOOL_WHATSAPP_NUMBER`, when `npm run build` runs in `apps/web` with
  `SCHOOL_LEGAL_NAME` unset, then the build exits non-zero and its output names `SCHOOL_LEGAL_NAME`; the same
  holds for `DPO_NAME` and `DPO_EMAIL` unset (each naming its variable).
- **Edge and error cases:** `SCHOOL_LEGAL_NAME="   "` (blank) and `DPO_NAME=""` fail; `DPO_EMAIL=not-an-email`
  fails naming `DPO_EMAIL`; `SCHOOL_CNPJ=11222333000180` (wrong check digit) and `SCHOOL_CNPJ=1122233300018`
  (13 digits) fail naming `SCHOOL_CNPJ`; `SCHOOL_CNPJ` unset or empty builds; the values of ER-02 build.
- **Verify by:** in `apps/web`, with `SCHOOL_WHATSAPP_NUMBER=+5585999999999` and the other variables valid,
  `SCHOOL_LEGAL_NAME= npm run build`, `DPO_NAME= npm run build`, `DPO_EMAIL= npm run build`,
  `DPO_EMAIL=not-an-email npm run build`, `SCHOOL_CNPJ=11222333000180 npm run build` and
  `SCHOOL_CNPJ=1122233300018 npm run build` each exit non-zero with the variable named in the output;
  `SCHOOL_CNPJ= npm run build` and the ER-02 values exit 0 (move `apps/web/.env` aside so it doesn't fill the
  unset ones).

### ER-05 — The terms are reachable from everywhere

- **Front:** web
- **Behavior:** Given the site is running, when someone opens `/{lang}`, then they see three rows — privacy
  policy, terms of use, account deletion — each with icon, title, description and chevron, the terms row linking
  to `/{lang}/terms-of-use`; the policy links to `/{lang}/terms-of-use` and `/{lang}/account-deletion`; the terms
  link to `/{lang}/privacy-policy` and `/{lang}/account-deletion`; and a request for `/terms-of-use` answers 307
  to `/{lang}/terms-of-use` with the language picked by 022 D-02.
- **Edge and error cases:** `Accept-Language: es-MX,es;q=0.9` → `/es/terms-of-use`; no header → `/pt-br/terms-of-use`;
  on `/pt-br/terms-of-use` the language pill's "Español" opens `/es/terms-of-use` with every text in Spanish
  (header, intro, cards, footer, `<title>`), also with JavaScript disabled.
- **Verify by:** `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" -H "Accept-Language: es-MX,es;q=0.9" http://localhost:3000/terms-of-use`
  prints `307 http://localhost:3000/es/terms-of-use`, and without the header prints
  `307 http://localhost:3000/pt-br/terms-of-use`; browser journey on `/en`, `/es`, `/pt-br` following the three
  rows, the cross-links on the policy and the terms, and the language switch on the terms page.

### ER-06 — The new and changed pages follow the design system

- **Front:** web
- **Behavior:** Given the home, privacy policy and terms pages in the three languages, then colors, fonts, radii
  and shadows come only from token utilities and `ds-text-*` classes; the pages follow the system's light or dark
  theme; every link, button and `summary` is at least 44px tall; and at 375px width there is no horizontal
  scroll.
- **Edge and error cases:** the terms page has no `bg-sun` button (D-08); long Portuguese and Spanish words and
  the email address wrap inside the cards; grape only on icon accents.
- **Verify by:** `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|font-family|\[[0-9.]+px\]" apps/web/src --include=*.tsx`
  shows nothing but the existing `gap-[22px]`; in the browser at 375×812 and at desktop width, light and dark,
  on the nine pages above: `document.documentElement.scrollWidth <= window.innerWidth`, every `a, button, summary`
  has `getBoundingClientRect().height >= 44`, and on the terms pages `document.querySelectorAll('.bg-sun').length`
  counts only the header's brand tile.

## Tasks

### Web (`apps/web`)

- [x] **T-01** — Legal configuration and the controller cards: create `apps/web/src/config/school-legal.ts`
  (D-03: `getSchoolLegal()` returning `{ legalName, cnpj: string | null /* formatted */, dpoName, dpoEmail }`,
  CNPJ check digits computed in the file, `EmailRule` from `@rochas-surf-school/shared`, errors naming the
  variable); add the four variables to `apps/web/.env.example` (example values, CNPJ commented as optional) and
  the local ignored `apps/web/.env`, and document them in `apps/web/README.md`; on
  `src/app/[lang]/privacy-policy/page.tsx` replace the controller card with D-05's cards (1) and (2), with their
  keys in `src/i18n/dictionary.types.ts` and `src/i18n/dictionaries/{pt-br,es,en}.ts`. Read the bundled Next 16
  docs on environment variables first.
  Covers: ER-02, ER-04 · Done when: `npm run check-types` and `npm run lint` in `apps/web` pass, every build of
  ER-04's Verify by behaves as stated, and the `curl` of ER-02 prints the four values (and none of the CNPJ when
  it is unset).
  > ✅ 2026-10-13 — `getSchoolLegal()` (check digits computed in the file, `EmailRule` from shared, errors name the
  > variable); four variables added to `.env.example`, the local `.env` and the README table; policy page shows the
  > controller and encarregado cards first (the old controller card and its `contactLabel` key replaced by `controller`
  > with labels and a new `dpo` section); files: `apps/web/src/config/school-legal.ts`,
  > `apps/web/src/app/[lang]/privacy-policy/page.tsx`, `apps/web/src/i18n/dictionary.types.ts`,
  > `apps/web/src/i18n/dictionaries/{pt-br,es,en}.ts`, `apps/web/.env.example`, `apps/web/README.md` (`.env` is
  > ignored); verified: `npm run check-types` and `npm run lint` clean; with `.env` aside, builds for
  > `SCHOOL_LEGAL_NAME` unset / blank, `DPO_NAME` empty, `DPO_EMAIL` empty / `not-an-email`, `SCHOOL_CNPJ`
  > `11222333000180` / `1122233300018` exit 1 naming their variable, and `SCHOOL_CNPJ` empty, masked
  > `11.222.333/0001-81` and the ER-02 values exit 0; the `curl` of ER-02 prints the four values on the three
  > languages, and a build without `SCHOOL_CNPJ` has no CNPJ label or number; deviations: none

- [x] **T-02** — Privacy policy rework: the rest of D-05 — cards (3) to (14) in that order on
  `src/app/[lang]/privacy-policy/page.tsx`, with the "Last updated" date (D-04), the restructured
  `privacyPolicy` type in `src/i18n/dictionary.types.ts` and the complete copy in
  `src/i18n/dictionaries/{pt-br,es,en}.ts`; the terms link in card (12) points at `/{lang}/terms-of-use` (the page
  arrives in T-03). Links use the page's existing `LINK_CLASSES`.
  Covers: ER-03 · Done when: `check-types`, `lint` and `build` pass in `apps/web`; the three policy URLs answer
  200; the browser journey of ER-03 finds every item in each language; ER-03's placeholder `grep` prints nothing.
  > ✅ 2026-10-13 — policy restructured into D-05's fourteen cards in order (controller and encarregado from T-01,
  > then collected, purposes with legal bases, providers, transfers abroad, retention, security, adults only, Art. 18
  > rights with how to exercise them and the ANPD, deletion link, terms link, no cookies, changes); copy in the three
  > languages, "Last updated" 13 Oct 2026; files: `apps/web/src/app/[lang]/privacy-policy/page.tsx`,
  > `apps/web/src/i18n/dictionary.types.ts`, `apps/web/src/i18n/dictionaries/{pt-br,es,en}.ts`; verified:
  > `check-types`, `lint`, `next build` pass; `curl` answers 200 on the three policy URLs, each with 14 cards and
  > links to `/{lang}/account-deletion` and `/{lang}/terms-of-use`; the placeholder `grep` prints nothing; browser
  > read of `/pt-br/privacy-policy` lists the 14 headings in order (full per-item journey in T-05); deviations: none

- [ ] **T-03** — Terms of use page: `src/app/[lang]/terms-of-use/page.tsx` (with `generateMetadata`, built like
  the policy page: `ScreenIntro` with `FileText`, "Last updated" line, D-06's ten `ContentCard`s, the WhatsApp
  link from `getSchoolWhatsapp()`, inline links, no primary button — D-08), and a `termsOfUse` section in the
  `Dictionary` type and the three dictionaries with the complete copy (D-04, D-06, D-07).
  Covers: ER-01, ER-06 · Done when: `check-types`, `lint` and `build` pass; the `curl` checks of ER-01 print
  `200`, `404` and the `wa.me` count; the browser journey of ER-01 finds every item in each language; at 375px
  the terms pages have no horizontal scroll and no link under 44px.

- [ ] **T-04** — Navigation: the terms `LinkRow` on `src/app/[lang]/page.tsx` between the two existing rows
  (D-09) with `home.termsOfUse` in the type and the three dictionaries; `/terms-of-use` in the `matcher` of
  `src/proxy.ts`; confirm the cross-links of T-02 and T-03 resolve.
  Covers: ER-05 · Done when: `check-types`, `lint` and `build` pass; both `curl` cases of ER-05 print the expected
  status and URL; in the browser `/es` shows three rows in order and each opens its page.

### Verification

- [ ] **T-05** — Run every command in the Verification Plan from the repo root, and follow the user journeys;
  all pass. Record the output summary as evidence.
  Covers: all · Done when: every automated command exits 0 (or fails where an Expected Result says it must) and
  each journey's observations are recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 023` — the tests related to the change pass (web has no runner,
    so none is expected for `apps/web`).
  - `node .specs/scripts/check-coverage.mjs 023` — every line this spec adds or changes is covered
    (`apps/web/src/**` is excluded by technical-context.md → Coverage).
  - `node .specs/scripts/run-e2e.mjs 023` — the e2e suites of the apps this spec touches (none is declared for
    web).
  - `SCHOOL_WHATSAPP_NUMBER=+5585999999999 SCHOOL_LEGAL_NAME="Rocha Escola de Surf Ltda" SCHOOL_CNPJ=11222333000181 DPO_NAME="Maria Rocha" DPO_EMAIL=privacidade@example.com npx turbo run lint check-types build --filter=@rochas-surf-school/web`
    — no errors.
  - ER-04's builds — the six invalid ones fail naming their variable; the two valid ones pass.
  - With the site running (`npm run start` in `apps/web`), the `curl` checks of ER-01, ER-02 and ER-05.
  - ER-03's placeholder `grep` and ER-06's `grep` for color and font literals.
- User journeys (in a browser, against `npm run start`):
  - ER-01 on `/pt-br/terms-of-use`, `/es/terms-of-use`, `/en/terms-of-use`, checking every listed item.
  - ER-02 and ER-03 on the three policy URLs, checking every card and item, and the CNPJ line gone after a build
    without `SCHOOL_CNPJ`.
  - ER-05: the home in each language with its three rows, the cross-links, and the language switch on the terms
    page (also with JavaScript disabled).
  - ER-06: home, policy and terms at 375×812 and desktop width, in light and dark, with the `scrollWidth`, 44px
    and `.bg-sun` checks.

## Memory Impact

- `memory/product.md` — remove "A terms-of-use page; the school rules play that role inside the app" from Out
  of scope; Relevant product decisions: the site has terms of use (adults only, approval, admins' decisions
  final, forbidden content handled by admins, reports through WhatsApp, no payments, not a waiver) next to the
  school rules; the policy names the legal controller and the encarregado from build config.
- `memory/technical-context.md` — Applications → `apps/web`: `SCHOOL_LEGAL_NAME`, `SCHOOL_CNPJ` (optional),
  `DPO_NAME`, `DPO_EMAIL` validated at build in `src/config/school-legal.ts`; External integrations: the policy's
  legal bases and retention list must change when a spec changes a retention period or adds a kind of data.
- `memory/structure.md` — the `apps/web` section: `src/app/[lang]/terms-of-use/`, `src/config/school-legal.ts`,
  `/terms-of-use` in the proxy matcher.

## Assumptions

- The copy is a draft: a lawyer or the school reviews the policy and the terms before the store submission, and
  edits only the dictionaries.
- The real legal name, CNPJ and encarregado are put into the build environment when the school supplies them;
  until then `.env.example` and local `.env` hold example values, and a deployed build can't happen without real
  ones.
- The pages describe in-app deletion, admin removal and the 30-day erasure of deleted and removed accounts and
  guest data before those are built; they are built before the app launches.
- The app is for adults; no age check exists in the sign-up flow (product.md: all students are assumed to be
  adults).

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
