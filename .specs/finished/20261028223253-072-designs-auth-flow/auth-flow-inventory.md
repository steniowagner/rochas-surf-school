# Auth flow inventory (spec 072)

Every frame `auth-flow.html` and `/{lang}/designs/auth-flow` must show. Each entry has a stable id
(`AF-<section number>-<entry number>`): the `.html` prints it in the entry's label, and the web page puts it in the
entry's `data-design-id` attribute. Every entry is one iOS phone frame (402 × 874) of the whole screen, with the stack
header where the app draws one (the back button on the auth screens after sign-in; no header on the other flows).

An entry "matches the code" by the fidelity rule of spec 071 (D-08): the same elements in the same order, the same
copy, the same color, type and radius tokens and the same icon glyphs as the app renders for that state. Pixel-exact
sizes and the mock data's values aren't judged. The mock account is `people` of
`apps/web/src/modules/designs/data/fortaleza.ts` (Ana Beatriz Lima, `ana.lima@email.com`).

"Other messages" are the texts the same element can show in that state; they aren't frames of their own (D-02). The
entry's note lists them, in the page's language, with the app's copy.

Sources: the route files under `apps/mobile/src/app/{(public)/auth,(pending)/pending,(onboarding)/onboarding,(rules-update)/rules-update,(reactivation)/reactivation,(offboarding)/offboarding}/`,
the screens and components of `apps/mobile/src/modules/{auth,pending,onboarding,school-rules,rules-update,reactivation,offboarding}/`,
`apps/mobile/src/components/{account-status,contact-school-button,whatsapp-number-form,phone-number-field,country-picker,language-sheet}/`,
the toasts of `apps/mobile/src/providers/alert-message/`, the error-key maps in `apps/mobile/src/modules/auth/utils/`,
and the copy in `packages/app-messages`.

## 01 — Sign-in

The sign-in screen always uses the light palette, in both themes, as the app does.

| Id | Entry | State |
| --- | --- | --- |
| AF-01-01 | Sign-in | The team photo (grayscale, grape tint and fade), the waves tile, the language button (flag, acronym, chevron), the "Rocha's Surf School" wordmark, "Continuar com o Google" (light, Google logo), "Continuar com e-mail" (primary, mail icon) and the terms line with its two links. No Apple button. |
| AF-01-02 | Sign-in — language sheet | AF-01-01 with the language sheet open, the current language selected. |
| AF-01-03 | Sign-in — Google loading | The Google button showing its spinner. |
| AF-01-04 | Sign-in — Google error | AF-01-01 with the toast `googleSignIn.tokenInvalid`. Other messages: `googleSignIn.emailNotVerified`, `googleSignIn.playServices`, `createAccount.errors.noConnection`, `createAccount.errors.generic`. |
| AF-01-05 | Sign-in — session expired | AF-01-01 with the toast `session.expired`. |

## 02 — Email

| Id | Entry | State |
| --- | --- | --- |
| AF-02-01 | Email choice | Back button, the mail intro (`emailChoice.title`, `emailChoice.subtitle`), the two choice rows ("Já tenho conta", "É minha primeira vez") and the terms line at the bottom. |
| AF-02-02 | Email sign-in — empty | The sign-in intro, the empty email field with its placeholder, the "create account" line, "Receber código" disabled, the terms line. |
| AF-02-03 | Email sign-in — invalid email | The field in the error state with `emailSignIn.emailInvalid` below it; the button disabled. |
| AF-02-04 | Email sign-in — sending | A valid email typed; the button showing its spinner. |
| AF-02-05 | Email sign-in — send error | A valid email typed, the button enabled, the toast `createAccount.errors.sendFailed`. Other messages: the keys `getSignInCodeErrorKey` returns (`createAccount.errors.invalidEmail`, `createAccount.errors.tooManyAttempts`, `createAccount.errors.noConnection`, `createAccount.errors.generic`). |
| AF-02-06 | Create account — empty | The create-account intro, the empty name and email fields, "Receber código" disabled, the terms line. |
| AF-02-07 | Create account — invalid fields | Both fields in the error state, with `createAccount.nameInvalid` and `createAccount.emailInvalid`; the button disabled. |
| AF-02-08 | Create account — sending | Both fields filled; the button showing its spinner. |
| AF-02-09 | Create account — send error | Both fields filled, the toast `createAccount.errors.sendFailed`. Other messages: as AF-02-05. |
| AF-02-10 | Confirm code — counting down | The intro with the email in bold, the six empty code boxes, "Confirmar" disabled, `confirmCode.resendIn` with a time, the "didn't arrive" card with its link. |
| AF-02-11 | Confirm code — resend available | The six digits typed, "Confirmar" enabled, the "Reenviar código" link in place of the countdown. |
| AF-02-12 | Confirm code — wrong code | The code boxes in the error state with `confirmCode.errors.wrongCode` below them. Other messages: `confirmCode.errors.expired`, `confirmCode.errors.locked`. |
| AF-02-13 | Confirm code — verifying | The six digits typed, the boxes not editable, the button showing its spinner. |
| AF-02-14 | Confirm code — error toast | The toast `confirmCode.errors.noAccount`. Other messages: `confirmCode.errors.nameNotSaved`, `createAccount.errors.tooManyAttempts`, `createAccount.errors.noConnection`, `createAccount.errors.generic`. |
| AF-02-15 | Google name — empty | The name intro (`googleName.title`, `googleName.description`), the empty name field, "Continuar" disabled. |
| AF-02-16 | Google name — invalid name | The field in the error state with `createAccount.nameInvalid`; the button disabled. |
| AF-02-17 | Google name — sending | A full name typed; the button showing its spinner. |
| AF-02-18 | Google name — error toast | A full name typed, the toast `googleSignIn.tokenInvalid`. Other messages: the keys `getGoogleApiErrorKey` returns. |

