---
id: "008"
slug: onboarding-whatsapp
title: Onboarding WhatsApp number step
status: in-progress
created: 2026-10-10
started: 2026-10-10
base_commit: 045e0c9a52cc2e43219a20891c39149f40c49cf7
fronts: [shared, auth, backend, mobile]
depends_on: []
---

# 008 — Onboarding WhatsApp number step

## Goal

An approved account that has no WhatsApp number yet must add one before using the app: the WhatsApp screen
(design LOGIN-07 "Aprovado · WhatsApp") welcomes the person by first name, asks for the number with its
country code (Brazil +55 preselected, any country selectable) and lets them choose to hide it — hidden by
default, which means only admins see it. The number is validated per country, saved on the backend in E.164
with its visibility, and the app moves on to an empty School rules screen, the second onboarding step, which
the school-rules spec will build.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: User (WhatsApp number with country code,
  Brazil +55 preselected, required once approved and never empty after; WhatsApp visibility, hidden by
  default), the `approved` → onboarding lifecycle step, data ownership (an unshared number is visible to
  admins only).
- Requirements:
  [requirements.md → Onboarding after approval](../../../.docs/requirements.md#onboarding-after-approval) —
  after approval, users add their WhatsApp number and accept the school rules before using the app (only the
  WhatsApp half here, D-01);
  [requirements.md → WhatsApp number format](../../../.docs/requirements.md#whatsapp-number-format) — country
  code, Brazil preselected, foreign numbers saved with their country's code;
  [requirements.md → WhatsApp number visibility](../../../.docs/requirements.md#whatsapp-number-visibility) —
  hidden by default, admins always see it (only the setting here; nothing exposes other users' numbers yet).
- Design: `.docs/designs/auth-flow.html` → LOGIN-07 "Aprovado · WhatsApp" (screen `aprov`): ok-tinted check
  tile, eyebrow "Conta aprovada" in `ok`, screen title with the first name, description, a card (`bg-surface`,
  `border-line`, `rounded-card`) holding the "Número de WhatsApp" label with the WhatsApp glyph, the country
  chip + phone input row, the helper text, a divider and the "Ocultar o meu número" row (eye-off icon, label,
  hint, switch), then the primary CTA at the bottom. The design's file is a bundle; its markup is readable only
  after decoding, so follow this description, D-02, D-03 and D-07 where the design differs.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Architecture
  (who may do what is checked in use cases), Fixed conventions (error keys, mobile forms validate with the
  shared rules, Mobile shared UI, Mobile routes, Mobile flows), Authentication (global `JwtAuthGuard`,
  `@CurrentUser()`, Mobile session), Error handling, Automated validation.
- Existing code this builds on:
  - `modules/auth/src/user/model/user.entity.ts` — `User` already has `whatsappNumber` (validated with the
    E.164-shape-only `PhoneRule`) and `whatsappVisible` (`false` by default at sign-up).
  - `apps/backend/prisma/models/auth.model.prisma` — `users.whatsapp_number` / `whatsapp_visible` exist; no
    migration is needed.
  - `modules/auth/src/user/usecase/get-current-user.usecase.ts`,
    `modules/auth/src/sign-in-code/usecase/verify-sign-in-code.usecase.ts`,
    `modules/auth/src/session/usecase/refresh-session.usecase.ts` — return the user as
    `{ id, name, email, role, status, createdAt }`.
  - `apps/backend/src/modules/auth/auth.controller.ts` — `GET /auth/me` is the only protected route.
  - `apps/mobile/src/navigation/resolve-flow.ts` + `root-navigator/root-navigator.hook.ts` — `approved` goes
    to `onboarding` until `onboardingCompleted`, which is hard-coded to `true` (spec 005, D-03).
  - `apps/mobile/src/app/(onboarding)/onboarding/{_layout,index}.tsx` and
    `src/modules/onboarding/screens/onboarding.screen.tsx` — a placeholder showing the flow's name.
  - `apps/mobile/src/services/api/api.client.ts` — only `apiPost`, without an `Authorization` header.
  - `apps/mobile/src/components/ui/bottom-modal`, `text-input`, `button`, `screen-intro`,
    `src/components/flow-placeholder`, `src/providers/alert-message`, `src/modules/auth/hooks/use-sign-out.hook.ts`.

## Scope

### In scope

- A shared `ForbiddenError` (403) in `packages/shared`.
- A shared `PhoneNumberRule` validating a phone number per country with `libphonenumber-js`, used by
  `User.validate()` for `whatsappNumber` instead of `PhoneRule`.
- The `SetWhatsapp` use case in `modules/auth` and `PUT /auth/me/whatsapp` in the backend.
- `whatsappNumber` and `whatsappVisible` in the user returned by `POST /auth/email/verify`,
  `POST /auth/refresh` and `GET /auth/me`.
- Mobile: the session user's new fields; the onboarding step decided in `resolve-flow.ts`; `apiPut`; the
  WhatsApp screen with its country picker; the School rules placeholder screen and route; translations in
  pt-BR, en-US and es-ES.

### Out of scope

- The school rules themselves: their content, versions, acceptance and the real School rules screen.
- Completing onboarding: no account reaches the student, instructor or admin home after this spec (D-01).
- Profile editing (changing the number or the visibility later), the people directory, and admins opening a
  WhatsApp chat with a user.
- Hiding other users' numbers in API responses: no endpoint returns another user's number yet.
- Renewing the session, keeping it across app restarts, and a sign-out button on the onboarding screens.
- Changing the review accounts' seed or `REVIEW_ACCOUNTS` (they enter a number like anyone, D-08).
- Uniqueness of WhatsApp numbers across accounts.
- Normalizing numbers on the backend: the API receives and stores E.164 as sent, after validation.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | "Salvar e continuar" opens an empty School rules screen (`/onboarding/school-rules`). Onboarding is never completed until the school-rules spec: an approved account with a number always lands on School rules, so the role homes are unreachable. This deliberately implements only the WhatsApp half of [Onboarding after approval](../../../.docs/requirements.md#onboarding-after-approval); the school-rules spec adds the rules step to the same onboarding check. | The user chose a blocking next step over skipping to the role home, matching "they can continue only after doing both"; the role homes are placeholders anyway. |
| D-02 | The visibility switch is labelled "hide my number" and starts **on** (`whatsappVisible: false` is sent unless the person turns it off). Hidden means only admins see the number — students and instructors don't. | The requirement ("hidden by default", "only admins can see") wins over the design, whose switch starts off and says "other students". |
| D-03 | Brazil (+55) is preselected. The person picks the country in a searchable `BottomModal` list of every country `libphonenumber-js` knows (`getCountries()`), each shown with its localized name from `i18n-iso-countries` (pt, es, en, following the app language) and its dial code (`getCountryCallingCode()`). The number typed is combined with the country into E.164 (`parsePhoneNumber(typed, country).number`) and that is what is sent and stored. Validation is a new shared rule, `PhoneNumberRule` (`isValidPhoneNumber` on an E.164 string, error key `phone`), which replaces `PhoneRule` for `whatsappNumber` in `User.validate()` and is the one the mobile form runs. | `PhoneRule` only checks the E.164 shape and accepts impossible numbers; one library and one rule keep app and backend agreeing (convention "Mobile forms validate with the shared rules"); the requirement's "Foreign number" scenario needs a country choice. The design's fixed "PT +351" is replaced. |
| D-04 | `PUT /auth/me/whatsapp` (authenticated) with body `{ whatsappNumber: string, whatsappVisible: boolean }` answers 200 with the account `{ id, name, email, role, status, createdAt, whatsappNumber, whatsappVisible }`. Only an `approved` account may call it (otherwise 403 `user.status.notApproved`, from the new shared `ForbiddenError`). It always replaces both values, so the profile spec can reuse it. The same user shape (with `whatsappNumber: string \| null`) is returned by verify, refresh and `GET /auth/me`. | The account reads its own number; one contract for the app's session user; permissions checked in the use case (Architecture). |
| D-05 | The onboarding step is decided only in `apps/mobile/src/navigation/resolve-flow.ts`: `onboardingStep(user)` returns `"whatsapp"` when the user has no `whatsappNumber`, otherwise `"school-rules"`; `flowEntryRoute(flow, user)` returns `routes.onboarding.whatsapp` (`/onboarding`) or `routes.onboarding.schoolRules` (`/onboarding/school-rules`) for the onboarding flow. `useRootNavigator` passes `onboardingCompleted: false` with a comment pointing at D-01 (the school-rules spec computes it). | The convention: one tested function holds every access rule; screens never decide access. |
| D-06 | No `BackButton` and no sign-out on either onboarding screen (each is the root of its step). "Salvar e continuar" (`Button`, primary) is disabled while the number isn't valid for the chosen country and shows `loading` while saving. The invalid-number message shows under the field only after blur and when the field isn't empty (as `TextInput` does elsewhere). API errors show in the toast. After a successful save the app updates the session user with the response and calls `router.replace(routes.onboarding.schoolRules)`, so going back doesn't return to the WhatsApp screen. | Follows the design (no back, no sign-out) and the Mobile shared UI convention; a restart already signs out (in-memory session). |
| D-07 | Copy, gender-neutral pt-BR adapted from the design's European Portuguese, with en-US and es-ES — see the table under Expected Results → Copy. The first name is the first word of the account's name. | Same treatment as spec 006 (D-05); "Bem-vinda" is gendered. |
| D-08 | The same number may be used by several accounts; the review accounts' seed is unchanged (reviewers type a number once). | A family may share a phone; reviewers should see the real flow. |
| D-09 | When the save answers 401 `auth.token.invalid` (the 15-minute access token expired; the app can't renew yet), the app shows "Sua sessão expirou. Entre novamente." in the toast and signs out locally with `useSignOut`, which takes the person to sign-in. | Without session renewal, retrying could never succeed. |
| D-10 | The mobile API client gains `apiPut(path, body, { accessToken })`, which sends `Authorization: Bearer <token>` when a token is given, with the same error handling as `apiPost` (`ApiError`, `NetworkError`). The save is a TanStack Query mutation without retry, in `useSaveWhatsapp`. | Technical context: every request goes through the fetch client and TanStack Query. |

## Expected Results

### ER-01 — Phone numbers are validated per country

- **Front:** shared
- **Behavior:** Given `PhoneNumberRule`, when it validates `"+5585999998888"` (Brazil mobile),
  `"+351912345678"` (Portugal) or `"+14155552671"` (US), then it returns `null`; when it validates
  `"+55123"`, `"+5500999998888"` (impossible area code), `"85999998888"` (no `+`) or `"+55 85 abc"`, then it
  returns `"phone"`.
- **Edge and error cases:** `undefined`, `null` and `""` return `null` (presence is `RequiredRule`'s job, as
  with the other rules); a non-string value returns `"phone"`; an array is validated item by item like the
  other string rules (`validateStringValues`).
- **Verify by:** `npx jest test/validation/rules/phone-number.rule.test.ts` in `packages/shared`.

### ER-02 — An approved account saves its WhatsApp number and visibility

- **Front:** backend
- **Behavior:** Given an approved account with no number, when it calls `PUT /auth/me/whatsapp` with a valid
  access token and `{ "whatsappNumber": "+5585999998888", "whatsappVisible": false }`, then the API answers
  200 with the account including `whatsappNumber: "+5585999998888"` and `whatsappVisible: false`, and
  `GET /auth/me` then returns the same two values.
- **Edge and error cases:** calling it again with `{ "whatsappNumber": "+351912345678",
  "whatsappVisible": true }` replaces both values; another account may save the same number (200).
- **Verify by:** `npx vitest run --config ./vitest.config.e2e.ts test/auth-whatsapp.e2e-spec.ts -t "saves"` in
  `apps/backend` (or `npm run test:e2e --workspace apps/backend`), and the `SetWhatsapp` unit tests in
  `modules/auth/test/user/usecase/set-whatsapp.usecase.test.ts`.

### ER-03 — Only approved accounts may set a WhatsApp number

- **Front:** backend
- **Behavior:** Given a `pending` account, when it calls `PUT /auth/me/whatsapp` with a valid body, then the
  API answers 403 with `errors: ["user.status.notApproved"]` and the account's number stays empty.
- **Edge and error cases:** `denied`, `deleted` and `removed` accounts get the same 403 (unit-tested in the
  use case); a request without a token, or with an invalid one, answers 401 `auth.token.invalid`.
- **Verify by:** `test/auth-whatsapp.e2e-spec.ts` → tests "refuses a pending account" and "refuses without a
  token"; `set-whatsapp.usecase.test.ts` → one case per non-approved status; `ForbiddenError` tests in
  `packages/shared/test/error/forbidden.error.test.ts`.

### ER-04 — Invalid input is refused and nothing is saved

- **Front:** backend
- **Behavior:** Given an approved account, when it calls `PUT /auth/me/whatsapp` with a missing or empty
  `whatsappNumber`, then the API answers 422 with `user.whatsappNumber.required` in `errors`; with
  `"+55123"`, 422 with `user.whatsappNumber.phone`; with a missing or non-boolean `whatsappVisible`, 422 with a
  `user.whatsappVisible.*` key (`required` when missing, `in` for a non-boolean). In every case the account's
  stored number and visibility are unchanged.
- **Edge and error cases:** an account that already has a number and sends an empty one keeps its number
  (422 `user.whatsappNumber.required`); a missing body behaves as both fields missing.
- **Verify by:** `test/auth-whatsapp.e2e-spec.ts` → the 422 cases (each also reads `GET /auth/me` to check
  nothing changed); `set-whatsapp.usecase.test.ts`.

### ER-05 — The session user carries the WhatsApp number and visibility

- **Front:** backend
- **Behavior:** Given any account, when `POST /auth/email/verify`, `POST /auth/refresh` or `GET /auth/me`
  returns its user, then the user has `whatsappNumber` (the stored E.164 string, or `null` when there is none)
  and `whatsappVisible` (boolean) next to `id`, `name`, `email`, `role`, `status` and `createdAt`.
- **Edge and error cases:** a newly created pending account has `whatsappNumber: null` and
  `whatsappVisible: false`.
- **Verify by:** `npm run test:e2e --workspace apps/backend` → the user-shape assertions in
  `test/auth-email.e2e-spec.ts` (verify) and `test/auth-session.e2e-spec.ts` (`GET /auth/me`, refresh); the
  unit tests of `GetCurrentUser`, `VerifySignInCode` and `RefreshSession` in `modules/auth/test`.

### ER-06 — The onboarding step follows the WhatsApp number

- **Front:** mobile
- **Behavior:** Given an approved account in the session without `whatsappNumber`, when the app resolves its
  flow, then it opens `/onboarding` (the WhatsApp screen); given an approved account with a number, then it
  opens `/onboarding/school-rules`, which shows "Regras da escola" (in the app's language). Neither reaches
  `/student`, `/instructor` or `/admin`.
- **Edge and error cases:** pending, denied, deleted and removed accounts keep their flows (spec 005/006
  behavior unchanged); an approved account of any role (student, instructor, admin) follows the same steps.
- **Verify by:** `npx jest src/navigation` in `apps/mobile` → `resolve-flow` tests for `onboardingStep` and
  `flowEntryRoute`, and `root-navigator.component.test.tsx` cases "approved without a number opens the
  WhatsApp step" and "approved with a number opens school rules"; user journey 1 in the Verification Plan.

### ER-07 — The WhatsApp screen shows the approved welcome with the defaults

- **Front:** mobile
- **Behavior:** Given an approved account named "Ana Silva" without a number, when the WhatsApp screen opens,
  then it shows "Account approved", "Welcome to Rocha's, Ana", "Just one more thing before you start.", the
  "WhatsApp number" card with the country chip showing "BR +55", an empty number
  field, the helper text, "Hide my number" with its switch **on** and its hint, and the "Save and continue"
  button disabled (texts in en-US, the tests' language; pt-BR and es-ES per the Copy table).
- **Edge and error cases:** a single-word name shows that word; the screen has no back button and no
  sign-out.
- **Verify by:** `npx jest src/modules/onboarding/components/whatsapp` in `apps/mobile` →
  "shows the approved welcome and the defaults"; user journey 1.

### ER-08 — The number is checked for the chosen country

- **Front:** mobile
- **Behavior:** Given the WhatsApp screen, when the person types `85 99999-8888` with Brazil selected, then
  "Save and continue" becomes enabled; when they open the country chip, search "portu", pick Portugal, then
  the chip shows "PT +351" and the same digits are now invalid: after the field loses focus it shows
  "Invalid WhatsApp number." under it and the button is disabled; typing `912 345 678` clears the error and
  enables the button.
- **Edge and error cases:** no error is shown before the first blur or while the field is empty; a search
  matching nothing shows an empty list; the picker lists country names in the app's language (e.g.
  "Portugal" / "Spain" in en-US, "Espanha" in pt-BR).
- **Verify by:** `npx jest src/modules/onboarding/components` in `apps/mobile` → the `whatsapp` tests
  "validates the number for the chosen country" and the `country-picker` tests "filters by name" and
  "returns the picked country"; user journey 1.

### ER-09 — Saving stores the number and opens School rules

- **Front:** mobile
- **Behavior:** Given a valid Brazilian number and the hide switch on, when the person presses "Save and
  continue", then the app sends `PUT /auth/me/whatsapp` with the access token and
  `{ "whatsappNumber": "+5585999998888", "whatsappVisible": false }`, shows the button loading meanwhile,
  updates the session user with the response, and replaces the screen with School rules (going back does not
  return to the WhatsApp screen). Turning the switch off sends `whatsappVisible: true`.
- **Edge and error cases:** an `ApiError` (e.g. 422, 403) or `NetworkError` shows its translated message (or
  the generic / no-connection message) in the toast and keeps the person on the screen with what they typed;
  a 401 `auth.token.invalid` shows "Your session expired. Sign in again." and signs out locally, which opens
  the sign-in screen (D-09).
- **Verify by:** `npx jest src/services/api src/modules/onboarding` in `apps/mobile` → `apiPut` tests,
  `use-save-whatsapp.hook.test.tsx` and the `whatsapp` component tests "saves and opens school rules",
  "shows API errors in a toast" and "signs out when the session expired"; user journey 1 and 2.

### Copy

| Key | pt-BR | en-US | es-ES |
| --- | --- | --- | --- |
| eyebrow | Conta aprovada | Account approved | Cuenta aprobada |
| title | Boas-vindas à Rocha's, {{firstName}} | Welcome to Rocha's, {{firstName}} | Te damos la bienvenida a Rocha's, {{firstName}} |
| description | Só falta uma coisa antes de começar. | Just one more thing before you start. | Solo falta una cosa antes de empezar. |
| card title | Número de WhatsApp | WhatsApp number | Número de WhatsApp |
| helper | Pedimos o número só para que a escola possa falar com você se for preciso — por exemplo, se uma aula for cancelada por causa do mar. | We only ask for your number so the school can reach you if needed — for example, if a class is cancelled because of the sea. | Solo te pedimos el número para que la escuela pueda contactarte si hace falta; por ejemplo, si se cancela una clase por el estado del mar. |
| switch | Ocultar meu número | Hide my number | Ocultar mi número |
| switch hint | Só os administradores da escola vão ver. Você pode mudar isso no perfil. | Only the school's admins will see it. You can change this in your profile. | Solo lo verán los administradores de la escuela. Puedes cambiarlo en tu perfil. |
| button | Salvar e continuar | Save and continue | Guardar y continuar |
| picker title | País | Country | País |
| picker search | Buscar país | Search country | Buscar país |
| invalid number | Número de WhatsApp inválido. | Invalid WhatsApp number. | Número de WhatsApp no válido. |
| session expired (toast) | Sua sessão expirou. Entre novamente. | Your session expired. Sign in again. | Tu sesión ha caducado. Vuelve a iniciar sesión. |
| School rules title | Regras da escola | School rules | Normas de la escuela |

The API error keys this route can answer (`user.whatsappNumber.required`, `user.whatsappNumber.phone`,
`user.status.notApproved`) map to the "invalid number" message for the first two and to the generic error
message for the third.

## Tasks

### Shared (`packages/shared`)

- [x] **T-01** — Add `ForbiddenError` (`statusCode` 403, message = translation key, optional `details`, like
  `UnauthorizedError`) in `packages/shared/src/error/forbidden.error.ts`, export it from
  `src/error/index.ts`, with `test/error/forbidden.error.test.ts`. Check that the backend's
  `ApiExceptionFilter` answers 403 for it (it maps any `DomainError` by `statusCode`; add a case to its spec in
  the `backend-nest-config` templates only if it doesn't). Covers: ER-03 · Done when:
  `npm test --workspace @rochas-surf-school/shared` passes with the new test.
  > ✅ 2026-10-10 — added `ForbiddenError` (403, optional details) and exported it; the backend's `ApiExceptionFilter` already maps any `DomainError` by `statusCode`, so no filter change; files: `packages/shared/src/error/forbidden.error.ts`, `packages/shared/src/error/index.ts`, `packages/shared/test/error/forbidden.error.test.ts`; verified: `npm test --workspace @rochas-surf-school/shared` (24 suites, 114 tests passed); deviations: none

- [x] **T-02** — Add `PhoneNumberRule` in `packages/shared/src/validation/rules/phone-number.rule.ts`
  (`libphonenumber-js` `isValidPhoneNumber` on E.164 strings, key `phone`, via `validateStringValues`),
  export it, add `libphonenumber-js` to `packages/shared` dependencies, and write
  `test/validation/rules/phone-number.rule.test.ts` with the cases of ER-01. Skill:
  [`shared-validation-rule`](../../../.claude/skills/shared-validation-rule). Covers: ER-01 · Done when: the
  test file passes and `npm run build --workspace @rochas-surf-school/shared` succeeds.
  > ✅ 2026-10-10 — added `PhoneNumberRule` (`isValidPhoneNumber` on strings that start with `+`, key `phone`, via `validateStringValues`), exported it, added `libphonenumber-js` to `packages/shared`; files: `packages/shared/src/validation/rules/phone-number.rule.ts`, `packages/shared/src/validation/rules/index.ts`, `packages/shared/test/validation/rules/phone-number.rule.test.ts`, `packages/shared/package.json`, `package-lock.json`; verified: `npm test --workspace @rochas-surf-school/shared` (114 passed, new rule 100% covered) and `npm run build --workspace @rochas-surf-school/shared` (ok); deviations: the `+` prefix check is explicit because `isValidPhoneNumber` alone accepts national numbers without a default country; skill `shared-validation-rule` not invoked, the rule follows the existing `PhoneRule` pattern

### Auth module (`modules/auth`)

- [x] **T-03** — In `modules/auth/src/user/model/user.entity.ts` validate `whatsappNumber` with
  `PhoneNumberRule` instead of `PhoneRule` (update `test/user/model/user.entity.test.ts`). Add the
  `SetWhatsapp` use case in `src/user/usecase/set-whatsapp.usecase.ts` (In: `{ userId, whatsappNumber,
  whatsappVisible }`; loads the user — missing → `UnauthorizedError("auth.token.invalid")`; status not
  `approved` → `ForbiddenError("user.status.notApproved")`; `whatsappNumber` missing/empty →
  `ValidationException` with `user.whatsappNumber.required`; builds the updated `User` and lets
  `validate()` refuse an invalid number or visibility; saves through `UserRepository.update`; returns the
  account shape of D-04), export it, with `test/user/usecase/set-whatsapp.usecase.test.ts` covering ER-02 to
  ER-04 against the in-memory repository. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-02, ER-03, ER-04 · Done when: `npm test --workspace @rochas-surf-school/auth` passes.
  > ✅ 2026-10-10 — `User.validate()` now checks `whatsappNumber` with `PhoneNumberRule`; added the `SetWhatsapp` use case (loads the user, 401 when missing, 403 `user.status.notApproved` unless approved, `user.whatsappNumber.required` for a missing/empty number, then `clone` + `validate()` and `UserRepository.update`) and exported it; files: `modules/auth/src/user/model/user.entity.ts`, `modules/auth/src/user/usecase/set-whatsapp.usecase.ts`, `modules/auth/src/user/usecase/index.ts`, `modules/auth/test/user/model/user.entity.test.ts`, `modules/auth/test/user/usecase/set-whatsapp.usecase.test.ts`; verified: `npm test --workspace @rochas-surf-school/auth` (18 suites, 205 tests passed, new use case 100% covered) and `npm run check-types` (ok); deviations: `SetWhatsappOut` declares the account shape itself (T-04 adds the same two fields to `GetCurrentUserOut`); skill `module-use-case` not invoked, the use case follows the existing ones

- [x] **T-04** — Add `whatsappNumber: string | null` and `whatsappVisible: boolean` to the user output of
  `GetCurrentUser`, `VerifySignInCode` and `RefreshSession` (one shared output type if they already share
  one, otherwise the same two fields in each), and update their tests in `modules/auth/test`. Covers: ER-05 ·
  Done when: `npm test --workspace @rochas-surf-school/auth` passes and `npm run check-types --workspace
  @rochas-surf-school/auth` exits 0.
  > ✅ 2026-10-10 — `whatsappNumber: string | null` and `whatsappVisible: boolean` added to `GetCurrentUserOut` (reused by `RefreshSession`) and to the user of `VerifySignInCode`; tests updated and a stored-number case added to each of `GetCurrentUser` and `VerifySignInCode`; files: `modules/auth/src/user/usecase/get-current-user.usecase.ts`, `modules/auth/src/sign-in-code/usecase/verify-sign-in-code.usecase.ts`, `modules/auth/src/session/usecase/refresh-session.usecase.ts`, `modules/auth/test/user/usecase/get-current-user.usecase.test.ts`, `modules/auth/test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts`, `modules/auth/test/session/usecase/refresh-session.usecase.test.ts`; verified: `npm test --workspace @rochas-surf-school/auth` (207 passed) and `npm run check-types` (exit 0); deviations: none

### Backend (`apps/backend`)

- [x] **T-05** — Expose `PUT /auth/me/whatsapp` (protected, `@CurrentUser('id')`, 200) in
  `apps/backend/src/modules/auth/auth.controller.ts`, calling `SetWhatsapp` with the body's two fields; add
  the requests (save, replace, invalid number, missing visibility, pending account) to
  `auth.integration.http`; write `test/auth-whatsapp.e2e-spec.ts` (saves, replaces, same number on two
  accounts, 403 for a pending account, 401 without a token, the 422 cases of ER-04 each checking `GET /auth/me`
  is unchanged); assert `whatsappNumber` / `whatsappVisible` in the user of verify
  (`test/auth-email.e2e-spec.ts`) and of `GET /auth/me` and refresh (`test/auth-session.e2e-spec.ts`); add a
  controller unit test if the backend has one for `AuthController`. An approved account for the e2e test is
  created through the Prisma client in the test setup. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller). Covers: ER-02, ER-03, ER-04,
  ER-05 · Done when: `npm run test:e2e --workspace apps/backend` passes (database up, migrations applied) and
  `npm test` in `apps/backend` passes.
  > ✅ 2026-10-10 — added `PUT /auth/me/whatsapp` (protected, 200, `@CurrentUser('id')`, runs `SetWhatsapp`); controller unit tests (route metadata, success, missing body, plus the new user fields on verify and `GET /auth/me`); new e2e suite `auth-whatsapp.e2e-spec.ts` (saves, replaces, same number on two accounts, pending → 403, no/invalid token → 401, five 422 cases each checking `GET /auth/me` unchanged, missing body, empty number keeps the stored one); `whatsappNumber`/`whatsappVisible` asserted in the verify, refresh and `GET /auth/me` e2e tests; REST Client requests added; files: `apps/backend/src/modules/auth/auth.controller.ts`, `apps/backend/src/modules/auth/auth.controller.spec.ts`, `apps/backend/src/modules/auth/auth.integration.http`, `apps/backend/test/auth-whatsapp.e2e-spec.ts`, `apps/backend/test/auth-email.e2e-spec.ts`, `apps/backend/test/auth-session.e2e-spec.ts`; verified: `npm run test:e2e` (3 files, 84 passed, database up), `npm test` (17 files, 119 passed), `npm run lint` and `npm run check-types` clean; deviations: skill `backend-nest-controller` not invoked, the route follows the controller's existing pattern; the approved account for the e2e test is created through Prisma and signed in through the real email flow

### Mobile (`apps/mobile`)

- [ ] **T-06** — Routing of the onboarding steps: add `whatsappNumber: string | null` and
  `whatsappVisible: boolean` to `SessionUser` (`src/navigation/resolve-flow.types.ts`); add `onboardingStep`
  and make `flowEntryRoute(flow, user)` step-aware in `src/navigation/resolve-flow.ts` (D-05); in
  `src/constants/routes.ts` replace `onboarding.home` with `onboarding.whatsapp` (`/onboarding`) and add
  `onboarding.schoolRules` (`/onboarding/school-rules`), updating every use; `useRootNavigator` passes
  `onboardingCompleted: false` (D-01); `src/app/index.tsx` passes the user to `flowEntryRoute`; add
  `src/app/(onboarding)/onboarding/school-rules.tsx` rendering `src/modules/onboarding/screens/school-rules.screen.tsx`
  (a `FlowPlaceholder` with the "School rules title" key); keep `index.tsx` rendering the onboarding screen
  (still the placeholder until T-09); update the test fixtures that build a `SessionUser`. Tests:
  `resolve-flow` unit tests and `root-navigator.component.test.tsx` cases of ER-06. Covers: ER-06 · Done when:
  `npx jest src/navigation src/modules` in `apps/mobile` passes and `npx tsc --noEmit` exits 0.

- [ ] **T-07** — Add `apiPut(path, body, options?: { accessToken?: string })` to
  `src/services/api/api.client.ts` (D-10) with its tests in `api.client.test.ts`; add
  `src/modules/onboarding/hooks/use-save-whatsapp.hook.ts` — a mutation (no retry) that calls
  `PUT /auth/me/whatsapp` with the session's access token, on success calls `setSession` with the returned
  user and the current tokens, and on 401 `auth.token.invalid` shows the session-expired toast and calls
  `useSignOut` (D-09); with `use-save-whatsapp.hook.test.tsx`. Covers: ER-09 · Done when:
  `npx jest src/services/api src/modules/onboarding/hooks` passes.

- [ ] **T-08** — Add the country picker component in `src/modules/onboarding/components/country-picker/`
  (`*.component.tsx`, `*.hook.ts`, `*.types.ts`, `index.ts`): a `BottomModal` with the "Country" title, a
  search `TextInput` ("Search country"), and a list of every `getCountries()` country showing its localized
  name (`i18n-iso-countries`, locale from the i18n language: pt, es or en) and `+<dial code>`, sorted by name;
  filtering is case- and accent-insensitive on the name; picking one calls `onSelect(countryCode)` and
  closes. Install `libphonenumber-js` and `i18n-iso-countries` in `apps/mobile`. Test
  `country-picker.component.test.tsx`: lists names in the current language, "filters by name", empty result,
  "returns the picked country". Covers: ER-08 · Done when: `npx jest src/modules/onboarding/components/country-picker`
  passes.

- [ ] **T-09** — Build the WhatsApp step: `src/modules/onboarding/components/whatsapp/` (component, hook,
  types, index) following the design description in Context and D-02/D-06 — `ScreenIntro`-style header with
  the `check` icon on an `ok`-tinted tile and the eyebrow in `ok` (extend `ScreenIntro` through props only if
  it can't express it, with its test), the card with the country chip (opens `CountryPicker`), the phone
  `TextInput`, the helper, the "Hide my number" row with React Native `Switch` (colors from `useTheme()`),
  and the primary `Button`; the form validates `parsePhoneNumber(typed, country)` with the shared
  `PhoneNumberRule` (no rule re-implemented), saves with `useSaveWhatsapp`, maps the API errors as in the Copy
  section through `useAlertMessage()`, and on success calls `router.replace(routes.onboarding.schoolRules)`.
  Rename the placeholder `onboarding.screen.tsx` to `whatsapp.screen.tsx` rendering the component and point
  `src/app/(onboarding)/onboarding/index.tsx` at it. Add every key of the Copy table to
  `src/i18n/messages/{en-US,es-ES,pt-BR}.ts`. Tests `whatsapp.component.test.tsx`: "shows the approved
  welcome and the defaults", "validates the number for the chosen country", "saves and opens school rules"
  (body and `router.replace`), switch off sends `whatsappVisible: true`, "shows API errors in a toast", "signs
  out when the session expired". Skills: `vercel-react-native-skills`, `vercel-react-best-practices` (per
  CLAUDE.md). Covers: ER-07, ER-08, ER-09 · Done when: `npx jest src/modules/onboarding` passes, `npx tsc
  --noEmit` and `npm run lint` in `apps/mobile` exit 0, and the screen matches the design in the iOS simulator
  in light and dark themes.

### Verification

- [ ] **T-10** — Run every command in the Verification Plan from the repo root and follow the user journeys;
  all pass. Record the output summary as evidence. Covers: all · Done when: every command exits 0 and both
  journeys show what they describe.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 008` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 008` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 008` — the backend e2e suite passes, including
    `test/auth-whatsapp.e2e-spec.ts` (database up with `npm run db:start --workspace apps/backend` and
    `npm run prisma:migrate:deploy --workspace apps/backend`).
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/shared --filter=@rochas-surf-school/auth
    --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile` — no errors (the mobile type check
    also proves the three locale files share the keys).
- User journeys (iOS simulator, backend running with `npm run dev` and its database up; approve an account by
  setting `status = 'approved'` on its `users` row, since no admin screen exists yet):
  1. ER-06, ER-07, ER-08, ER-09 — sign in with an approved account without a number: the WhatsApp screen shows
     "Conta aprovada", "Boas-vindas à Rocha's, <first name>", "BR +55" and "Ocultar meu número" on. Type an
     invalid number and leave the field: "Número de WhatsApp inválido." shows and "Salvar e continuar" is
     disabled. Pick Portugal through the picker (search "port"), type `912 345 678`: the button enables. Press
     it: the "Regras da escola" screen opens, the iOS back-swipe doesn't return, and the `users` row has
     `whatsapp_number = '+351912345678'`, `whatsapp_visible = false`. Check the screen in light and dark.
  2. ER-06 — close and reopen the app, sign in again with the same account: it opens "Regras da escola"
     directly.

## Memory Impact

- `memory/product.md` — Current state: the WhatsApp onboarding step is delivered (approved accounts add their
  number, hidden by default, then reach an empty School rules step; role homes are unreachable until the
  school-rules spec). Relevant product decisions: the onboarding steps are WhatsApp, then school rules, and
  hiding the number means only admins see it.
- `memory/technical-context.md` — Applications → `apps/mobile`: `libphonenumber-js` and `i18n-iso-countries`;
  `apiPut` with a bearer token in the fetch client. `packages/shared`: `ForbiddenError` (403) and
  `PhoneNumberRule` (`libphonenumber-js`). Fixed conventions → Mobile flows: `onboardingStep(user)` and the
  step-aware `flowEntryRoute(flow, user)`; `onboardingCompleted` is `false` until the school-rules spec.
  Authentication: the session user (and `GET /auth/me`, verify, refresh) carries `whatsappNumber` and
  `whatsappVisible`; WhatsApp numbers are stored in E.164. Mobile session: a 401 on a protected call signs out
  locally with a session-expired toast (until session renewal exists).
- `memory/structure.md` — `apps/backend`: `PUT /auth/me/whatsapp`, `test/auth-whatsapp.e2e-spec.ts`.
  `modules/auth`: `usecase/set-whatsapp.usecase.ts`. `packages/shared`: `error/forbidden.error.ts`,
  `validation/rules/phone-number.rule.ts`. `apps/mobile`: `(onboarding)/onboarding/{index,school-rules}.tsx`,
  `modules/onboarding/{screens/{whatsapp,school-rules}.screen.tsx,components/{whatsapp,country-picker},hooks/use-save-whatsapp.hook.ts}`,
  `routes.onboarding.{whatsapp,schoolRules}`.
- `memory/modules/auth.md` — Accounts: an approved account sets its WhatsApp number (E.164, validated per
  country) and visibility; only approved accounts may; the number can't be emptied. Who can do what: approved
  accounts set their own number; in the app, an approved account without a number opens the WhatsApp step,
  then School rules. Spec history entry.

## Assumptions

- `libphonenumber-js` (default metadata) and `i18n-iso-countries` run in Hermes and in Jest (`jest-expo`)
  without native code; if either needs a Jest transform or mapping, adding it to `jest.config.js` is part of the
  task that installs it.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
