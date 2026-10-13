---
id: "026"
slug: profile-tab
title: Role tab bars and the Profile tab
status: in-progress
created: 2026-10-13
started: 2026-10-13
base_commit: 827f464962e4ab8de918f1aa64387c3f073de528
fronts: [auth, notifications, backend, mobile]
depends_on: []
---

# 026 — Role tab bars and the Profile tab

## Goal

Approved students, instructors and admins get the tab bar of their role instead of a single placeholder home,
and one Profile tab shared by the three roles. From Profile a person sees who they are, edits their name and
WhatsApp number, picks the app's theme and language, turns pushes on or off on this phone, reads the school
rules, opens the About sheet, the privacy policy and the terms of use, and signs out. The other tabs stay
placeholders that later specs fill.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: **User** (name, WhatsApp number and
  visibility, role, preferences: language, theme, phone pushes), **Notification** (pushes are the only outbound
  channel; turning pushes off never hides notifications), **School rules** (readable by any approved account at
  any time), the decisions "Pushes are the only notification channel" and "One account per email address, and the
  email never changes".
- Requirements: [requirements.md → Editing one's profile](../../../.docs/requirements.md#editing-ones-profile)
  (the name only; the photo is out of scope),
  [→ WhatsApp number visibility](../../../.docs/requirements.md#whatsapp-number-visibility),
  [→ Fixed email address](../../../.docs/requirements.md#fixed-email-address),
  [→ Signing out](../../../.docs/requirements.md#signing-out),
  [→ Reading the rules](../../../.docs/requirements.md#reading-the-rules),
  [→ Push setting](../../../.docs/requirements.md#push-setting),
  [→ Languages](../../../.docs/requirements.md#languages),
  [→ Default language](../../../.docs/requirements.md#default-language),
  [→ Theme](../../../.docs/requirements.md#theme).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications →
  `apps/mobile` (session, push, i18n, SecureStore), Fixed conventions (Mobile shared UI, Mobile routes, Mobile
  flows, design system), Authentication (account shape `AccountOut`, `PUT /auth/me/whatsapp`, sign-out with
  `pushToken`, mobile sign-out), External integrations → Push notifications, Automated validation.
- Modules: [modules/auth.md](../../memory/modules/auth.md),
  [modules/notifications.md](../../memory/modules/notifications.md),
  [modules/school-rules.md](../../memory/modules/school-rules.md).
- Designs: `.docs/designs/instructor-app.html` → section "Perfil", screens PERFIL-01 to PERFIL-07, is the source
  of truth for the Profile tab of **every** role (`student-app.html` PERFIL-01–09 and `admin-app.html`
  PERFIL-01–02 are references only). The designs are in European Portuguese and draw raw values; the design
  tokens and the existing components win over them, and the copy is the Copy table below (Brazilian
  Portuguese). The tab bars come from each design's `tabBarView`: student "Agenda / As minhas / Escola /
  Perfil", instructor and admin "Painel / Aulas / Perfil".
- Existing code this builds on:
  - `apps/mobile/src/app/(private)/{student,instructor,admin}/_layout.tsx` — a plain `Stack` per role today;
    `index.tsx` renders `StudentScreen` / `InstructorScreen` (`FlowPlaceholder`) or `AdminScreen` ("School
    tools"); `admin/registrations.tsx` is "Join the school".
  - `apps/mobile/src/navigation/resolve-flow.ts` — `flowEntryRoute` sends each role to `/student`, `/instructor`
    or `/admin`; unchanged by this spec.
  - `apps/mobile/src/providers/session` — `useSession().user` already carries `name`, `email`, `role`,
    `whatsappNumber` and `whatsappVisible`; `updateUser(user)` stores an answer that carries the account.
  - `apps/mobile/src/modules/auth/hooks/use-sign-out.hook.ts` — local-first sign-out that also ends the sign-in
    on the backend and removes the registered push token.
  - `apps/mobile/src/modules/auth/components/language-sheet/` — the sign-in screen's language sheet;
    `i18n.changeLanguage` only, nothing stored. `src/i18n/index.ts` starts from `getDeviceLocale()`.
  - `apps/mobile/src/app/_layout.tsx` — picks the light or dark `themeVariables` from `useColorScheme()` (the OS
    only today).
  - `apps/mobile/src/modules/notifications/hooks/use-push-registration.hook.ts` and
    `src/services/push/push.service.ts` — register the phone's token (`PUT /notifications/push-token`) and keep
    the registered token in module state.
  - `apps/mobile/src/modules/onboarding/components/whatsapp/` and `components/country-picker/` — the onboarding
    WhatsApp form (country, Brazilian mask, "Hide my number"); `use-save-whatsapp.hook.ts` calls
    `PUT /auth/me/whatsapp`.
  - `apps/mobile/src/modules/school-rules/components/school-rules-list/` and `hooks/use-school-rules.hook.ts` —
    the reusable rules list and its query on `GET /school-rules`.
  - `apps/mobile/src/modules/auth/utils/field-validation.ts` — `nameRules()`, the same rules as
    `User.validate()`.
  - `modules/auth/src/user/usecase/set-whatsapp.usecase.ts` — the pattern for a "change my account" use case
    that answers `AccountOut`.
  - `modules/notifications/src/push-token/usecase/remove-push-token.usecase.ts` — `RemovePushToken`
    (`deleteForUser(userId, token)`), used by sign-out; no validation.
  - `apps/backend/src/modules/auth/auth.controller.ts` (`/auth/me/*`) and
    `apps/backend/src/modules/notifications/notifications.controller.ts` (`PUT /notifications/push-token`).

## Scope

### In scope

- Native tab bars for the three roles (D-01–D-03), with placeholder tabs except Profile and the admin's Home.
- The Profile tab (D-04), the same for every role, and its inner screens: Edit profile (name), WhatsApp, School
  rules (read-only); its sheets: Theme, Language, About (mocked), Sign out.
- `PUT /auth/me/name` (`SetName` in `modules/auth`).
- `DELETE /notifications/push-token` (`UnregisterPushToken` in `modules/notifications`).
- Device preferences (theme, language, pushes) kept on the phone.
- Links to the web privacy policy and terms of use.
- The copy below in pt-BR, es-ES and en-US.

### Out of scope

- Uploading or changing the profile photo: the Edit profile screen shows the avatar with its camera button, which
  only says "coming soon".
- Splitting the name into first and last name.
- Deleting the account ("Remover a conta", PERFIL-08): the row is not shown.
- The content of the cancellation rules: the row only says "coming soon".
- Real data in the About sheet: everything in it is mocked.
- Managing the school rules (admins read them like everyone here).
- The content of every tab other than Profile and the admin's Home.
- The notifications screen and badges.
- Storing the preferences on the backend, or syncing them across devices.
- Changing the access JWT: the WhatsApp visibility comes from the session's account.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Tab bars use Expo Router's native tabs (`NativeTabs` from `expo-router/unstable-native-tabs`), one `(tabs)` group per role inside the role's existing `Stack`: `src/app/(private)/<role>/(tabs)/_layout.tsx` plus one route file per tab. Selected tint `sun`, unselected `ink-3`, bar background `page`, all through `useTheme()` (token values); labels are drawn by the system (not uppercase Barlow). | `vercel-react-native-skills` → `navigation-native-navigators`, which CLAUDE.md makes mandatory; chosen by the user over a custom JS tab bar matching the design. |
| D-02 | Tabs, labels from the Copy table, icons as SF Symbol (iOS) / Material icon (Android): **student** — Agenda `calendar` / `calendar_today` (route `/student`, the first tab), Minhas aulas `figure.surfing` / `surfing` (`/student/my-classes`), Escola `person.2` / `group` (`/student/school`), Perfil `person.crop.circle` / `person` (`/student/profile`); **instructor and admin** — Início `house` / `home` (`/instructor`, `/admin`), Aulas `calendar` / `calendar_today` (`/<role>/classes`), Perfil `person.crop.circle` / `person` (`/<role>/profile`). | Labels proposed and accepted in planning: "Início/Home" instead of "Painel" because metrics dashboards are out of scope and the admin's tab holds "School tools". |
| D-03 | Tab content: the admin's Início is today's `AdminScreen` ("School tools"); the instructor's Início is today's `InstructorScreen` and the student's Agenda today's `StudentScreen`; every other tab except Perfil renders `FlowPlaceholder` with the tab's label. "Join the school" (`/admin/registrations`) and the profile's inner screens (`/<role>/edit-profile`, `/<role>/whatsapp`, `/<role>/school-rules`) are routes of the role's `Stack`, outside `(tabs)`: they open above the tab bar, without it, and use `BackButton`. Every path is in `src/constants/routes.ts` (`routes.<role>.<screen>`); `flowEntryRoute` and `resolveFlow` don't change. | Inner screens pushed above the tabs is the native pattern and keeps the existing back behavior; the role paths stay the flows' entry routes. |
| D-04 | One Profile screen for the three roles (`apps/mobile/src/modules/profile/screens/profile.screen.tsx`), every role's `(tabs)/profile.tsx` renders it. Top to bottom: the avatar (initials of the session's name, `getInitials`, 112 pt circle on `bg-sand` with `text-grape`), the name (screen-title type style), a `Chip` with the role label; then four cards of rows: **1** Editar perfil (pencil) → Edit profile; WhatsApp (WhatsApp glyph, right value "Visível"/"Oculto") → WhatsApp screen; Tema (sun/moon, right value: current choice) → Theme sheet; Idioma (languages, right value: current language name) → Language sheet. **2** Notificações push with a switch, and the note under the card. **3** Regras da escola → School rules screen; Regras de cancelamento → "coming soon" toast; Sobre o app → About sheet; Política de privacidade and Termos de uso → web pages (D-10). **4** Sair → Sign out sheet. Each row is a `Pressable` at least 44 pt tall with a leading icon in `lagoon`, the label, an optional right value in `ink-2` and a chevron in `ink-3` (no chevron on Sair and the switch row). No "Remover a conta" row. | Instructor PERFIL-01 is the source of truth for every role (user); the legal links move from About into card 3 (user); deletion and photo upload are out of scope. |
| D-05 | "Coming soon": tapping "Regras de cancelamento", or the camera button on Edit profile, shows the toast `profile.comingSoon` through `useAlertMessage()` and nothing else. | The user wants the items built now and their content later; a silent tap would look broken. |
| D-06 | Name: Edit profile (`/<role>/edit-profile`) shows the avatar with the camera button (D-05; accessibility label `editProfile.changePhoto`), the name `TextInput` prefilled with the session's `name`, the email read-only with the hint "can't be changed", and a primary "Salvar". Save is enabled only when the trimmed name differs from the session's name and passes `nameRules()`. Saving calls `PUT /auth/me/name` `{ name }` (authenticated, no retry); 200 → `updateUser(answer)` and `router.back()`; 422 `user.name.*` → toast `createAccount.nameInvalid` (the existing key); `NetworkError` → the no-connection toast; anything else → the generic toast; `SessionExpiredError` → nothing. No success toast (the toast is styled for problems; the updated header is the feedback). | One name field, like every other place that collects it (user: "just the name"); the same rules as the backend. |
| D-07 | `SetName` (`modules/auth/src/user/usecase/set-name.usecase.ts`), in `{ userId, name }`, out `AccountOut`: unknown user → 401 `auth.token.invalid`; status not `approved` → 403 `user.status.notApproved`; `name` not a string → 422 `user.name.required`; otherwise the name is trimmed, set with `clone()`, `validate()`d (422 `user.name.*` from the entity) and saved with `update()`. Exposed as `PUT /auth/me/name` (protected, 200, the account shape). Changing only the name, nothing else. | Same shape and checks as `SetWhatsapp`; the trim matches what Google sign-in stores. |
| D-08 | WhatsApp: the profile row's value is `profile.whatsappVisible` when the session's `whatsappVisible` is `true`, else `profile.whatsappHidden` — read from the session, no JWT change. The WhatsApp screen (`/<role>/whatsapp`) reuses the onboarding form, extracted into a shared component (`apps/mobile/src/components/whatsapp-number-form/`, onboarding behavior and tests unchanged), prefilled from the session: the country parsed from `whatsappNumber` (`libphonenumber-js`), the national number (masked for Brazil) and the share switch. Save ("Salvar") is enabled only when the number is valid for the country and the number or the switch changed; it calls the existing `PUT /auth/me/whatsapp`; 200 → `updateUser(answer)` and `router.back()`; errors as in D-06 with the onboarding's existing keys. | The access JWT is `{ sub, email }` and short-lived; the session's account is already the source the app routes by, and an edit updates it at once. |
| D-09 | Device preferences live in SecureStore under `prefs.theme` (`"system"` \| `"light"` \| `"dark"`, absent → `"system"`), `prefs.locale` (`"en-US"` \| `"es-ES"` \| `"pt-BR"`, absent → the phone's language as today) and `prefs.pushEnabled` (`"true"` \| `"false"`, absent → on), in `apps/mobile/src/services/preferences/`. They are read with the synchronous `SecureStore.getItem` at startup and written on every change; an unreadable or unknown value counts as absent. They are device settings: signing out keeps them. Theme: `"system"` follows the OS; `"light"`/`"dark"` are applied app-wide with `Appearance.setColorScheme`, so `useColorScheme()` (root layout, `useTheme()`) follows the choice. Language: `src/i18n/index.ts` starts from the stored locale when there is one; choosing a language — in the profile or on the sign-in screen — calls `i18n.changeLanguage` and stores it. `LanguageSheet` moves from `modules/auth/components/` to `src/components/language-sheet/` and is used by both screens. | The user decided these preferences stay on the device. SecureStore is already installed (no native rebuild) and its synchronous read avoids a frame in the wrong theme or language. |
| D-10 | Push setting: the switch shows `prefs.pushEnabled`. **Off** → store `false`; if the OS permission is already granted, get this phone's token without asking and send `DELETE /notifications/push-token` `{ token }` (authenticated; any failure ignored), then clear the registered token. While off, `usePushRegistration` never sends `PUT /notifications/push-token`; at each run it instead sends the same DELETE when the permission is granted, so a failed DELETE heals at the next launch or sign-in. **On** → store `true` and register at once (the OS dialog shows when the permission is undetermined); if the permission ends up denied, store `false`, keep the switch off and show the toast `profile.pushDenied`. Turning pushes off never touches the stored notifications. `getPushToken` gains an option not to ask for the permission. | The preference stays on the phone (user), but only removing the token stops pushes — iOS and Android show background pushes without asking the app. |
| D-11 | `UnregisterPushToken` (`modules/notifications/src/push-token/usecase/unregister-push-token.usecase.ts`), in `{ userId, token }`: `token` missing, not a string or empty → 422 `pushToken.token.required`; else `deleteForUser(userId, token)` (a token of another account, or an unknown one, changes nothing). Exposed as `DELETE /notifications/push-token` (protected, body `{ token }`, 204), allowed for any status. | Removing one's own token is always harmless; the sign-out path keeps using `RemovePushToken` unchanged. |
| D-12 | Privacy policy and terms of use open in the in-app browser (`expo-web-browser` `openBrowserAsync`) at `{EXPO_PUBLIC_WEB_URL}/{lang}/privacy-policy` and `{EXPO_PUBLIC_WEB_URL}/{lang}/terms-of-use`, `lang` being `pt-br`, `es` or `en` for the app's current language (a trailing `/` in the variable is dropped). Without `EXPO_PUBLIC_WEB_URL` both rows are hidden. A rejected open shows the generic toast. `apps/mobile/.env.example` gets `EXPO_PUBLIC_WEB_URL=http://localhost:3000`. | The site isn't deployed (spec 022), so its address is configuration; hiding the rows follows the "contact the school" pattern of spec 016. |
| D-13 | About sheet (`BottomModal`): the app icon tile (`bg-sun`, waves glyph), "Rocha's Surf School", the version line, the description, the creator (initials avatar, name, role line) and three link rows (repository, creator's GitHub, creator's LinkedIn) that open in the in-app browser, and a "Fechar" button. All values are mocked constants in `apps/mobile/src/modules/profile/constants/about.ts`: version `"0.9 · beta"`, creator `"Stenio Wagner"`, links `https://github.com/steniowagner/rochas-surf-school`, `https://github.com/steniowagner`, `https://www.linkedin.com/in/steniowagner`. No privacy or terms link in it. | The user asked to mock the About content and to move the legal links out of it. |
| D-14 | Sign out: "Sair" opens a `BottomModal` with "Sair da conta?", the description, a danger-styled "Sair" (log-out icon) and a ghost "Cancelar". "Sair" closes the sheet and calls the existing `useSignOut` (session cleared at once, `POST /auth/sign-out` with the refresh and push tokens, Google sign-out); the flow guards return the app to the sign-in screen. "Cancelar", the backdrop or a drag down close it and change nothing. | Instructor PERFIL-07; `useSignOut` already ends the session on the phone and on the backend. |
| D-15 | Theme sheet: title, description and three rows — `theme.system` (sliders icon), `theme.light` (sun), `theme.dark` (moon) — with a check on the current one; tapping a row applies it (D-09) and closes the sheet. The profile's Tema row shows the current choice and a sun or moon icon for the theme in effect. | Instructor PERFIL-03. |
| D-16 | Mobile has no e2e suite, so the mobile results are proven by Jest + RNTL tests (route tests with `renderRouter`) plus the user journeys of the Verification Plan; the backend results by Vitest unit tests and the backend e2e suite. | technical-context → Automated validation. |

### Copy

`{{…}}` are i18next interpolations. Key names are a suggestion; the text is the contract. Existing keys that are
reused (`createAccount.nameInvalid`, the no-connection and generic errors, the language sheet's copy, the
onboarding WhatsApp and school rules keys) keep their text.

| Key | en-US | pt-BR | es-ES |
| --- | --- | --- | --- |
| `tabs.agenda` | Schedule | Agenda | Agenda |
| `tabs.myClasses` | My classes | Minhas aulas | Mis clases |
| `tabs.school` | School | Escola | Escuela |
| `tabs.home` | Home | Início | Inicio |
| `tabs.classes` | Classes | Aulas | Clases |
| `tabs.profile` | Profile | Perfil | Perfil |
| `profile.role.student` | Student | Aluno | Alumno |
| `profile.role.instructor` | Instructor | Instrutor | Instructor |
| `profile.role.admin` | Admin | Admin | Admin |
| `profile.editProfile` | Edit profile | Editar perfil | Editar perfil |
| `profile.whatsapp` | WhatsApp | WhatsApp | WhatsApp |
| `profile.whatsappVisible` | Visible | Visível | Visible |
| `profile.whatsappHidden` | Hidden | Oculto | Oculto |
| `profile.theme` | Theme | Tema | Tema |
| `profile.language` | Language | Idioma | Idioma |
| `profile.push` | Push notifications | Notificações push | Notificaciones push |
| `profile.pushNote` | Notifications always stay in the app. Here you only choose whether they also reach your phone. | Os avisos ficam sempre no app. Aqui você só escolhe se eles também chegam ao seu celular. | Los avisos siempre quedan en la app. Aquí solo eliges si también llegan a tu teléfono. |
| `profile.pushDenied` | Allow notifications for the app in your phone's settings. | Permita as notificações do app nos ajustes do celular. | Permite las notificaciones de la app en los ajustes del teléfono. |
| `profile.schoolRules` | School rules | Regras da escola | Reglas de la escuela |
| `profile.cancellationRules` | Cancellation rules | Regras de cancelamento | Reglas de cancelación |
| `profile.about` | About the app | Sobre o app | Acerca de la app |
| `profile.privacyPolicy` | Privacy policy | Política de privacidade | Política de privacidad |
| `profile.termsOfUse` | Terms of use | Termos de uso | Términos de uso |
| `profile.signOut` | Sign out | Sair | Cerrar sesión |
| `profile.comingSoon` | Coming soon. | Em breve. | Próximamente. |
| `signOutSheet.title` | Sign out? | Sair da conta? | ¿Cerrar sesión? |
| `signOutSheet.description` | To come back, just sign in again with the same account. | Para voltar, é só entrar de novo com a mesma conta. | Para volver, solo inicia sesión otra vez con la misma cuenta. |
| `signOutSheet.confirm` | Sign out | Sair | Cerrar sesión |
| `signOutSheet.cancel` | Cancel | Cancelar | Cancelar |
| `themeSheet.title` | Theme | Tema | Tema |
| `themeSheet.description` | Until you choose, the app follows your phone's theme. | Até você escolher, o app segue o tema do celular. | Hasta que elijas, la app sigue el tema del teléfono. |
| `theme.system` | Same as phone | Igual ao celular | Igual que el teléfono |
| `theme.light` | Light | Claro | Claro |
| `theme.dark` | Dark | Escuro | Oscuro |
| `editProfile.title` | Edit profile | Editar perfil | Editar perfil |
| `editProfile.nameLabel` | Name | Nome | Nombre |
| `editProfile.emailLabel` | Email | E-mail | Correo electrónico |
| `editProfile.emailHint` | Your email can't be changed. | Seu e-mail não pode ser alterado. | Tu correo no se puede cambiar. |
| `editProfile.changePhoto` | Change profile photo | Mudar foto de perfil | Cambiar foto de perfil |
| `editProfile.save` | Save | Salvar | Guardar |
| `profileWhatsapp.title` | WhatsApp | WhatsApp | WhatsApp |
| `profileWhatsapp.description` | Admins always see your number. Choose whether students and instructors can see it too. | Os admins sempre veem seu número. Escolha se alunos e instrutores também podem ver. | Los admins siempre ven tu número. Elige si alumnos e instructores también pueden verlo. |
| `profileWhatsapp.save` | Save | Salvar | Guardar |
| `schoolRulesScreen.title` | School rules | Regras da escola | Reglas de la escuela |
| `schoolRulesScreen.description` | Few and simple, so classes go well for everyone. | Poucas e simples, para as aulas correrem bem para todos. | Pocas y sencillas, para que las clases salgan bien para todos. |
| `about.version` | Version {{version}} | Versão {{version}} | Versión {{version}} |
| `about.description` | A personal project to take class booking out of WhatsApp groups: the week's schedule, seat requests and notices in one place. | Projeto pessoal para tirar a marcação de aulas dos grupos de WhatsApp: agenda da semana, pedidos de vaga e avisos num só lugar. | Proyecto personal para sacar la reserva de clases de los grupos de WhatsApp: agenda de la semana, solicitudes de plaza y avisos en un solo lugar. |
| `about.creatorRole` | Design and development | Design e desenvolvimento | Diseño y desarrollo |
| `about.repository` | App repository | Repositório do app | Repositorio de la app |
| `about.creatorGithub` | Creator's GitHub | GitHub do criador | GitHub del creador |
| `about.creatorLinkedin` | Creator's LinkedIn | LinkedIn do criador | LinkedIn del creador |
| `about.close` | Close | Fechar | Cerrar |

## Expected Results

### ER-01 — An approved account changes its name

- **Front:** backend
- **Behavior:** Given an approved account named "Ana Souza", when it calls `PUT /auth/me/name` with
  `{ "name": "  Ana Clara Souza " }` and its access token, then the API answers 200 with the account shape
  (`AccountOut`) whose `name` is `"Ana Clara Souza"`, and `GET /auth/me` then returns that name; nothing else of
  the account changes.
- **Edge and error cases:** a name the entity rejects (`"A"`, digits, over 80 characters, empty) → 422 with a
  `user.name.*` key and the stored name unchanged; a missing or non-string `name` → 422 `user.name.required`; a
  pending, denied, deleted or removed account → 403 `user.status.notApproved`; no or invalid token → 401
  `auth.token.invalid`.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- set-name` (`test/user/usecase/set-name.usecase.test.ts`)
  and `npm run test:e2e --workspace apps/backend -- auth-profile` (`test/auth-profile.e2e-spec.ts`).

### ER-02 — A device unregisters its own push token

- **Front:** backend
- **Behavior:** Given account A registered token `ExponentPushToken[a]`, when A calls
  `DELETE /notifications/push-token` with `{ "token": "ExponentPushToken[a]" }`, then the API answers 204 and the
  token no longer exists.
- **Edge and error cases:** a token that belongs to account B → 204 and B's token stays; an unknown token → 204,
  nothing changes; a missing, empty or non-string `token` → 422 `pushToken.token.required`; any account status is
  allowed; no token → 401 `auth.token.invalid`.
- **Verify by:** `npm test --workspace @rochas-surf-school/notifications -- unregister-push-token` and the
  `DELETE /notifications/push-token` cases in `apps/backend/test/notifications.e2e-spec.ts`
  (`npm run test:e2e --workspace apps/backend -- notifications`).

### ER-03 — The student's tab bar

- **Front:** mobile
- **Behavior:** Given an approved student who finished onboarding, when the app opens, then it shows a native
  tab bar with "Agenda", "Minhas aulas", "Escola" and "Perfil" (pt-BR; "Schedule", "My classes", "School",
  "Profile" in en-US) with the icons of D-02, the Agenda tab selected (`/student`); tapping each tab shows its
  screen (`/student/my-classes`, `/student/school`, `/student/profile`), the first three a placeholder with the
  tab's label and Perfil the Profile screen.
- **Edge and error cases:** an instructor or admin can't reach any `/student/*` path (the flow guards, unchanged);
  the selected tab tint follows the light and dark theme.
- **Verify by:** route test `apps/mobile/src/modules/student/student-tabs.navigation.test.tsx` — "student opens
  on Agenda and switches tabs" — with `npx jest student-tabs` from `apps/mobile` (never under `src/app/`, where
  Expo Router would read a test file as a route); user journey 1.

### ER-04 — The instructor's and the admin's tab bar

- **Front:** mobile
- **Behavior:** Given an approved instructor (or admin) who finished onboarding, when the app opens, then it shows
  a native tab bar with "Início", "Aulas" and "Perfil" (en-US "Home", "Classes", "Profile"), Início selected
  (`/instructor` / `/admin`). The admin's Início is the "School tools" screen; tapping "Join the school" opens
  `/admin/registrations` above the tabs without the tab bar, and the back button returns to Início with the tab
  bar. The instructor's Início and every role's Aulas show a placeholder with the tab's label.
- **Edge and error cases:** a push tap for `registration.pending` still opens "Join the school" (spec 020); the
  admin's pending count still shows on Início.
- **Verify by:** route tests `apps/mobile/src/modules/instructor/instructor-tabs.navigation.test.tsx` and
  `apps/mobile/src/modules/admin/admin-tabs.navigation.test.tsx` (`npx jest tabs.navigation`), and the existing `admin.screen.test.tsx`,
  `use-notification-response.hook.test.tsx` passing; user journey 1.

### ER-05 — The Profile screen

- **Front:** mobile
- **Behavior:** Given an approved account of any role signed in as "Ana Souza", when it opens Perfil, then it
  sees the initials "AS" in a 112 pt circle, "Ana Souza", a chip with its role ("Aluno", "Instrutor" or "Admin"),
  and the rows of D-04 in that order — Editar perfil, WhatsApp, Tema, Idioma; Notificações push and its note;
  Regras da escola, Regras de cancelamento, Sobre o app, Política de privacidade, Termos de uso; Sair — the same
  for the three roles; no "Remover a conta" row exists.
- **Edge and error cases:** a one-word name shows one initial; every row is at least 44 pt tall; light and dark
  use the token colors.
- **Verify by:** `npx jest src/modules/profile/screens/profile.screen.test.tsx` (one case per role); user journey 2.

### ER-06 — Editing the name

- **Front:** mobile
- **Behavior:** Given the Profile of "Ana Souza", when she taps "Editar perfil", then `/<role>/edit-profile` opens
  above the tabs with the avatar and its camera button, the Nome field containing "Ana Souza", the email
  read-only with "Seu e-mail não pode ser alterado." and "Salvar" disabled; after she types "Ana Clara Souza",
  "Salvar" is enabled, and tapping it sends `PUT /auth/me/name` `{ "name": "Ana Clara Souza" }`, returns to the
  Profile, and the Profile shows "Ana Clara Souza" and the initials "AS" (the session holds the answer).
- **Edge and error cases:** "Salvar" stays disabled for the unchanged name and for a name `nameRules()` rejects;
  a 422 `user.name.*` shows "Enter your first and last name." (existing key) and stays on the screen; no
  connection → the no-connection toast; any other error → the generic toast; tapping the camera button shows
  "Em breve." and nothing else; the back button returns without saving.
- **Verify by:** `npx jest src/modules/profile/screens/edit-profile.screen.test.tsx`; user journey 3.

### ER-07 — WhatsApp visibility and editing the number

- **Front:** mobile
- **Behavior:** Given an account whose session has `whatsappNumber` `+5585999990000` and `whatsappVisible`
  `false`, when it opens Perfil, then the WhatsApp row shows "Oculto"; tapping it opens `/<role>/whatsapp` with
  Brazil selected, "(85) 99999-0000" in the field and the share switch off; after turning the switch on, "Salvar"
  sends `PUT /auth/me/whatsapp` `{ "whatsappNumber": "+5585999990000", "whatsappVisible": true }`, returns to the
  Profile, and the row shows "Visível".
- **Edge and error cases:** a non-Brazilian number opens with its country and the number as stored without the
  code; "Salvar" is disabled while the number is invalid or nothing changed; errors as in ER-06 (the onboarding's
  keys); the onboarding WhatsApp step behaves exactly as before (its tests pass unchanged).
- **Verify by:** `npx jest src/modules/profile/screens/profile-whatsapp.screen.test.tsx` and
  `npx jest src/modules/onboarding`; user journey 4.

### ER-08 — Choosing the theme

- **Front:** mobile
- **Behavior:** Given a phone in light mode and no stored theme, when the person taps "Tema", then a sheet lists
  "Igual ao celular" (checked), "Claro" and "Escuro"; tapping "Escuro" closes the sheet, the app turns dark at
  once, the Tema row shows "Escuro", and after closing and reopening the app it is still dark while the phone
  stays light.
- **Edge and error cases:** "Igual ao celular" makes the app follow the phone again (switching the phone to dark
  turns the app dark); an unknown stored value counts as "Igual ao celular"; the choice survives signing out.
- **Verify by:** `npx jest src/components/theme-sheet src/services/preferences` (selection, storage, startup with a
  stored value); user journey 5.

### ER-09 — Choosing the language

- **Front:** mobile
- **Behavior:** Given a phone in English and no stored language, when the person taps "Language" on the Profile
  and picks "Español", then the app is shown in Spanish at once, the row shows "Español", and after reopening the
  app it is still in Spanish; the same holds for a language picked on the sign-in screen.
- **Edge and error cases:** an unknown stored value counts as absent (the phone's language, as today); the choice
  survives signing out; after the change the phone's push token is registered again with the new locale while
  pushes are on (existing behavior of `usePushRegistration`).
- **Verify by:** `npx jest src/components/language-sheet src/services/preferences src/i18n`; user journey 5.

### ER-10 — Turning pushes off and on

- **Front:** mobile
- **Behavior:** Given pushes on (the default) and this phone's token registered, when the person turns
  "Notificações push" off, then the switch shows off, `DELETE /notifications/push-token` is sent with that token,
  and while it stays off no `PUT /notifications/push-token` is sent at launch, at sign-in or on a language change;
  turning it on sends `PUT /notifications/push-token` again; the setting survives reopening the app.
- **Edge and error cases:** turning it on with the OS permission denied shows "Permita as notificações do app nos
  ajustes do celular.", stores off and keeps the switch off; with the permission undetermined the OS dialog shows;
  a failed DELETE changes nothing on screen, and the DELETE is sent again at the next launch while off; with no
  token available (a simulator) the switch still changes and nothing is sent.
- **Verify by:** `npx jest src/modules/notifications src/modules/profile` (`use-push-preference` and
  `use-push-registration` tests); user journey 6.

### ER-11 — Reading the school rules from the Profile

- **Front:** mobile
- **Behavior:** Given the school has rules, when the person taps "Regras da escola", then `/<role>/school-rules`
  opens above the tabs with the shield tile, "Regras da escola", the description and the rules numbered in the
  admins' order exactly as written, with no checkbox and no button; the back button returns to the Profile.
- **Edge and error cases:** while loading, a loading state; a failed load shows the error and "Tentar novamente",
  which loads again; no rules → the existing "no rules" message; an admin sees the same read-only screen.
- **Verify by:** `npx jest src/modules/school-rules/screens/school-rules.screen.test.tsx`; user journey 7.

### ER-12 — Cancellation rules is not built yet

- **Front:** mobile
- **Behavior:** Given the Profile, when the person taps "Regras de cancelamento", then the toast "Em breve." shows
  and the screen stays on the Profile.
- **Edge and error cases:** none beyond the toast hiding by itself.
- **Verify by:** `npx jest src/modules/profile/screens/profile.screen.test.tsx -t "cancellation rules"`.

### ER-13 — The About sheet

- **Front:** mobile
- **Behavior:** Given the Profile, when the person taps "Sobre o app", then a sheet shows "Rocha's Surf School",
  "Versão 0.9 · beta", the description, "Stenio Wagner" with "Design e desenvolvimento", and the rows "Repositório
  do app", "GitHub do criador" and "LinkedIn do criador", each opening its URL of D-13 in the in-app browser, and
  "Fechar", which closes the sheet; no privacy or terms link is in it.
- **Edge and error cases:** a rejected browser open shows the generic toast.
- **Verify by:** `npx jest src/modules/profile/components/about-sheet`; user journey 8.

### ER-14 — Privacy policy and terms of use

- **Front:** mobile
- **Behavior:** Given `EXPO_PUBLIC_WEB_URL=http://localhost:3000` and the app in pt-BR, when the person taps
  "Política de privacidade", then the in-app browser opens `http://localhost:3000/pt-br/privacy-policy`; "Termos de
  uso" opens `http://localhost:3000/pt-br/terms-of-use`; in es-ES and en-US the paths start with `/es/` and `/en/`.
- **Edge and error cases:** a trailing `/` in the variable gives no double slash; without the variable both rows
  are hidden; a rejected open shows the generic toast.
- **Verify by:** `npx jest src/modules/profile` (`web-pages` util and profile screen tests); user journey 8.

### ER-15 — Signing out from the Profile

- **Front:** mobile
- **Behavior:** Given a signed-in account on Perfil, when it taps "Sair", then a sheet shows "Sair da conta?",
  "Para voltar, é só entrar de novo com a mesma conta.", "Sair" and "Cancelar"; tapping "Sair" clears the session,
  sends `POST /auth/sign-out` with the refresh token (and the registered push token), and the app shows the
  sign-in screen.
- **Edge and error cases:** "Cancelar", the backdrop or dragging the sheet down closes it and the person stays
  signed in; offline, "Sair" still returns to the sign-in screen at once (existing `useSignOut`).
- **Verify by:** `npx jest src/modules/profile` (`sign-out-sheet` and profile screen tests); user journey 9.

## Tasks

### Auth module (`modules/auth`)

- [x] **T-01** — Create `modules/auth/src/user/usecase/set-name.usecase.ts` (`SetName`, `SetNameIn
  { userId, name }`, `SetNameOut = AccountOut`; D-07) exported from the barrel, with
  `modules/auth/test/user/usecase/set-name.usecase.test.ts` covering the trim, every error of D-07 and that only
  the name changes.
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01 · Done when: `npm test --workspace @rochas-surf-school/auth` and
  `npm run check-types --workspace @rochas-surf-school/auth` pass, the new file at 100% coverage.
  > ✅ 2026-10-13 16:41 — Added `SetName` use case (trim, status/exists checks, entity validation) and its tests;
  > files: `modules/auth/src/user/usecase/set-name.usecase.ts`, `modules/auth/src/user/usecase/index.ts`,
  > `modules/auth/test/user/usecase/set-name.usecase.test.ts`; verified: `npm test` in modules/auth (331 passed,
  > set-name.usecase.ts 100% stmts/branch/funcs/lines), `npm run check-types` exit 0; deviations: none

### Notifications module (`modules/notifications`)

- [x] **T-02** — Create `modules/notifications/src/push-token/usecase/unregister-push-token.usecase.ts`
  (`UnregisterPushToken`; D-11) exported from the barrel, with
  `modules/notifications/test/push-token/usecase/unregister-push-token.usecase.test.ts` (own token deleted,
  another account's kept, unknown token, missing / empty / non-string token → 422).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-02 · Done when: `npm test --workspace @rochas-surf-school/notifications` and its `check-types` pass,
  the new file at 100% coverage.
  > ✅ 2026-10-13 16:41 — Added `UnregisterPushToken` use case and its tests; files:
  > `modules/notifications/src/push-token/usecase/unregister-push-token.usecase.ts`,
  > `modules/notifications/src/push-token/usecase/index.ts`,
  > `modules/notifications/test/push-token/usecase/unregister-push-token.usecase.test.ts`; verified: `npm test`
  > in modules/notifications (86 passed, new file 100% coverage), `npm run check-types` exit 0; deviations: none

### Backend (`apps/backend`)

- [x] **T-03** — Add `PUT /auth/me/name` to `apps/backend/src/modules/auth/auth.controller.ts` (body
  `Partial<Pick<SetNameIn, 'name'>>`, 200), its cases in `auth.controller.spec.ts`, requests in
  `auth.integration.http`, and the e2e `apps/backend/test/auth-profile.e2e-spec.ts` (200 trimmed, 422 invalid and
  missing, 403 pending, 401 without token).
  Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01 · Done when: `npm test --workspace apps/backend` and
  `npm run test:e2e --workspace apps/backend -- auth-profile` pass.
  > ✅ 2026-10-13 16:42 — Added `PUT /auth/me/name` (`setName`), controller specs, REST Client requests and the
  > e2e suite; files: `apps/backend/src/modules/auth/auth.controller.ts`,
  > `apps/backend/src/modules/auth/auth.controller.spec.ts`,
  > `apps/backend/src/modules/auth/auth.integration.http`, `apps/backend/test/auth-profile.e2e-spec.ts`;
  > verified: `npm test --workspace apps/backend` (253 passed), `npm run test:e2e -- auth-profile` (all passed
  > against local Postgres), `check-types` 0 errors; deviations: none (modules rebuilt with turbo first, since
  > the backend imports their `dist/`)

- [x] **T-04** — Add `DELETE /notifications/push-token` to
  `apps/backend/src/modules/notifications/notifications.controller.ts` (204, body `{ token }`), its cases in
  `notifications.controller.spec.ts`, a request in `notifications.integration.http`, and the ER-02 cases in
  `apps/backend/test/notifications.e2e-spec.ts`.
  Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-02 · Done when: `npm test --workspace apps/backend` and
  `npm run test:e2e --workspace apps/backend -- notifications` pass.
  > ✅ 2026-10-13 16:42 — Added `DELETE /notifications/push-token` (`unregisterPushToken`, 204), controller
  > specs, REST Client requests and the ER-02 e2e cases; files:
  > `apps/backend/src/modules/notifications/notifications.controller.ts`,
  > `apps/backend/src/modules/notifications/notifications.controller.spec.ts`,
  > `apps/backend/src/modules/notifications/notifications.integration.http`,
  > `apps/backend/test/notifications.e2e-spec.ts`; verified: `npm test --workspace apps/backend` (253 passed),
  > `npm run test:e2e -- notifications` (57 passed across the two suites); deviations: none

### Mobile (`apps/mobile`)

- [x] **T-05** — Create the device preferences service `apps/mobile/src/services/preferences/`
  (`preferences.storage.ts`: synchronous reads and writes of `prefs.theme`, `prefs.locale`, `prefs.pushEnabled`
  with the defaults and fallbacks of D-09; tests). Make `src/i18n/index.ts` start from the stored locale; move
  `LanguageSheet` from `src/modules/auth/components/language-sheet/` to `src/components/language-sheet/` (imports
  updated, tests moved) and make its selection store the locale.
  Covers: ER-09 · Done when: `npx jest src/services/preferences src/components/language-sheet src/i18n src/modules/auth`
  passes from `apps/mobile` and `npm run check-types --workspace @rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-13 16:43 — Created the preferences service (`prefs.theme`, `prefs.locale`, `prefs.pushEnabled`,
  > sync SecureStore, fallbacks of D-09), i18n starts from the stored locale, `LanguageSheet` moved to
  > `src/components/language-sheet/` and stores the locale; files:
  > `apps/mobile/src/services/preferences/preferences.storage.ts`,
  > `apps/mobile/src/services/preferences/preferences.storage.test.ts`, `apps/mobile/src/i18n/index.ts`,
  > `apps/mobile/src/i18n/index.test.ts`, `apps/mobile/src/components/language-sheet/*` (moved from
  > `src/modules/auth/components/language-sheet/`, hook and test updated),
  > `apps/mobile/src/modules/auth/components/auth/auth.component.tsx`, `apps/mobile/jest.setup.ts` (sync
  > SecureStore mock); verified: `npx jest src/services/preferences src/components/language-sheet src/i18n
  > src/modules/auth` (27 suites, 267 passed), `npm run check-types` exit 0, eslint clean; deviations: none

- [x] **T-06** — Apply the theme preference: at startup (before the first render) and on change, through
  `Appearance.setColorScheme` (D-09), in `src/services/preferences/theme-preference.ts` with a
  `useThemePreference()` hook (current choice, `setTheme`); create `src/components/theme-sheet/` (D-15) with its
  tests.
  Covers: ER-08 · Done when: `npx jest src/services/preferences src/components/theme-sheet` passes.
  > ✅ 2026-10-13 16:45 — Added `theme-preference.ts` (`applyStoredThemePreference`, `setThemePreference`,
  > `useThemePreference` over `Appearance.setColorScheme`; "system" maps to "unspecified"), applied before first
  > render in the root layout, and `ThemeSheet` (D-15); the `theme.*` / `themeSheet.*` copy was added here
  > instead of T-14; files: `apps/mobile/src/services/preferences/theme-preference.ts`,
  > `apps/mobile/src/services/preferences/theme-preference.test.tsx`,
  > `apps/mobile/src/components/theme-sheet/*`, `apps/mobile/src/app/_layout.tsx`,
  > `apps/mobile/src/i18n/messages/{en-US,pt-BR,es-ES}.ts`; verified: `npx jest src/services/preferences
  > src/components/theme-sheet` (3 suites, 17 passed), check-types and eslint clean; deviations: copy moved from
  > T-14 to T-06

- [x] **T-07** — Push preference (D-10): add the no-prompt option to `getPushToken` in
  `src/services/push/push.service.ts`; make `usePushRegistration` send the DELETE instead of the PUT while
  pushes are off; create `src/modules/notifications/hooks/use-push-preference.hook.ts` (value, `setEnabled`, the
  off/on/denied paths), with tests for all three files.
  Covers: ER-10 · Done when: `npx jest src/services/push src/modules/notifications` passes.
  > ✅ 2026-10-13 16:47 — Push preference: `getPushToken({ askPermission })` and `isPushPermissionDenied` in the
  > push service, `unregisterPushToken` util, `usePushRegistration` sends the DELETE instead of the PUT while
  > pushes are off, new `usePushPreference` hook (off / on / denied paths); technical steps added inside the
  > task: `apiDelete` in the API client (DELETE with body) and the whole `profile.*` copy in the three message
  > files (needed for the denied toast); files: `apps/mobile/src/services/push/push.service.ts`,
  > `apps/mobile/src/services/push/push.service.test.ts`,
  > `apps/mobile/src/services/api/{api.client,api.request,index}.ts`,
  > `apps/mobile/src/services/api/api.client.test.ts`,
  > `apps/mobile/src/modules/notifications/utils/unregister-push-token.ts`,
  > `apps/mobile/src/modules/notifications/utils/unregister-push-token.test.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-push-registration.hook.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-push-registration.hook.test.tsx`,
  > `apps/mobile/src/modules/notifications/hooks/use-push-preference.hook.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-push-preference.hook.test.tsx`,
  > `apps/mobile/src/i18n/messages/{en-US,pt-BR,es-ES}.ts`; verified: `npx jest src/services
  > src/modules/notifications` (15 suites, 167 passed), check-types and eslint clean; deviations: apiDelete and
  > profile copy added here

- [x] **T-08** — Tab bars (D-01–D-03): `src/app/(private)/<role>/(tabs)/_layout.tsx` with `NativeTabs` and the
  tab route files for the three roles; the existing `index.tsx` files move into `(tabs)`; `registrations.tsx`
  stays in the admin `Stack`; placeholder tabs render `FlowPlaceholder`; the paths of D-02 and D-03 in
  `src/constants/routes.ts`; the `tabs.*` copy in the three message files; route tests for the three roles
  (ER-03, ER-04), updating any existing test that expected the old layouts. Until T-13, the Profile tabs render a
  placeholder.
  Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-03, ER-04 · Done when: the new route tests and `npm test --workspace @rochas-surf-school/mobile`
  pass.
  > ✅ 2026-10-13 16:50 — Native tab bars for the three roles: shared `RoleTabs` component (NativeTabs, tint
  > `sun`, unselected `ink-3`, bar `page`), `(tabs)` group per role with the index screens moved in and
  > placeholder tabs (Profile is a placeholder until T-13), `registrations.tsx` stays in the admin Stack, role
  > routes in `routes.ts`, `tabs.*` copy, route tests (labels, selected tab, switching, admin Join-the-school
  > above the tabs and back), and the existing route tests repointed at `(tabs)/index`; files:
  > `apps/mobile/src/components/role-tabs/*`,
  > `apps/mobile/src/app/(private)/{student,instructor,admin}/(tabs)/*`, `apps/mobile/src/constants/routes.ts`,
  > `apps/mobile/src/i18n/messages/{en-US,pt-BR,es-ES}.ts`,
  > `apps/mobile/src/modules/{student,instructor,admin}/*-tabs.navigation.test.tsx`, and the imports of
  > `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`,
  > `apps/mobile/src/modules/rules-update/screens/rules-update.screen.test.tsx`,
  > `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.test.tsx`,
  > `apps/mobile/src/modules/onboarding/screens/school-rules.screen.test.tsx`,
  > `apps/mobile/src/navigation/root-navigator/root-navigator.component.test.tsx`; verified: `npx jest
  > tabs.navigation` (3 suites, 8 passed), `npm test` in apps/mobile (99 suites, 943 passed), check-types and
  > eslint clean; deviations: none (tab labels are read from the native tab screens `title` since the system
  > draws them)

- [ ] **T-09** — Edit profile (D-06): `src/modules/profile/hooks/use-update-name.hook.ts` (mutation on
  `PUT /auth/me/name`), `src/modules/profile/screens/edit-profile.screen.tsx` (with its component folder under
  `src/modules/profile/components/` per `.claude/rules/react.md`), the route file `edit-profile.tsx` in each
  role's `Stack`, the `editProfile.*` and `profile.comingSoon` copy, and tests for ER-06.
  Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-06 · Done when: `npx jest src/modules/profile` passes.

- [ ] **T-10** — Extract the onboarding WhatsApp form (country picker, number field with the Brazilian mask, share
  switch, validation) into `src/components/whatsapp-number-form/`, taking initial values and an `onSubmit`, and
  use it from `src/modules/onboarding/components/whatsapp/` with no visible change.
  Covers: enabling · Done when: `npx jest src/modules/onboarding src/components/whatsapp-number-form` passes with
  the onboarding tests unchanged.

- [ ] **T-11** — Profile WhatsApp screen (D-08): `src/modules/profile/screens/profile-whatsapp.screen.tsx`
  prefilled from the session, saving through the existing save hook (moved or reused), the route file
  `whatsapp.tsx` in each role's `Stack`, the `profileWhatsapp.*` copy, and tests for the screen part of ER-07.
  Covers: ER-07 · Done when: `npx jest src/modules/profile src/modules/onboarding` passes.

- [ ] **T-12** — Read-only School rules screen: `src/modules/school-rules/screens/school-rules.screen.tsx`
  (`BackButton`, `ScreenIntro` with the shield tile, `SchoolRulesList`, loading / error with retry / empty states),
  the route file `school-rules.tsx` in each role's `Stack`, the `schoolRulesScreen.*` copy, and tests for ER-11.
  Covers: ER-11 · Done when: `npx jest src/modules/school-rules` passes.

- [ ] **T-13** — Profile screen (D-04, D-05, D-14): `src/modules/profile/screens/profile.screen.tsx` with its
  components (header, row card, row, sign-out sheet), rendered by every role's `(tabs)/profile.tsx`; rows wired
  to Edit profile, WhatsApp (with the Visível / Oculto value), School rules, the "coming soon" toast and the push
  switch (`usePushPreference`); the sign-out sheet with `useSignOut`; the `profile.*` and `signOutSheet.*` copy;
  tests for ER-05, ER-07 (row value), ER-10 (switch), ER-12 and ER-15. The Tema, Idioma, About, privacy and terms
  rows are added in T-14 and T-15.
  Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-05, ER-07, ER-10, ER-12, ER-15 · Done when: `npx jest src/modules/profile` and
  `npm test --workspace @rochas-surf-school/mobile` pass.

- [ ] **T-14** — Add the Tema and Idioma rows to the Profile's first card: each shows the current value (theme
  choice with a sun or moon icon; language name) and opens `ThemeSheet` / `LanguageSheet`; the `theme.*` and
  `themeSheet.*` copy; tests for the profile part of ER-08 and ER-09.
  Covers: ER-08, ER-09 · Done when: `npx jest src/modules/profile src/components` passes.

- [ ] **T-15** — About and legal links (D-12, D-13): `src/modules/profile/constants/about.ts`,
  `src/modules/profile/components/about-sheet/`, `src/modules/profile/utils/web-pages.ts` (URL from
  `EXPO_PUBLIC_WEB_URL` and the app language), the Sobre o app, Política de privacidade and Termos de uso rows,
  `EXPO_PUBLIC_WEB_URL` in `apps/mobile/.env.example`, the `about.*`, `profile.about`, `profile.privacyPolicy`
  and `profile.termsOfUse` copy, and tests for ER-13 and ER-14 (`expo-web-browser` mocked).
  Covers: ER-13, ER-14 · Done when: `npx jest src/modules/profile` and
  `npm run lint --workspace @rochas-surf-school/mobile` pass.

### Verification

- [ ] **T-16** — Run every command in the Verification Plan from the repo root and follow its user journeys; all
  pass. Record the output summary as evidence.
  Covers: all · Done when: `check-coverage.mjs 026` prints `COVERAGE OK`, `run-e2e.mjs 026` prints
  `E2E PASSED`, every other command exits 0, and journeys 1–9 show what they describe.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 026` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 026` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 026` — the backend e2e suite passes, `auth-profile.e2e-spec.ts` and the new
    `notifications.e2e-spec.ts` cases included (Postgres up, migrations applied)
  - `npm test --workspace @rochas-surf-school/mobile` — the whole mobile suite passes (routes and shared
    components moved)
  - `npx turbo run lint check-types --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors
  - `npx turbo run build --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend`
    — builds (mobile has no build script)
- User journeys (iOS simulator, light and dark; backend running locally with Postgres; the seeded review accounts
  for each role; `EXPO_PUBLIC_WEB_URL=http://localhost:3000` and the web app running for journey 8):
  1. Sign in as the student review account → the tab bar Agenda / Minhas aulas / Escola / Perfil with Agenda
     selected; tap each tab. Sign out, sign in as the instructor → Início / Aulas / Perfil; as the admin →
     Início shows "School tools"; tap "Join the school" → no tab bar, back → Início with the tab bar.
  2. Open Perfil as each role → initials, name, role chip and the rows of ER-05 in order, no "Remover a conta".
  3. "Editar perfil" → name prefilled, email read-only, "Salvar" disabled; change the name and save → back on
     Perfil with the new name; reopen → the new name is prefilled. Tap the camera button → "Em breve.".
  4. WhatsApp row shows "Oculto" (or "Visível"); open it → the stored number and switch; flip the switch and
     save → the row shows the other value.
  5. Tema → "Escuro" → the app turns dark; kill and reopen → still dark; "Igual ao celular" → follows the
     simulator's appearance. Idioma → Español → Spanish everywhere; kill and reopen → still Spanish.
  6. With the backend log or the database open: turn "Notificações push" off → the phone's row in `push_tokens`
     is deleted; relaunch → no new row; turn it on → the row is back. (A simulator without an EAS project has no
     token: then only check that the switch persists across a relaunch.)
  7. "Regras da escola" → the rules, numbered, no checkbox; back → Perfil.
  8. "Sobre o app" → the mocked sheet, links open in the in-app browser, "Fechar" closes it. "Política de
     privacidade" and "Termos de uso" open the web pages in the app's language.
  9. "Sair" → the sheet; "Cancelar" keeps the session; "Sair" → the sign-in screen.

## Memory Impact

- `memory/product.md` — Current state: role tab bars (student Agenda / Minhas aulas / Escola / Perfil; instructor
  and admin Início / Aulas / Perfil, placeholders except Perfil and the admin's Início) and the Profile tab (name
  and WhatsApp editing, theme, language, the push switch, school rules, About mocked, privacy and terms links,
  sign out from any approved screen). The User concept: theme, language and pushes are **device** preferences,
  not stored on the account; turning pushes off removes the phone's token. Out of scope list: remove "the in-app
  push on/off setting", "linking the privacy policy from the app" and "linking the terms from the app" (except the
  onboarding line), "a screen to read the rules at any time" and "signing out from any screen other than…";
  add photo upload, account deletion from the Profile and the cancellation rules content as still missing.
- `memory/technical-context.md` — Applications → `apps/mobile`: native tabs (`expo-router/unstable-native-tabs`),
  the `(tabs)` group per role and inner screens in the role's `Stack`; device preferences in SecureStore
  (`prefs.*`, `src/services/preferences/`, `Appearance.setColorScheme`, stored locale at i18n start);
  `EXPO_PUBLIC_WEB_URL` and `expo-web-browser` for the web pages; `LanguageSheet`, `ThemeSheet` and
  `WhatsappNumberForm` in `src/components/`; push registration skipped while pushes are off. Authentication:
  `PUT /auth/me/name` (`SetName`). External integrations → Push notifications: `DELETE /notifications/push-token`
  (`UnregisterPushToken`).
- `memory/structure.md` — mobile routes `(private)/<role>/(tabs)/…`, `/<role>/{edit-profile,whatsapp,school-rules}`;
  `src/modules/profile/`, `src/modules/school-rules/screens/`, `src/services/preferences/`, the moved shared
  components; `modules/auth/src/user/usecase/set-name.usecase.ts`,
  `modules/notifications/src/push-token/usecase/unregister-push-token.usecase.ts`,
  `apps/backend/test/auth-profile.e2e-spec.ts`.
- `memory/modules.md` — None.
- `memory/modules/auth.md` — an approved account changes its own name (`SetName`, trimmed, the entity's rules);
  Spec history.
- `memory/modules/notifications.md` — a device unregisters its own token (`UnregisterPushToken`); the app's push
  switch; Spec history.
- `memory/modules/school-rules.md` — the rules are readable from the Profile of every role; Spec history.

## Assumptions

- The mocked About content (version, description, creator and links of D-13) is placeholder data the user will
  replace in a later change; nothing checks it against reality.
- Instructor PERFIL-01 stays the reference layout for every role even though the student and admin designs differ.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
