---
id: "009"
slug: brazilian-whatsapp-mask
title: Format Brazilian WhatsApp numbers as they are typed
template: quick
status: in-progress
created: 2026-10-11
started: 2026-10-11
base_commit: ec393b3d9c892451b543be0f49409d8c545cdcfc
fronts: [mobile]
depends_on: []
---

# 009 — Format Brazilian WhatsApp numbers as they are typed

## Goal

On the onboarding WhatsApp screen, when Brazil (+55) is the selected country, the number field formats the
digits as the person types them, `(XX) XXXX-XXXX` for a landline and `(XX) XXXXX-XXXX` for a mobile. What is
sent and stored doesn't change: the number is still saved in E.164.

## Context

- Requirements: [requirements.md → WhatsApp number format](../../../.docs/requirements.md#whatsapp-number-format)
  — numbers include a country code, Brazil (+55) is preselected and a Brazilian number is saved with +55. The
  mask only changes how the Brazilian number is shown while typing.
- Brazilian numbering (Anatel, via [Telephone numbers in Brazil](https://en.wikipedia.org/wiki/Telephone_numbers_in_Brazil)):
  a two-digit area code (DDD) followed by 8 digits for a landline (`nnnn-nnnn`) or 9 digits for a mobile
  (`nnnnn-nnnn`, nationwide since 6 November 2016). WhatsApp numbers are almost always mobile.
- Existing code this changes:
  - `apps/mobile/src/modules/onboarding/components/whatsapp/whatsapp.hook.ts` — keeps the raw `typed` text as
    the field value and turns it into E.164 with `toE164` (`parsePhoneNumberFromString(typed, country)`).
  - `apps/mobile/src/modules/onboarding/components/whatsapp/whatsapp.component.test.tsx` — types
    `85 99999-8888` for Brazil and expects the field to keep it after an API error.
  - `apps/mobile/src/modules/onboarding/utils/countries.ts` — `DEFAULT_COUNTRY` (`BR`), `getDialCode`.

## Scope

### In scope

- The Brazilian mask on the WhatsApp number field of the onboarding WhatsApp screen, with tests.

### Out of scope

- Masks for any other country (their field keeps what was typed, as today).
- A placeholder in the number field.
- Any change to validation, to what is sent (`whatsappNumber` in E.164) or to the backend.
- Restoring the cursor position after an edit in the middle of the number.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The mask is a small pure function written for this, in `src/modules/onboarding/utils/brazilian-phone.ts`, not `libphonenumber-js`'s `AsYouType`. | `AsYouType`'s partial formatting is hard to predict while typing and turns international when the input starts with `+`; a pure function is deterministic and easy to test. |
| D-02 | While Brazil is selected, the hook stores only the number's digits and the field shows `formatBrazilianPhone(digits)`. E.164 is still built from what is stored (`toE164`). For every other country the hook stores and shows the typed text as today. | One source of truth for the digits; validation and saving keep working unchanged. |
| D-03 | The mask depends on the digit count: 1–2 digits `(D` / `(DD`, 3–6 `(DD) DDDD`, 7–10 `(DD) DDDD-DDDD`, 11 `(DD) DDDDD-DDDD` (the dash moves when the 11th digit is typed). The mask never ends with a separator, so backspace at the end always removes a digit. Non-digits are dropped; when the input has more than 11 digits and starts with `55` (a pasted or autofilled `+55 …`), the leading `55` is dropped; then the digits are capped at 11. | The request asked for `(XX) XXXX-XXXX`, but Brazilian mobiles have 9 digits; the user accepted the variable mask. `55` is itself a valid DDD, so it is dropped only when there are too many digits. |
| D-04 | Changing the country keeps the stored text: picking Brazil shows its digits masked (after the D-03 clean-up), picking another country shows the stored text unmasked. | Keeps the change small and predictable. |

## Expected Results

### ER-01 — Brazilian numbers are masked while typing

- **Front:** mobile
- **Behavior:** Given the WhatsApp screen with Brazil (+55) selected, when the person types digits, then the
  field shows them as `(8`, `(85`, `(85) 9`, `(85) 9999`, `(85) 3333-4` … `(85) 3333-4444` (10 digits) and
  `(85) 99999-8888` (11 digits).
- **Edge and error cases:** typing `abc` leaves the field empty and "Salvar e continuar" disabled; a 12th digit
  is ignored (`(85) 99999-8888` stays); pasting `+55 85 99999-8888` shows `(85) 99999-8888`; pasting
  `55 99999-8888` (DDD 55, 11 digits) shows `(55) 99999-8888`; deleting the last digit of `(85) 9999-9` shows
  `(85) 9999`, and of `(85) 9` shows `(85`.
- **Verify by:** `npx jest src/modules/onboarding/utils/brazilian-phone.test.ts src/modules/onboarding/components/whatsapp`
  (from `apps/mobile`) · `brazilian-phone.test.ts` and the masking tests in `whatsapp.component.test.tsx`.

### ER-02 — Saving and other countries are unchanged

- **Front:** mobile
- **Behavior:** Given Brazil selected and `(85) 99999-8888` in the field, when the person taps "Salvar e
  continuar", then `PUT /auth/me/whatsapp` is sent with `whatsappNumber: "+5585999998888"`.
- **Edge and error cases:** a 10-digit landline `(85) 3333-4444` is sent as `+558533334444`; after switching to
  Portugal the field shows the plain digits `85999998888`, and typing `912 345 678` there shows it as typed and
  sends `+351912345678`; switching back to Brazil masks the stored digits again; when the save fails with an API
  error the field still shows `(85) 99999-8888`.
- **Verify by:** `npx jest src/modules/onboarding/components/whatsapp` (from `apps/mobile`) ·
  `whatsapp.component.test.tsx`.

## Tasks

### Mobile (`apps/mobile`)

- [ ] **T-01** — Add `toBrazilianDigits(text)` (D-03's clean-up: digits only, a leading `55` dropped when there
  are more than 11 digits, capped at 11) and `formatBrazilianPhone(digits)` (D-03's mask) in
  `src/modules/onboarding/utils/brazilian-phone.ts`, with `brazilian-phone.test.ts` covering every digit count
  from 0 to 11, letters, the 12th digit, `+55 …`, a `55` DDD and the no-trailing-separator rule. Follow
  `.claude/rules/react.md` and the `vercel-react-native-skills` skill.
  Covers: ER-01 · Done when: `npx jest src/modules/onboarding/utils/brazilian-phone.test.ts` passes with every
  line of `brazilian-phone.ts` covered.
- [ ] **T-02** — Use them in `src/modules/onboarding/components/whatsapp/whatsapp.hook.ts` (D-02, D-04): when the
  country is `BR`, `onChangeText` stores `toBrazilianDigits(text)` and the field value is
  `formatBrazilianPhone(toBrazilianDigits(typed))`; other countries keep the current behavior. In
  `whatsapp.component.test.tsx`, add tests for ER-01's typing, letters, 12th digit, pasted `+55` and backspace
  cases and ER-02's landline save, country switch both ways and saved E.164, and update the existing API-error
  test to expect `(85) 99999-8888`. Follow `.claude/rules/react.md` and the `vercel-react-native-skills` skill.
  Covers: ER-01, ER-02 · Done when: `npx jest src/modules/onboarding` passes.

### Verification

- [ ] **T-03** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 009` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 009` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors.
- Manual (iOS simulator): on the onboarding WhatsApp screen with Brazil selected, type `85999998888` and see
  `(85) 99999-8888`, backspace to `(85) 9999`, switch to Portugal and see `859999`, then back to Brazil and see
  `(85) 9999`.

## Memory Impact

- `memory/technical-context.md` — the Phone numbers line: with Brazil selected, the WhatsApp field keeps only the
  digits and shows them masked (`(XX) XXXX-XXXX` / `(XX) XXXXX-XXXX`, `brazilian-phone.ts`); E.164 is still what
  is sent.

## Amendments

## Review
