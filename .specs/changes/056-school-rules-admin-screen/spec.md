---
id: "056"
slug: school-rules-admin-screen
title: "School rules management screen and home entries"
status: in-progress
created: 2026-10-23
started: 2026-10-23
base_commit: 3fc50e7e77838ebc52979a0004266c5e76d07cd2
fronts: [mobile]
depends_on: []
---

# 056 — School rules management screen and home entries

## Goal

Approved admins manage the school rules from the app: on a new "Regras da escola" screen, opened from a "Regras" row
under "Escola" on their home, they add, edit, delete and reorder the rules that every user accepts. Instructors get the
same "Regras" row on their home, which opens the read-only rules screen. The backend already does all of it (spec
010); this spec builds the screens on top of it, so admins no longer depend on someone calling the API by hand.

## Context

- Product: [product.md](../../memory/product.md) — **School rules** (an ordered list, title up to 60 characters and
  explanation up to 300; every add, edit or delete raises the version and everyone accepts again; reordering
  doesn't), Roles (instructors can't change any rule; admins write the school rules).
- Requirements: [requirements.md → Managing the school rules](../../../.docs/requirements.md#managing-the-school-rules)
  — admins add, edit, remove and reorder; a new rule goes last, removing one moves the rules after it up;
  [Reading the rules](../../../.docs/requirements.md#reading-the-rules) — approved users of any role read them at any
  time; [Accepting again after a change](../../../.docs/requirements.md#accepting-again-after-a-change) — every add,
  edit or remove asks everyone to accept again and **admins don't choose** (linked so D-01 can be checked against it;
  nothing in it changes).
- Technical: [technical-context.md](../../memory/technical-context.md) — Applications → `apps/mobile` (TanStack Query,
  `services/api`, the shared toast `useAlertMessage`), Automated validation (Jest + RNTL, no mobile e2e suite: user
  journeys run in the iOS simulator).
- Module memory: [school-rules.md](../../memory/modules/school-rules.md) — the rules, the version, the error keys and
  who can do what; "The admin's screen to manage the rules doesn't exist yet."
- Backend this builds on (spec 010, unchanged): `GET /school-rules`, `POST /school-rules` `{ title, description }`
  (201), `PUT /school-rules/:id` `{ title, description }`, `DELETE /school-rules/:id`, `PUT /school-rules/order`
  `{ ruleIds }`, all authenticated and all answering `{ version, rules: [{ id, title, description, index }] }` in
  order. Errors: 404 `schoolRule.id.notFound` (edit or delete of a rule that no longer exists), 422
  `schoolRule.order.mismatch` (the order doesn't name every current rule exactly once), 422 `schoolRule.title.*` /
  `schoolRule.description.*`, 403 `schoolRule.role.notAdmin` / `user.status.notApproved`
  (`apps/backend/src/modules/school-rules/school-rules.controller.ts`).
- Existing mobile code:
  - `apps/mobile/src/modules/school-rules/hooks/use-school-rules.hook.ts` — `useSchoolRules()`, the one cache entry
    `SCHOOL_RULES_QUERY_KEY` (`["school-rules"]`) shared by onboarding, "Regras atualizadas", the read-only screen
    and the class details; `school-rules.types.ts` — `SchoolRule`, `SchoolRules`.
  - `apps/mobile/src/modules/school-rules/components/school-rules-reader/` — the read-only screen (spec 026), routed
    at `src/app/(private)/{student,instructor,admin}/school-rules.tsx` (`routes.<role>.schoolRules`), opened from
    Perfil and from the class details' "Regras da escola" row. Unchanged by this spec.
  - `apps/mobile/src/modules/admin/screens/admin.screen.tsx` and
    `apps/mobile/src/modules/instructor/screens/instructor.screen.tsx` — the homes; their "Escola" section has
    `PeopleEntryRow` (`src/modules/people/components/people-entry-row/`, a row in a card of its own: the pattern for
    the new row).
  - Patterns to follow: `src/modules/cancellation-rules/hooks/use-save-cancellation-rule.hook.ts` (a mutation that
    puts the answer in the cache and shows the shared toasts, silent on `SessionExpiredError`),
    `src/modules/enrolment/utils/enrolment-error.ts` (matching an `ApiError` by status and key),
    `src/modules/classes/components/location-sheet/` (a `BottomModal` with labelled `TextInput`s),
    `src/modules/classes/components/delete-class-sheet/` (a delete confirmation), and
    `src/modules/notifications/screens/notifications.screen.tsx` (`Skeleton` rows, `ErrorState`, `EmptyState`,
    `StackHeaderTitle`).
  - UI: `src/components/ui/{bottom-modal,button,empty-state,error-state,skeleton,text-area,text-input}`.
- Designs: `.docs/designs/admin-app.html` PAINEL-11 "School rules" (builder screen `regras`: the list with ↑/↓, "Adicionar
  regra", the "Nova regra" and "Editar regra" sheets) and PAINEL-01 (the "Regras" row under "Escola");
  `.docs/designs/instructor-app.html` PAINEL-01 (the instructor's "Regras" row) and PAINEL-05 (the read-only screen it
  opens); PERFIL-03 (the read-only screen, already built). The designs' European Portuguese is rewritten in pt-BR
  (D-11), and their re-acceptance checkbox is not built (D-01).

## Scope

### In scope

- The admin's rules management screen at `/admin/manage-school-rules`: the list in order with ↑/↓ arrows, the
  "Adicionar regra" button, the add and edit sheets, the delete confirmation, and the loading (`Skeleton`), error
  (`ErrorState`) and empty (`EmptyState`) states.
- The mutation hooks for adding, editing, deleting and reordering rules.
- The "Regras" row on the admin's and the instructor's home.
- Every new string in pt-BR, es-ES and en-US.

### Out of scope

- Letting admins choose whether a change needs re-acceptance (the design's "Pedir a todos para aceitar as regras outra
  vez" checkbox): every add, edit or delete keeps asking everyone, as requirements §1.5 says.
- Any change to the read-only screen (`SchoolRulesReader`, `SchoolRulesList`), to reading the rules from Perfil (spec
  026) or from the class details, to onboarding or to "Regras atualizadas" — their loading, error and empty states
  included.
- Any backend or domain change.
- Accepting the new version on behalf of the admin who changed the rules.
- Drag-and-drop reordering, a history of past versions, who changed what, and notifying anyone of a change.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | No re-acceptance checkbox. In its place a fixed note: in the add and edit sheets "Ao salvar, todos vão precisar aceitar as regras de novo na próxima vez que abrirem o app.", in the delete confirmation "Depois de excluir, todos vão precisar aceitar as regras de novo na próxima vez que abrirem o app." | Requirements §1.5 and product.md: admins don't choose; the backend raises the version on every add, edit or delete. The design's checkbox (and the original brief's "I choose" in `user-journeys.md`) predate that decision; making it a choice would be its own spec. |
| D-02 | The instructor's home row opens the existing read-only route `routes.instructor.schoolRules` (`/instructor/school-rules`). | Instructor design PAINEL-05; instructors can't change any rule. |
| D-03 | Only the admin's home row opens the management screen, at the new route `routes.admin.manageSchoolRules` = `/admin/manage-school-rules` (`src/app/(private)/admin/manage-school-rules.tsx`). The admin's Perfil and class details keep opening `/admin/school-rules`, read-only. | PERFIL-03 is read-only for every role; reading and managing stay separate screens. |
| D-04 | "Excluir regra" in the edit sheet closes it and opens a confirmation sheet (as `delete-class-sheet`): title "Excluir esta regra?", the rule's title, the delete note (D-01), a danger "Excluir regra" and a ghost "Cancelar". "Cancelar" (or closing the sheet) deletes nothing and closes it; the edit sheet doesn't come back. | Deleting can't be undone and asks everyone to accept again: it deserves a second step. |
| D-05 | Each ↑/↓ tap moves the rule one place in the cache at once (optimistic) and sends `PUT /school-rules/order` with every rule id in the new order. While it is in flight every arrow is disabled. On success the cache takes the answer; on failure the cache goes back to the list before the tap and a toast shows; on 422 `schoolRule.order.mismatch` the list is fetched again and the toast reads "As regras mudaram. Confira a nova ordem.". The first rule's ↑ and the last rule's ↓ are always disabled. Reordering shows no success toast. | Instant feedback without races: one reorder at a time, and the server's answer is the truth. Reordering doesn't raise the version, so it needs no note. |
| D-06 | The sheet (one component, mode `add` or `edit`): "Título" is a `TextInput` (no icon, `maxLength` 60) with an `n/60` counter under it; "Explicação" is a `TextArea` (`maxLength` 300, `inBottomSheet`, its own `n/300` counter). In `add`, "Adicionar regra" is on when both fields have text after trimming. In `edit`, the fields start with the rule's text and "Salvar" is on when both have text after trimming and the trimmed text differs from the stored one; the sheet also shows "Excluir regra". Text is sent trimmed. The primary button shows its spinner and ignores taps while the request runs. | The backend's limits (60 / 300 after trimming); an unchanged save would change nothing anyway (product.md). |
| D-07 | Outcomes of a sheet: success closes it, puts the answer in the cache and shows "Regra adicionada" / "Regra salva" / "Regra excluída". 404 `schoolRule.id.notFound` on edit or delete closes the sheet, fetches the list again and shows "Esta regra já foi excluída.". A network failure shows `createAccount.errors.noConnection`, any other failure `createAccount.errors.generic`, and the sheet stays open with the draft. An expired session shows nothing here (the app handles it once). | The same toasts and session handling as every other admin screen. |
| D-08 | The screen's states: while the first load runs, three `Skeleton` rows shaped like rule rows (number, two lines, two arrow squares) inside the list card, read out as one element labelled "Carregando as regras" (`testID="school-rules-loading"`); a failed load shows `ErrorState` ("Não foi possível carregar as regras" / "Confira sua conexão e tente de novo.") whose button fetches again (`retrying` while it runs); no rule shows `EmptyState` (icon `shield-outline`, "Nenhuma regra ainda", "Adicione a primeira regra. Os alunos leem e aceitam as regras antes de entrar no app.", action "Adicionar regra" with icon `add`), and the bottom "Adicionar regra" button is hidden. In the loading and error states the bottom button is hidden too. | The standard state components (user's request); one primary action per screen (design system §08). |
| D-09 | `SchoolRulesEntryRow` (`src/modules/school-rules/components/school-rules-entry-row/`, props `role: "admin" \| "instructor"`, `onPress`) is one row in a card of its own, like `PeopleEntryRow`: a `shield-outline` icon in `lagoon`, "Regras", a subtitle and a chevron. The subtitle comes from `useSchoolRules()`: admin "1 regra no onboarding dos alunos" / "{{count}} regras no onboarding dos alunos", instructor "1 regra para todos os alunos" / "{{count}} regras para todos os alunos", zero "Nenhuma regra ainda"; no subtitle while loading or after an error. It is the first row under "Escola" on both homes, above "Pessoas". | Admin PAINEL-01 and instructor PAINEL-01; one component for both homes. |
| D-10 | The screen's title "Regras da escola" is in the Stack header (`StackHeaderTitle`, as PAINEL-11), with the intro "Os alunos leem estas regras e precisam aceitá-las antes de entrar no app. A ordem aqui é a ordem que eles veem." at the top of the scroll view, above the list card. Each rule row shows its position (`01`, `02`…, Barlow Condensed, `sun`), title and explanation as written; tapping the row's text (a `Pressable`) opens the edit sheet; the ↑/↓ arrows are `TouchableOpacity` buttons with a touch target of at least 44pt and the accessibility labels "Subir a regra N" / "Descer a regra N". "Adicionar regra" is an outline `Button` with a `+` icon below the card. | PAINEL-11; the project's touchable and touch-target rules. |
| D-11 | The design's European Portuguese is rewritten in pt-BR: "Guardar" → "Salvar", "Apagar regra" → "Excluir regra", "a app" → "o app", "Ex.: Traz protetor solar" → "Ex.: Traga protetor solar". All copy is in [Copy](#copy). | The app is in Brazilian Portuguese (product.md), as in specs 036 and 046. |
| D-12 | The admin who changes the rules accepts the new version like everyone else, at their next launch, sign-in or session renewal, on "Regras atualizadas" (spec 013). The app doesn't accept on their behalf. | No backend change; acceptance stays the user's own act. |

## Copy

Every string below is added to `src/i18n/messages/{pt-BR,en-US,es-ES}.ts` (en-US is the source of the keys; the other
locales are typed against it). Key names are the executor's choice. Tests run in en-US.

| Where | pt-BR | en-US | es-ES |
| --- | --- | --- | --- |
| Home row | Regras | Rules | Reglas |
| Admin row subtitle (1 / n) | 1 regra no onboarding dos alunos / {{count}} regras no onboarding dos alunos | 1 rule in students' onboarding / {{count}} rules in students' onboarding | 1 regla en el onboarding de los alumnos / {{count}} reglas en el onboarding de los alumnos |
| Instructor row subtitle (1 / n) | 1 regra para todos os alunos / {{count}} regras para todos os alunos | 1 rule for every student / {{count}} rules for every student | 1 regla para todos los alumnos / {{count}} reglas para todos los alumnos |
| Row subtitle, no rules | Nenhuma regra ainda | No rules yet | Aún no hay reglas |
| Screen title | Regras da escola | School rules | Reglas de la escuela |
| Screen intro | Os alunos leem estas regras e precisam aceitá-las antes de entrar no app. A ordem aqui é a ordem que eles veem. | Students read these rules and must accept them before using the app. The order here is the order they see. | Los alumnos leen estas reglas y deben aceptarlas antes de entrar en la app. El orden aquí es el orden que ven. |
| Add button, empty-state action, add sheet's submit | Adicionar regra | Add rule | Añadir regla |
| Move up / down (accessibility) | Subir a regra {{position}} / Descer a regra {{position}} | Move rule {{position}} up / Move rule {{position}} down | Subir la regla {{position}} / Bajar la regla {{position}} |
| Loading (accessibility) | Carregando as regras | Loading the rules | Cargando las reglas |
| Error title / description | Não foi possível carregar as regras / Confira sua conexão e tente de novo. | Couldn't load the rules / Check your connection and try again. | No se pudieron cargar las reglas / Comprueba tu conexión e inténtalo de nuevo. |
| Empty title / description | Nenhuma regra ainda / Adicione a primeira regra. Os alunos leem e aceitam as regras antes de entrar no app. | No rules yet / Add the first rule. Students read and accept the rules before using the app. | Aún no hay reglas / Añade la primera regla. Los alumnos leen y aceptan las reglas antes de entrar en la app. |
| Sheet titles (add / edit) | Nova regra / Editar regra | New rule / Edit rule | Nueva regla / Editar regla |
| Field labels | Título / Explicação | Title / Explanation | Título / Explicación |
| Placeholders (title / explanation) | Ex.: Traga protetor solar / Uma ou duas frases curtas, falando direto com o aluno. | E.g. Bring sunscreen / One or two short sentences, speaking straight to the student. | Ej.: Trae protector solar / Una o dos frases cortas, hablando directamente al alumno. |
| Save note (add / edit sheets) | Ao salvar, todos vão precisar aceitar as regras de novo na próxima vez que abrirem o app. | Once saved, everyone will need to accept the rules again the next time they open the app. | Al guardar, todos tendrán que aceptar las reglas de nuevo la próxima vez que abran la app. |
| Edit sheet's submit | Salvar | Save | Guardar |
| Delete button (edit sheet and confirmation) | Excluir regra | Delete rule | Eliminar regla |
| Cancel (sheets) | Cancelar | Cancel | Cancelar |
| Delete confirmation title | Excluir esta regra? | Delete this rule? | ¿Eliminar esta regla? |
| Delete note | Depois de excluir, todos vão precisar aceitar as regras de novo na próxima vez que abrirem o app. | Once deleted, everyone will need to accept the rules again the next time they open the app. | Al eliminarla, todos tendrán que aceptar las reglas de nuevo la próxima vez que abran la app. |
| Toasts | Regra adicionada · Regra salva · Regra excluída | Rule added · Rule saved · Rule deleted | Regla añadida · Regla guardada · Regla eliminada |
| Toast, rule gone | Esta regra já foi excluída. | This rule was already deleted. | Esta regla ya se eliminó. |
| Toast, order mismatch | As regras mudaram. Confira a nova ordem. | The rules changed. Check the new order. | Las reglas cambiaron. Revisa el nuevo orden. |

The add and edit sheets each have a "Cancelar" (ghost) that closes them and drops the draft.

## Expected Results

### ER-01 — The admin's home opens the rules management screen

- **Front:** mobile
- **Behavior:** Given an approved admin on Início whose school has 6 rules, when the home renders, then the first row
  under "Escola", above "Pessoas", reads "Rules" with "6 rules in students' onboarding", and tapping it opens
  `/admin/manage-school-rules`.
- **Edge and error cases:** 1 rule reads "1 rule in students' onboarding"; no rule reads "No rules yet"; while the
  rules load, or after the load failed, the row shows no subtitle and still opens the screen; the admin's Perfil →
  "Regras da escola" still opens `/admin/school-rules` (read-only, no arrows and no "Add rule").
- **Verify by:** `npx jest src/modules/school-rules/components/school-rules-entry-row src/modules/admin/screens/admin.screen.test.tsx`
  (from `apps/mobile`) and the existing `npx jest src/modules/profile` (from `apps/mobile`).

### ER-02 — The instructor's home opens the read-only rules

- **Front:** mobile
- **Behavior:** Given an approved instructor on Início whose school has 6 rules, when the home renders, then the first
  row under "Escola", above "Pessoas", reads "Rules" with "6 rules for every student", and tapping it opens
  `/instructor/school-rules`, the read-only screen.
- **Edge and error cases:** 1 rule reads "1 rule for every student"; no rule reads "No rules yet"; no subtitle while
  loading or after an error.
- **Verify by:** `npx jest src/modules/school-rules/components/school-rules-entry-row src/modules/instructor/screens/instructor.screen.test.tsx`
  (from `apps/mobile`).

### ER-03 — The management screen lists the rules in order

- **Front:** mobile
- **Behavior:** Given 3 rules, when the admin opens the management screen, then the header reads "School rules", the
  intro is shown, and the card lists the rules in the admins' order as "01", "02", "03" with each title and
  explanation exactly as written, each with "Move rule N up" and "Move rule N down" buttons, followed by an
  "Add rule" button.
- **Edge and error cases:** the first rule's up button and the last rule's down button are disabled; with one rule
  both of its buttons are disabled; tapping a rule's text opens "Edit rule" for that rule.
- **Verify by:** `npx jest src/modules/school-rules/screens/manage-school-rules.screen.test.tsx -t "lists"` (from
  `apps/mobile`).

### ER-04 — Loading, error and empty states

- **Front:** mobile
- **Behavior:** Given the admin opens the management screen, when the rules are loading, then the card shows the
  skeleton rows labelled "Loading the rules"; when the load fails, then `ErrorState` shows "Couldn't load the rules"
  and its button fetches the rules again; when the school has no rule, then `EmptyState` shows "No rules yet" with an
  "Add rule" action that opens "New rule".
- **Edge and error cases:** the bottom "Add rule" button is hidden in all three states; a retry that succeeds shows
  the list; a retry that fails shows the error again.
- **Verify by:** `npx jest src/modules/school-rules/screens/manage-school-rules.screen.test.tsx -t "state"` (from
  `apps/mobile`).

### ER-05 — Adding a rule

- **Front:** mobile
- **Behavior:** Given the management screen with 2 rules, when the admin taps "Add rule", types a title and an
  explanation and taps the sheet's "Add rule", then `POST /school-rules` is sent with both texts trimmed, the sheet
  closes, the toast "Rule added" shows and the new rule is listed last as "03".
- **Edge and error cases:** the submit is off while either field is empty or only spaces; the title stops at 60
  characters and the explanation at 300, with `n/60` and `n/300` counters; a network failure shows the no-connection
  toast and any other failure the generic toast, and the sheet stays open with the typed text; "Cancel" closes it
  and sends nothing; a double tap sends one request.
- **Verify by:** `npx jest src/modules/school-rules/components/school-rule-sheet src/modules/school-rules/hooks/use-create-school-rule.hook.test.tsx`
  and `npx jest src/modules/school-rules/screens/manage-school-rules.screen.test.tsx -t "adds"` (from `apps/mobile`).

### ER-06 — Editing a rule

- **Front:** mobile
- **Behavior:** Given the management screen, when the admin taps a rule, then "Edit rule" opens with its title and
  explanation; when they change the text and tap "Save", then `PUT /school-rules/:id` is sent with both texts
  trimmed, the sheet closes, the toast "Rule saved" shows and the list shows the new text in the same position.
- **Edge and error cases:** "Save" is off while the trimmed text equals the stored one (a trailing space counts as no
  change) and while either field is blank; a 404 `schoolRule.id.notFound` closes the sheet, fetches the list again and
  shows "This rule was already deleted."; a network or other failure shows its toast and keeps the sheet and the
  draft.
- **Verify by:** `npx jest src/modules/school-rules/components/school-rule-sheet src/modules/school-rules/hooks/use-update-school-rule.hook.test.tsx`
  and `npx jest src/modules/school-rules/screens/manage-school-rules.screen.test.tsx -t "edits"` (from `apps/mobile`).

### ER-07 — Deleting a rule

- **Front:** mobile
- **Behavior:** Given the management screen with 3 rules, when the admin opens rule 02, taps "Delete rule", then
  "Delete this rule?" opens with the rule's title; when they tap its "Delete rule", then `DELETE /school-rules/:id` is
  sent, the sheet closes, the toast "Rule deleted" shows and the list has 2 rules, the former 03 now "02".
- **Edge and error cases:** the confirmation's "Cancel" closes it and sends nothing; a 404 `schoolRule.id.notFound`
  closes it, fetches the list again and shows "This rule was already deleted."; a network or other failure shows its
  toast and keeps the confirmation open; deleting the last rule shows the empty state.
- **Verify by:** `npx jest src/modules/school-rules/components/delete-school-rule-sheet src/modules/school-rules/hooks/use-delete-school-rule.hook.test.tsx`
  and `npx jest src/modules/school-rules/screens/manage-school-rules.screen.test.tsx -t "deletes"` (from
  `apps/mobile`).

### ER-08 — Reordering a rule

- **Front:** mobile
- **Behavior:** Given rules A, B, C, when the admin taps "Move rule 2 down", then the list shows A, C, B at once,
  every arrow is disabled until the answer, and `PUT /school-rules/order` is sent with `ruleIds` [A, C, B]; when it
  answers 200, the list keeps the answer's order and the arrows are enabled again, with no toast.
- **Edge and error cases:** a network or other failure puts the list back to A, B, C and shows its toast; a 422
  `schoolRule.order.mismatch` fetches the list again and shows "The rules changed. Check the new order."; "Move rule
  1 up" and the last rule's "down" can't be tapped.
- **Verify by:** `npx jest src/modules/school-rules/hooks/use-reorder-school-rules.hook.test.tsx` and
  `npx jest src/modules/school-rules/screens/manage-school-rules.screen.test.tsx -t "reorders"` (from
  `apps/mobile`).

### ER-09 — The sheets say everyone accepts again, with no choice

- **Front:** mobile
- **Behavior:** Given the "New rule" or "Edit rule" sheet, when it opens, then it shows "Once saved, everyone will
  need to accept the rules again the next time they open the app." and no checkbox; given the delete confirmation,
  then it shows "Once deleted, everyone will need to accept the rules again the next time they open the app.".
- **Edge and error cases:** none of the three sheets has a checkbox or switch; the requests send only `title` and
  `description` (add, edit) or nothing (delete).
- **Verify by:** `npx jest src/modules/school-rules/components/school-rule-sheet src/modules/school-rules/components/delete-school-rule-sheet -t "note"`
  (from `apps/mobile`).

### ER-10 — The new copy exists in the three languages

- **Front:** mobile
- **Behavior:** Given the strings in [Copy](#copy), when the mobile workspace is type-checked, then pt-BR, es-ES and
  en-US each have every new key with the text in the table, and the type check exits 0.
- **Edge and error cases:** a key missing from es-ES or pt-BR fails the type check (they are typed against en-US);
  the pt-BR text uses no European Portuguese from the design (D-11).
- **Verify by:** `npx turbo run check-types --filter=@rochas-surf-school/mobile` and reading the new keys in
  `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts` against the table.

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Add the text mutations in `src/modules/school-rules/hooks/`: `use-create-school-rule.hook.ts`
  (`POST /school-rules`), `use-update-school-rule.hook.ts` (`PUT /school-rules/:id`) and
  `use-delete-school-rule.hook.ts` (`DELETE /school-rules/:id`), each sending trimmed text where it applies, putting
  the answer in `SCHOOL_RULES_QUERY_KEY`, and on failure (D-07): 404 `schoolRule.id.notFound` → invalidate the query
  and show "This rule was already deleted.", network → no-connection toast, other → generic toast,
  `SessionExpiredError` → nothing; plus `src/modules/school-rules/utils/school-rules-error.ts` (key matchers, as
  `enrolment-error.ts`), the variables types and the toast copy in the three locales. Each hook gets its
  `.hook.test.tsx` and the util its `.test.ts`. Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-05, ER-06, ER-07 · Done when: `npx jest src/modules/school-rules/hooks src/modules/school-rules/utils`
  passes from `apps/mobile`.
  > ✅ 2026-10-23 — `useCreateSchoolRule` (`POST /school-rules`), `useUpdateSchoolRule` (`PUT /school-rules/:id`) and
  > `useDeleteSchoolRule` (`DELETE /school-rules/:id`, no body), text trimmed, the answer written to
  > `SCHOOL_RULES_QUERY_KEY`, no retry; on failure 404 `schoolRule.id.notFound` invalidates the query (edit, delete) and
  > every failure toasts through `getSchoolRuleErrorKey` (not-found / no-connection / generic, `null` for
  > `SessionExpiredError`). The success toasts are shown by the sheets (T-03, T-04), so their copy is added here with the
  > failure copy under `manageSchoolRules.toasts`. Files: `apps/mobile/src/modules/school-rules/hooks/use-create-school-rule.hook.ts`,
  > `apps/mobile/src/modules/school-rules/hooks/use-create-school-rule.hook.test.tsx`,
  > `apps/mobile/src/modules/school-rules/hooks/use-update-school-rule.hook.ts`,
  > `apps/mobile/src/modules/school-rules/hooks/use-update-school-rule.hook.test.tsx`,
  > `apps/mobile/src/modules/school-rules/hooks/use-delete-school-rule.hook.ts`,
  > `apps/mobile/src/modules/school-rules/hooks/use-delete-school-rule.hook.test.tsx`,
  > `apps/mobile/src/modules/school-rules/utils/school-rules-error.ts`,
  > `apps/mobile/src/modules/school-rules/utils/school-rules-error.test.ts`,
  > `apps/mobile/src/modules/school-rules/school-rules.types.ts` (the variables types),
  > `apps/mobile/src/i18n/messages/{en-US,pt-BR,es-ES}.ts`; verified: `npx jest src/modules/school-rules/hooks
  > src/modules/school-rules/utils` (6 suites, 35 passed), `npx tsc --noEmit` (exit 0); deviations: the tests reuse
  > `src/modules/people/people.test-utils.tsx` instead of a new test-utils file.

- [x] **T-02** — Add `src/modules/school-rules/hooks/use-reorder-school-rules.hook.ts` (D-05): `onMutate` cancels
  the rules query, keeps the previous list and writes the new order to the cache; `onSuccess` writes the answer;
  `onError` restores the previous list and shows the toast, or on 422 `schoolRule.order.mismatch` invalidates the
  query and shows "The rules changed. Check the new order."; it exposes whether a reorder is in flight. With its
  `.hook.test.tsx` and the toast copy in the three locales. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-08 · Done when: `npx jest src/modules/school-rules/hooks/use-reorder-school-rules.hook.test.tsx` passes
  from `apps/mobile`.
  > ✅ 2026-10-23 — `useReorderSchoolRules` takes the whole list in its new order (`{ rules }`) and sends
  > `PUT /school-rules/order` `{ ruleIds }`; `onMutate` cancels the query, keeps the previous list and writes the new
  > order (positions renumbered 1…N; nothing written while the rules were never loaded); `onSuccess` writes the answer;
  > `onError` puts the previous list back, invalidates the query on 422 `schoolRule.order.mismatch` and toasts through
  > `getReorderSchoolRulesErrorKey` (order-mismatch / no-connection / generic, `null` for an expired session); no
  > success toast; `isPending` is what callers read for "a reorder is in flight". Files:
  > `apps/mobile/src/modules/school-rules/hooks/use-reorder-school-rules.hook.ts`,
  > `apps/mobile/src/modules/school-rules/hooks/use-reorder-school-rules.hook.test.tsx`,
  > `apps/mobile/src/modules/school-rules/utils/school-rules-error.ts`,
  > `apps/mobile/src/modules/school-rules/utils/school-rules-error.test.ts`,
  > `apps/mobile/src/modules/school-rules/school-rules.types.ts`, `apps/mobile/src/i18n/messages/{en-US,pt-BR,es-ES}.ts`;
  > verified: `npx jest src/modules/school-rules/hooks/use-reorder-school-rules.hook.test.tsx src/modules/school-rules/utils`
  > (2 suites, 18 passed; the first run failed on an identity assertion, fixed to compare the answer's content),
  > `npx tsc --noEmit` (exit 0); deviations: the variables carry the reordered rules rather than only their ids, so the
  > optimistic write needs no lookup — the request still sends only `ruleIds`.

- [x] **T-03** — Add `src/modules/school-rules/components/school-rule-sheet/` (component, hook, types, `index.ts`):
  the `BottomModal` with mode `add` | `edit` (D-06), the title field with its counter, the explanation `TextArea`, the
  save note (D-01), the primary button ("Add rule" / "Save") calling the T-01 hooks and closing with its toast on
  success, "Delete rule" in `edit` (calls an `onDelete(rule)` prop) and "Cancel", with copy in the three locales and
  `school-rule-sheet.component.test.tsx` (enabling rules, trimming, limits and counters, failures keep the draft, the
  note and no checkbox, a double tap sends once). Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-05, ER-06, ER-09, ER-10 · Done when: `npx jest src/modules/school-rules/components/school-rule-sheet`
  passes from `apps/mobile`.
  > ✅ 2026-10-23 — `SchoolRuleSheet` (`mode` `add` | `edit`, `rule`, `onClose`, `onDelete`): "Title" `TextInput` (no
  > icon, `maxLength` 60, `n/60` counter under it), "Explanation" `TextArea` (`inBottomSheet`, `maxLength` 300, its
  > `n/300`), the save note (D-01) in a `bg-sand` note row, the primary "Add rule" / "Save" (on when both trimmed fields
  > have text and, in `edit`, the trimmed text differs from the stored one; `loading` while the request runs, so a
  > second tap is ignored), "Delete rule" (outline, `edit` only, calls `onDelete(rule)`) and a ghost "Cancel". Success
  > toasts "Rule added" / "Rule saved" and closes; a 404 closes (the T-01 hook already reloaded and toasted); any other
  > failure keeps the sheet and the draft. Each opening starts from the rule's text (or empty), dropping a cancelled
  > draft. Files: `apps/mobile/src/modules/school-rules/components/school-rule-sheet/{index.ts,school-rule-sheet.component.tsx,school-rule-sheet.hook.ts,school-rule-sheet.types.ts,school-rule-sheet.component.test.tsx}`,
  > `apps/mobile/src/modules/school-rules/school-rules.constants.ts` (the 60 / 300 limits),
  > `apps/mobile/src/i18n/messages/{en-US,pt-BR,es-ES}.ts`; also `apps/mobile/src/modules/school-rules/hooks/use-{create,update,delete}-school-rule.hook.test.tsx`
  > (T-01 tests: the success cases now wait for the mutation's success, which flushes a React Query notification that
  > leaked into the next test as an `act()` warning). Verified: `npx jest src/modules/school-rules/components/school-rule-sheet`
  > (15 passed); `npx jest --coverage src/modules/school-rules` (17 suites, 89 passed; 100 % statements, branches,
  > functions and lines in the module); `npx tsc --noEmit` (exit 0). Deviations: the limits are local constants because
  > the app doesn't depend on `@rochas-surf-school/school-rules` (whose entity holds the same 60 / 300); adding that
  > dependency was out of this task. One `act()` warning can still appear when the whole module runs (test noise, no
  > failure).

- [x] **T-04** — Add `src/modules/school-rules/components/delete-school-rule-sheet/` (component, hook, types,
  `index.ts`): the confirmation of D-04 with the rule's title and the delete note, calling the T-01 delete hook, with
  copy in the three locales and `delete-school-rule-sheet.component.test.tsx` (confirm, cancel, 404, failure keeps it
  open, the note). Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-07, ER-09, ER-10 · Done when: `npx jest src/modules/school-rules/components/delete-school-rule-sheet`
  passes from `apps/mobile`.
  > ✅ 2026-10-23 — `DeleteSchoolRuleSheet` (`visible`, `rule`, `onClose`): "Delete this rule?", the rule's title, the
  > delete note (D-01) in the same `bg-sand` note row as the edit sheet, a danger "Delete rule" (`loading` while the
  > request runs) and a ghost "Cancel". Confirming calls the T-01 delete hook: success toasts "Rule deleted" and closes,
  > a 404 closes (the hook reloaded and toasted), any other failure keeps it open. Files:
  > `apps/mobile/src/modules/school-rules/components/delete-school-rule-sheet/{index.ts,delete-school-rule-sheet.component.tsx,delete-school-rule-sheet.hook.ts,delete-school-rule-sheet.types.ts,delete-school-rule-sheet.component.test.tsx}`,
  > `apps/mobile/src/i18n/messages/{en-US,pt-BR,es-ES}.ts` (`manageSchoolRules.deleteSheet`; the buttons reuse
  > `manageSchoolRules.sheet.delete` / `.cancel`, the same words). Verified: `npx jest --coverage
  > src/modules/school-rules/components/delete-school-rule-sheet` (7 passed, 100 % of the component and hook);
  > `npx tsc --noEmit` (exit 0); deviations: none.

- [ ] **T-05** — Add `src/modules/school-rules/components/school-rule-editable-row/` (component, types, `index.ts`):
  the position, title and explanation in a `Pressable` that calls `onEdit`, and the ↑/↓ `TouchableOpacity` buttons
  (44pt targets, labels "Move rule N up/down", `disabled` props for the ends and while a reorder runs) calling
  `onMoveUp` / `onMoveDown`, with a divider except on the last row (D-10), copy in the three locales and
  `school-rule-editable-row.component.test.tsx`. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-03, ER-08 · Done when: `npx jest src/modules/school-rules/components/school-rule-editable-row` passes from
  `apps/mobile`.

- [ ] **T-06** — Add the management screen `src/modules/school-rules/screens/manage-school-rules.screen.tsx` with
  `manage-school-rules.screen.hook.ts` (which sheet is open: none, add, edit with a rule, delete with a rule; the
  moves via T-02) and `.types.ts`: the header title and intro (D-10), the list card of T-05 rows, the bottom "Add
  rule", the `Skeleton` / `ErrorState` / `EmptyState` states (D-08) and the sheets of T-03 and T-04; the route
  `src/app/(private)/admin/manage-school-rules.tsx`; `routes.admin.manageSchoolRules` in `src/constants/routes.ts`;
  copy in the three locales; and `manage-school-rules.screen.test.tsx` with the cases named in ER-03 to ER-08
  ("lists", "state", "adds", "edits", "deletes", "reorders"), driven through mocked `fetch`. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-03, ER-04, ER-05, ER-06, ER-07, ER-08, ER-10 · Done when:
  `npx jest src/modules/school-rules/screens/manage-school-rules.screen.test.tsx` passes from `apps/mobile`.

- [ ] **T-07** — Add `src/modules/school-rules/components/school-rules-entry-row/` (component, hook, types,
  `index.ts`, D-09) with `school-rules-entry-row.component.test.tsx` (both roles, 1 / n / 0, loading, error), and put
  it first under "Escola" in `src/modules/admin/screens/admin.screen.tsx` (opens `routes.admin.manageSchoolRules`)
  and `src/modules/instructor/screens/instructor.screen.tsx` (opens `routes.instructor.schoolRules`), with the row's
  copy in the three locales and the cases added to `admin.screen.test.tsx` and `instructor.screen.test.tsx` (the row
  sits above "Pessoas" and opens its route). Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-01, ER-02, ER-10 · Done when: `npx jest src/modules/school-rules/components/school-rules-entry-row src/modules/admin/screens src/modules/instructor/screens`
  passes from `apps/mobile`.

### Verification

- [ ] **T-08** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary
  as evidence, and the user journeys followed on the iOS simulator (or say which ones weren't).
  Covers: all · Done when: every automated command exits 0 and the user journeys are recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 056` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 056` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/mobile` — no errors (ER-10 relies on the type
    check).
  - `node .specs/scripts/run-e2e.mjs 056` — no e2e suite is declared for mobile, so it runs none and passes.
- User journeys (iOS simulator, the app on this branch against a local backend):
  - As an approved admin on Início: the "Regras" row is first under "Escola" with the rule count; it opens "Regras da
    escola" with the intro and the numbered list.
  - Add a rule ("Adicionar regra" → title and explanation → "Adicionar regra"): it shows last with "Regra
    adicionada"; the sheet shows the save note and no checkbox.
  - Tap a rule, change its explanation, "Salvar": the text changes in place with "Regra salva"; reopen it without
    changing anything: "Salvar" is off.
  - Tap ↓ on rule 01: it moves at once and stays after the answer; the first ↑ and the last ↓ are disabled.
  - Open a rule, "Excluir regra" → "Excluir esta regra?" → "Excluir regra": it's gone with "Regra excluída", the
    rules after it move up.
  - Perfil → "Regras da escola" shows the same rules read-only. Relaunch the app as the admin: "Regras atualizadas"
    asks to accept the new version (D-12).
  - As an approved instructor on Início: the "Regras" row opens the read-only rules.
  - With the backend stopped, open the screen: the error state shows; start it and tap "Tentar novamente": the list
    loads. Delete every rule: the empty state shows with its "Adicionar regra".
  - Switch to dark theme and check the screen and sheets.

## Memory Impact

- `memory/product.md` — Current state: admins add, edit, delete and reorder the school rules on "Regras da escola",
  opened from a "Regras" row under "Escola" on their home (each change still asks everyone to accept again; the
  admin doesn't choose); instructors open the read-only rules from the same row on their home.
- `memory/structure.md` — the route `apps/mobile/src/app/(private)/admin/manage-school-rules.tsx` and the new
  components, hooks and screen under `apps/mobile/src/modules/school-rules/`.
- `memory/modules/school-rules.md` — Boundaries: replace "The admin's screen to manage the rules doesn't exist yet"
  with the management screen (reorder by ↑/↓ with the whole list sent, delete after a confirmation, no re-acceptance
  choice); Spec history: add `056-school-rules-admin-screen`.
- `memory/technical-context.md` — None.
- `memory/modules.md` — None.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