## 03 — Approval and onboarding

| Id | Entry | State |
| --- | --- | --- |
| AF-03-01 | Pending approval | The intro (`pending.eyebrow`, `pending.title`, the description with the email in bold), the steps card (created with its date, approval "Em análise", book classes as a future step) and "Terminar sessão" (ghost). |
| AF-03-02 | WhatsApp — empty | The approved intro (check icon, `whatsapp.eyebrow`, the title with the first name, the description), the WhatsApp card (label, phone field with the Brazilian flag and code, helper, the "hide my number" switch off), "Salvar e continuar" disabled. |
| AF-03-03 | WhatsApp — filled | A valid number typed, the switch on, the button enabled. |
| AF-03-04 | WhatsApp — country picker | The country picker sheet open over AF-03-02, with its title, search field and the country list, Brazil selected. |
| AF-03-05 | WhatsApp — invalid number | The phone field in the error state with `whatsapp.invalidNumber`; the button disabled. |
| AF-03-06 | WhatsApp — saving | AF-03-03 with the button showing its spinner. |
| AF-03-07 | WhatsApp — save error | AF-03-03 with the toast `createAccount.errors.noConnection`. Other messages: `whatsapp.invalidNumber`, `createAccount.errors.generic`. |
| AF-03-08 | School rules — loading | The rules intro (`schoolRules.eyebrow`, `schoolRules.title`, `schoolRules.description`), the rules card with its spinner, the unchecked acceptance checkbox and "Entrar no app" disabled. |
| AF-03-09 | School rules — loaded | The rules card with the numbered rules (title and description each), the checkbox unchecked, the button disabled. |
| AF-03-10 | School rules — accepted | AF-03-09 with the checkbox checked and the button enabled. |
| AF-03-11 | School rules — load error | The rules card with `schoolRules.loadError` and the "retry" button (subtle). |
| AF-03-12 | School rules — empty | The rules card with `schoolRules.empty`. |
| AF-03-13 | School rules — outdated | AF-03-10 with the toast `schoolRules.outdated`. Other messages: `createAccount.errors.noConnection`, `createAccount.errors.generic`. |
| AF-03-14 | Rules update | The same screen with the `rulesUpdate` eyebrow, title, description and button, loaded. Its loading, error, empty and toast states are those of AF-03-08 to AF-03-13. |

## 04 — Closed account

Every screen of this section ends with "Usar outro email" (ghost). The tiles and icons are those of `AccountStatus` as each screen sets them (`tone`, `icon`). The contact button is "Falar com a escola"
(WhatsApp glyph); the app hides it when the school has no WhatsApp number.

| Id | Entry | State |
| --- | --- | --- |
| AF-04-01 | Reactivation — not requested | The dim tile with its icon, `reactivation.notRequested` eyebrow, title, description (email in bold) and note card, the request button (primary). |
| AF-04-02 | Reactivation — requesting | AF-04-01 with the request button showing its spinner. |
| AF-04-03 | Reactivation — request error | AF-04-01 with the toast `createAccount.errors.generic`. Other messages: `createAccount.errors.noConnection`, `reactivation.accountChanged`. |
| AF-04-04 | Reactivation — requested | The sand tile with the send icon, `reactivation.requested` eyebrow, title, description and note card; no request button. |
| AF-04-05 | Reactivation — denied with a reason | The bad tile with the close-circle icon, `reactivation.denied` eyebrow, title and description, the note card with `reactivation.denied.noteTitle` and the admin's reason (D-04). |
| AF-04-06 | Reactivation — denied without a reason | AF-04-05 without the note card. |
| AF-04-07 | Registration denied with a reason | The bad tile with the close icon, `denied` eyebrow, title and description, the note card with the admin's reason, the contact button. |
| AF-04-08 | Registration denied without a reason | AF-04-07 without the note card. |
| AF-04-09 | Registration denied — no school number | AF-04-07 without the contact button. |
| AF-04-10 | Removed | The bad tile with the account-minus icon, `removed` eyebrow, title, description and note card, the contact button. |
| AF-04-11 | Removed — no school number | AF-04-10 without the contact button. |
| AF-04-12 | Contact error | AF-04-10 with the toast `closedAccount.whatsappUnavailable` (the same toast on AF-04-07). |
