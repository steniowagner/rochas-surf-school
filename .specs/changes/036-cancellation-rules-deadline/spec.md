---
id: "036"
slug: cancellation-rules-deadline
title: "Cancellation rules and the cancellation deadline"
status: in-progress
created: 2026-10-18
started: 2026-10-18
base_commit: a53294555754d3f32d8cfe11763786ce1d7b9aea
fronts: [classes, backend, mobile, web]
depends_on: []
---

# 036 — Cancellation rules and the cancellation deadline

## Goal

Admins write two free-text cancellation rules, one for surf and one for skate, and every approved account can read
them. Every upcoming class gets one cancellation deadline: a language model (Anthropic Claude) reads the rule of the
class's discipline and the class's details and describes the deadline, and the backend computes the exact instant
itself, never after the class starts. The deadline is worked out in the background after a class is created, after
an edit that changes a detail the model reads, and after its rule changes; while a class has none, a job retries every
minute and admins see the class flagged "Sem prazo", with nobody notified. Enrolment (accepting the rule when
requesting a seat, cancelling a seat until the deadline) will use what this spec produces.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: Cancellation rule (`cancellation-rule`: free text
  written by admins, one for surf and one for skate, readable by everyone, saved without any check of its wording),
  Cancellation deadline (part of a class: one per class, never after the start, worked out by a language model from the
  rule and the class's details, never personal data; while it can't be worked out the system keeps trying and the class
  is flagged), Class ("Flags shown to admins: … **no cancellation deadline** (the deadline couldn't be worked out yet —
  no notification)"), and the decisions "One cancellation deadline per class, worked out by a language model, never
  after the class starts" and "The privacy policy names only the providers already chosen" (this spec chooses the
  language model, so it updates the policy).
- Requirements:
  - [requirements.md → Surf and skate rules](../../../.docs/requirements.md#surf-and-skate-rules) — admins write and
    edit two rules as free text; each class uses the rule of its discipline.
  - [requirements.md → Reading and accepting the rules](../../../.docs/requirements.md#reading-and-accepting-the-rules)
    — users read both rules at any time (only the reading part: accepting the rule when requesting a seat is
    enrolment's).
  - [requirements.md → One deadline per class](../../../.docs/requirements.md#one-deadline-per-class) — one deadline,
    worked out when the class is created, edited, or its rule changes.
  - [requirements.md → Working out the deadline](../../../.docs/requirements.md#working-out-the-deadline) — the model
    describes the deadline from the rule and the class's details, the system computes the exact instant and retries
    when the description can't be used (the 12-hour example).
  - [requirements.md → Data sent to the language model](../../../.docs/requirements.md#data-sent-to-the-language-model)
    — only the rule text and the class's details; no names, nothing students wrote.
  - [requirements.md → Deadline never after the start](../../../.docs/requirements.md#deadline-never-after-the-start)
    — a rule allowing cancelling at any time gives the class's start.
  - [requirements.md → No deadline available](../../../.docs/requirements.md#no-deadline-available) — the system keeps
    trying and admins see the flag, nobody notified (the "told to contact the school" part is enrolment's).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Architecture (ports in the
  domain, adapters in the backend, use cases check access), Persistence (conditional writes, one `$transaction` for
  all-or-nothing writes, migrations named after the module), Classes (`SchoolClassRepository`, `ClassViewReader`,
  `ClassItem`, `EditClass` and its "a class field differs" comparison, `getClassState`, `isWithoutInstructor`, the mobile
  `ClassCard` `showFlags`, `ClassDetailsScreen` banners, `ClassesWeekScreen`), External integrations (providers behind
  ports, env var names in `.env.example`, the privacy policy names chosen providers; Language model (cancellation
  deadlines); Scheduled work: every-minute, idempotent jobs that catch and log, one backend instance), Fixed
  conventions (translation keys, mobile shared UI: `BottomModal`, `TextArea`, `SegmentedControl`, `Chip`, `Button`,
  `ScreenIntro`, `BackButton`, routes in `src/constants/routes.ts`), Automated validation (the backend e2e suite fakes
  every external provider with `overrideProvider` and the classes clock). Module rules:
  [modules/classes.md](../../memory/modules/classes.md).
- Designs: `.docs/designs/admin-app.html` — PAINEL-01's tool row "Regras de cancelamento" ("Uma para surf, outra para
  skate"), PAINEL-08 "Cancellation rules" (`ajustesScreen`: the Surf / Skate segmented control, the intro, the two
  tips, the text area with its note and character count, "Guardar regra de surf" disabled while unchanged or blank);
  `.docs/designs/student-app.html` — the Profile row "Regras de cancelamento" opening the `regrasCancel` sheet (both
  rules, each in a card with its discipline chip, and "Fechar"). Both files are bundles: their sources unpack from the
  `__bundler/manifest` script (gzip + base64). Their copy is European Portuguese; this spec adapts it (D-14).
- LLM SDK: the `claude-api` skill (bundled with Claude Code) is the reference for `@anthropic-ai/sdk` calls — structured
  outputs (`messages.parse` with `zodOutputFormat` from `@anthropic-ai/sdk/helpers/zod`), effort, refusal fallbacks and
  typed errors. Read it before writing T-07.
- Existing code this builds on:
  - `modules/classes/src/school-class/` — `SchoolClass` entity, `SchoolClassRepository`, `ClassViewReader` /
    `ClassView`, `toClassItem` (`usecase/class-item.ts`), `EditClass`, `CreateClassBatch`, `model/class-flags.ts`
    (`isWithoutInstructor`), `model/class-state.ts`, `model/class-batch.ts` (`toInstant`, Fortaleza helpers),
    `ClockProvider`; `modules/classes/src/access/` (`assertCanReadClasses`, `assertCanManageClasses`); the fakes in
    `modules/classes/test/mock/`.
  - `apps/backend/src/modules/classes/` — `PrismaSchoolClassRepository`, `PrismaClassViewReader`, `ClassesController`,
    `SystemClockProvider`, `classes.module.ts`; `apps/backend/prisma/models/classes.model.prisma`;
    `apps/backend/src/modules/auth/account-erasure.job.ts` (the job pattern) and `resend.email.ts` (the API-key pattern);
    `apps/backend/test/classes.e2e-spec.ts` (fake clock and providers).
  - `apps/mobile/src/modules/profile/components/profile/` — the "Regras de cancelamento" row, today `showComingSoon`;
    `apps/mobile/src/modules/admin/screens/admin.screen.tsx` — the admin home's "Ferramentas" rows;
    `apps/mobile/src/modules/classes/components/class-card/` and `screens/class-details.screen.tsx` (+ hook) — the
    "Sem instrutor" chip and banner of spec 035; `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`.
  - `apps/web/src/i18n/dictionaries/{pt-br,es,en}.ts` — the privacy policy's `services` list, which describes the
    language model by category; `apps/web/e2e/pages.e2e.ts`.

## Scope

### In scope

- The two cancellation rules: stored, saved by approved admins (trimmed, 1–2000 characters), read by any approved
  account (`GET` / `PUT /cancellation-rules`).
- The cancellation deadline of each class: stored on the class, returned in `ClassItem` as `cancellationDeadline`;
  cleared when a class is created, when an edit changes a field the model reads, and for the upcoming classes of a
  discipline when its rule text changes; worked out by an every-minute job through a language-model port, with
  backoff; never stored from stale inputs.
- The Anthropic adapter of that port (Claude Opus 5.5, structured outputs) and `ANTHROPIC_API_KEY`.
- Mobile: the Profile's "Regras de cancelamento" sheet (every role); the admin's "Regras de cancelamento" row on the
  home and its screen; the "Sem prazo" chip on admins' cards and the "Sem prazo de cancelamento" banner on admins'
  details; the "Cancelamento até …" line on the details for every role.
- Web: the privacy policy names Anthropic as the language-model provider, in pt-BR, es and en.

### Out of scope

- Showing the rule when a student requests a seat and requiring its acceptance, cancelling a seat until the deadline,
  and telling a student without a deadline to contact the school — all enrolment (4.1).
- The "Cancelamento · Surf" row (and the school-rules row) on the class details, which opens the rule sheet from a
  class.
- Checking or improving a rule's wording when it is saved, and previewing what deadline a rule would give.
- Notifying anyone about rules, deadlines or the flag.
- Keeping the text of past rules, or who saved a rule and when, in any screen (the backend keeps only the current text,
  the last editor and the time of the last save).
- A list or filter of the classes without a deadline, and admins setting a deadline by hand.
- Recomputing deadlines when a location's name or address changes (locations can't be edited yet).
- Running more than one backend instance (the job assumes one, as every job does today).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | **Provider and model**: Anthropic, model `claude-opus-5-5` (a constant in the adapter, not configuration), `output_config.effort: "low"`, adaptive thinking left at its default (Opus 5.5 can't disable it), `max_tokens` 4096, the SDK's structured outputs (`messages.parse` + `zodOutputFormat`) and the server-side refusal fallback (`fallbacks: "default"` with the beta header `server-side-fallback-2026-07-01`, as the `claude-api` skill documents). The client has a 30 s timeout and `maxRetries: 0` — the job is the retry. Package `@anthropic-ai/sdk` (and `zod` for the schema) in `apps/backend`. | Chosen by the user. Each call is ~1–2k tokens (about $0.01) for tens of classes a week, so accuracy matters more than cost; structured outputs make the answer schema-valid. |
| D-02 | **The description the model returns** is one of four kinds; the structured-output schema is a flat object `{ kind: "minutesBefore" \| "daysBeforeAt" \| "classStart" \| "unclear", minutes: integer \| null, days: integer \| null, time: string \| null }`, mapped by the adapter to the domain union `{ kind: "minutesBefore", minutes } \| { kind: "daysBeforeAt", days, time } \| { kind: "classStart" } \| { kind: "unclear" }`. The backend computes the instant (`computeCancellationDeadline(description, startsAt)`): `minutesBefore` → `startsAt − minutes` (integer 0–43200); `daysBeforeAt` → the Fortaleza calendar day of the start minus `days` (integer 0–30) at `time` (`HH:mm`, 00:00–23:59) in Fortaleza; `classStart` → `startsAt`; the result is then capped at `startsAt` (never later). `unclear`, a missing field or a value out of range → no deadline (unusable). A deadline already in the past when it is computed is stored as it is. | The model only reads language; arithmetic, time zones and the cap are deterministic code that can be tested. A flat schema is the simplest shape structured outputs accept; the domain keeps a proper union. |
| D-03 | **Unusable answers**: `unclear`, an answer that doesn't parse or fails D-02's ranges, a refusal (`stop_reason: "refusal"` after the fallback), any API or network error, and a missing API key (D-11) all count as a failed attempt; nothing else changes (D-07). | One failure path, retried the same way. |
| D-04 | **What is sent to the model**: a fixed system prompt (in English, describing the task and the four kinds, saying the rule is written by the school in Brazilian Portuguese and that times are America/Fortaleza) and one user message holding only the JSON `{ rule, class: { discipline, level, date, weekday, start, end, locationName, locationAddress, capacity, notes } }` — `date` `YYYY-MM-DD`, `weekday` the English weekday name, `start` / `end` `HH:mm`, all Fortaleza; `notes` `null` when none. Never ids, instructors, the creator, enrolments or anything about a person. This shape is the port's input (`CancellationDeadlineRequest`). | The requirement lists exactly these class details; the port's input type makes it impossible to pass anything else. |
| D-05 | **When a deadline is cleared** (deadline `null`, attempts 0, next attempt now, revision + 1): a class created by a batch starts that way; `EditClass` clears it in the same write as the edit whenever a class field differs (discipline, level, start, end, location, capacity, notes — the existing comparison, which is exactly what the model reads), and keeps it when only the instructors change; saving a rule whose trimmed text differs from the stored one clears it for every class of that discipline that starts after now and isn't cancelled, in the same `$transaction` as the rule (`CancellationRuleRepository.save(rule, now)`). Saving the same text writes nothing and clears nothing. | Chosen by the user: a deadline computed from old inputs must not stay; the save and the clearing are all or nothing. |
| D-06 | **The job** (`CancellationDeadlineJob`, `@Cron(EVERY_MINUTE, { name: "cancellation-deadline", waitForCompletion: true })`) runs the use case `WorkOutCancellationDeadlines` (no actor). Each tick: read the rules; pick at most **20** classes that start after now, aren't cancelled, have no deadline, whose discipline has a rule, and whose next attempt is due (none, or at or before now) — never-tried ones (0 attempts) first, then by `startsAt`, then `id`; describe up to **5 at a time**; compute and store each. It catches and logs every error, never throws, and logs only counts (worked out, failed), never rule text or class details. | Chosen by the user: bounded cost per tick, idempotent by the stored state. |
| D-07 | **Retries**: after its n-th consecutive failed attempt a class's next attempt is `now + min(2^(n−1), 60)` minutes (1, 2, 4, 8, 16, 32, 60, 60…). A discipline without a rule is never sent to the model (its classes stay without a deadline, flagged, until the rule is saved — this covers the classes created before this spec). Attempts stop once a class has started or is cancelled. | Chosen by the user: an unreadable rule can't call the model every minute for every class forever; no rule means no deadline rather than an invented policy. |
| D-08 | **Stale results are never stored**: every class has a deadline revision (an integer bumped by every clearing in D-05). The job reads the revision with the class and writes a result or a failure only with a conditional `updateMany` whose `where` holds `{ id, revision, cancelledAt: null }`; a write that matches nothing is dropped silently (it counts as neither worked out nor failed). | An edit or a rule change during a model call must win; the persistence convention is conditional writes, not locks. |
| D-09 | **Where the rules live**: a new `cancellation-rule` aggregate in `modules/classes` (`src/cancellation-rule/`: entity `CancellationRule` with `discipline`, `text`, `updatedBy`, `updatedAt`; port `CancellationRuleRepository` with `findAll()` and `save(rule, now)`; use cases `ListCancellationRules` and `SaveCancellationRule`), stored in a `cancellation_rules` table keyed by `discipline` (the existing `class_discipline` enum), with `updated_by` → `users.id` `ON DELETE SET NULL`. Access reuses `assertCanReadClasses` (any approved account) and `assertCanManageClasses` (approved admins), so the errors are `user.status.notApproved` then `user.role.notAdmin` (403). | The deadline is part of a class and a rule change clears classes, so one module owns both; the access rules are the classes' ones. |
| D-10 | **API**: `GET /cancellation-rules` → 200 `{ surf: string \| null, skate: string \| null }`. `PUT /cancellation-rules/:discipline` `{ text }` → 200 the same shape after the save. Checked in this order: access; `:discipline` not `surf` / `skate` → 422 `cancellationRule.discipline.invalid`; `text` missing, not a string, or blank after trimming → 422 `cancellationRule.text.required`; longer than 2000 characters after trimming → 422 `cancellationRule.text.max.length` (one `ValidationException`). The text is stored trimmed, as written. `ClassItem` gains `cancellationDeadline: string \| null` (ISO UTC), on every class answer, for every role. | The two-key shape is what both screens draw; the limit gives the app's `TextArea` its `maxLength` (the design shows a counter but no maximum). |
| D-11 | **API key**: `ANTHROPIC_API_KEY` (added to `apps/backend/.env.example`, empty). Without it, outside production the adapter answers every request as unusable and logs a warning naming the variable (never the request); with `NODE_ENV=production` the adapter throws when it is constructed, so the backend refuses to start — the same pattern as `ResendEmailProvider`. Tests never call Anthropic: unit tests mock the SDK client, the e2e suite overrides the adapter with a fake (`overrideProvider`). | Local development and CI run without a key; production can't silently run without deadlines. |
| D-12 | **The "no cancellation deadline" flag is computed, never stored**: `isWithoutDeadline(cancellationDeadline, state)` in `model/class-flags.ts` is true only when the deadline is `null` and the state is `not-started`. It is exported by `@rochas-surf-school/classes`, so the app and the backend use one rule. Admins see it; other roles never do. | Same approach as `isWithoutInstructor` (spec 035): a flag can't go stale. |
| D-13 | **Mobile UI**: (a) the Profile row opens `CancellationRulesSheet` (a `BottomModal` titled "Regras de cancelamento": one card per discipline, surf then skate, with its discipline `Chip` and the text as written, or the empty-rule text; a grape `ActivityIndicator` while loading; the error with "Tentar novamente" on a failed load; a `ghost` "Fechar"), the same for every role; (b) the admin home gains a "Regras de cancelamento" row with the subtitle "Uma para surf, outra para skate" under "Ferramentas", after "Criar aulas", opening `/admin/cancellation-rules` (`routes.admin.cancellationRules`): `BackButton`, `ScreenIntro` with the intro, the Surf / Skate `SegmentedControl`, a `bg-dim` card with the two tips (`time-outline`, `alert-circle-outline` in `lagoon`), a `TextArea` (`maxLength` 2000, the placeholder) whose draft is kept per discipline while switching, the status note, and a primary `Button` "Salvar regra de surf" / "… de skate" disabled while the trimmed draft is blank or equal to the trimmed saved text, with `loading` while saving; on success the cache takes the answer, the toast "Regra de surf salva" shows and the screen stays; leaving with unsaved changes asks nothing; loading and error-with-retry states as the sheet; (c) with `showFlags`, a flagged class's card shows the `warn` `Chip` "Sem prazo" (`calendar-clear-outline`) in the right chip slot, under "Sem instrutor" when both apply (the slot becomes a column); (d) on the details, with `canEdit`, a flagged class shows a `Pressable` banner on `bg-warn-tint` (`calendar-clear-outline`, "Sem prazo de cancelamento" and the description naming the discipline) after the "Sem instrutor" banner, opening `routes.admin.cancellationRules`; (e) for every role, a class with a deadline that isn't cancelled shows one line "Cancelamento até <dia, data · hora>" (date-fns `EEE, d MMM` and `HH:mm`, Fortaleza, the app's locale) on its details. Copy under `cancellationRules`, `classesWeek.noDeadline`, `classDetails.noDeadline` and `classDetails.cancellationDeadline`. | Chosen by the user in round 2: the design's screens, and the spec-035 flag pattern. |
| D-14 | **Copy** (pt-BR, adapted from the design's pt-PT; es-ES and en-US written by the executor with the same meaning and tone): home row "Regras de cancelamento" / subtitle "Uma para surf, outra para skate"; screen title "Regras de cancelamento"; intro "Há uma regra para cada modalidade. O app lê a regra com os dados da aula — nunca os dos alunos — e calcula até quando cada aula pode ser cancelada."; tips "Indique prazos exatos em horas antes do início da aula — nada de \"em cima da hora\"." and "Evite ambiguidade: se uma pessoa hesitar ao ler, o app também vai hesitar."; placeholder "Ex.: O aluno pode cancelar sem penalidade até 12 horas antes do início da aula…"; status note "Alterações não salvas" / "Regra de {{discipline}} em vigor" / "Ainda não há regra de {{discipline}}"; button "Salvar regra de {{discipline}}"; toast "Regra de {{discipline}} salva"; sheet title "Regras de cancelamento", empty rule "A escola ainda não escreveu esta regra.", close "Fechar"; card chip "Sem prazo"; banner "Sem prazo de cancelamento" / "Ainda não conseguimos calcular até quando os alunos podem cancelar. Confira a regra de {{discipline}}."; details line "Cancelamento até {{when}}". `{{discipline}}` is "surf" / "skate" (lower case) in every language. The design's "Os alunos veem esse prazo antes de pedir" is left out until enrolment exists. | Approved by the user in round 2; the product is in pt-BR, es and en. |
| D-15 | **Privacy policy**: in the three web dictionaries, the `services` item that describes "a language model (AI) service" names the provider — "Anthropic (Claude): works out each class's cancellation deadline; receives only the class details and the text of the cancellation rule, never personal data." (and its pt-BR / es translations); the `transfers` text already covers processing outside Brazil and stays. | `product.md`: the spec that chooses a provider updates the policy. |

## Expected Results

### ER-01 — Any approved account reads both rules

- **Front:** backend
- **Behavior:** Given a surf rule "O aluno pode cancelar até 12 horas antes." and no skate rule, when an approved
  student, instructor or admin calls `GET /cancellation-rules`, then the API answers 200 `{ surf: "O aluno pode
  cancelar até 12 horas antes.", skate: null }`.
- **Edge and error cases:** with no rule at all → `{ surf: null, skate: null }`; a pending (or denied, deleted,
  removed) account → 403 `user.status.notApproved`; no token → 401.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/cancellation-rules.e2e-spec.ts -t "GET /cancellation-rules"`
  and `npx jest test/cancellation-rule/usecase/list-cancellation-rules.usecase.test.ts` from `modules/classes`.

### ER-02 — An admin saves a rule

- **Front:** backend
- **Behavior:** Given an approved admin, when they call `PUT /cancellation-rules/skate` with
  `{ text: "  Até 6 horas antes do início.  " }`, then the API answers 200 with `skate: "Até 6 horas antes do
  início."` (trimmed, otherwise as written) and the current surf rule, and a later `GET` returns the same.
- **Edge and error cases:** a student or instructor → 403 `user.role.notAdmin`; a pending admin → 403
  `user.status.notApproved`; `:discipline` `kitesurf` → 422 `cancellationRule.discipline.invalid`; `text` missing,
  `null`, a number or only spaces → 422 `cancellationRule.text.required`; 2001 characters after trimming → 422
  `cancellationRule.text.max.length` (2000 is accepted); nothing is stored on any refusal; saving again replaces the
  text (the last save wins).
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/cancellation-rules.e2e-spec.ts -t "PUT /cancellation-rules"`
  and `npx jest test/cancellation-rule` from `modules/classes`.

### ER-03 — A changed rule clears the deadlines of its upcoming classes

- **Front:** backend
- **Behavior:** Given a surf rule and, all with a stored deadline, a surf class starting tomorrow, a surf class that
  has started, a cancelled surf class starting tomorrow and a skate class starting tomorrow, when an admin saves a
  different surf text, then `GET /classes/:id` answers `cancellationDeadline: null` for the surf class starting
  tomorrow, and the started, cancelled and skate classes keep their deadlines.
- **Edge and error cases:** saving the same text (after trimming) answers 200 and every deadline is kept; saving the
  first surf rule (none before) clears the upcoming surf classes the same way; a refused save clears nothing.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/cancellation-rules.e2e-spec.ts -t "clears the deadlines"`
  and `npx jest test/cancellation-rule/usecase/save-cancellation-rule.usecase.test.ts` from `modules/classes`.

### ER-04 — New classes get their deadline from the job

- **Front:** backend
- **Behavior:** Given the surf rule "O aluno pode cancelar até 12 horas antes do início da aula.", a fixed clock at
  2026-10-18T12:00:00Z and a fake describer answering `{ kind: "minutesBefore", minutes: 720 }`, when an admin creates a
  surf class on Tuesday 2026-10-20 from 08:00 to 09:00 (Fortaleza) with `POST /classes/batch`, then `GET /classes/:id`
  answers `cancellationDeadline: null`; after the cancellation-deadline job runs once, it answers
  `cancellationDeadline: "2026-10-19T23:00:00.000Z"` (Monday 20:00 in Fortaleza), and `GET /classes?date=2026-10-20`
  shows the same value.
- **Edge and error cases:** a second run doesn't call the describer again for that class; a class with a deadline is
  never picked.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/cancellation-deadlines.e2e-spec.ts -t "works out the deadline"`.

### ER-05 — The backend computes the instant from the description

- **Front:** classes
- **Behavior:** Given a class starting at 2026-10-20T11:00:00Z (Tuesday 08:00 in Fortaleza), when
  `computeCancellationDeadline` receives `{ kind: "minutesBefore", minutes: 720 }`, then it returns
  2026-10-19T23:00:00Z; `{ kind: "daysBeforeAt", days: 1, time: "18:00" }` returns 2026-10-19T21:00:00Z;
  `{ kind: "classStart" }` returns 2026-10-20T11:00:00Z.
- **Edge and error cases:** `{ minutesBefore, 0 }` → the start; `{ daysBeforeAt, 0, "09:00" }` (after the start) →
  capped at the start; `unclear` → `null`; `minutes` −1, 43201 or 1.5, `days` 31 or −1, `time` "24:00", "8:00" or
  missing → `null`.
- **Verify by:** `npx jest test/school-class/model/cancellation-deadline.test.ts` from `modules/classes`.

### ER-06 — Only the rule text and the class's details reach the model

- **Front:** backend
- **Behavior:** Given a surf class taught by an instructor named "Ana Souza", with notes "Trazer protetor solar.", at
  location "Praia do Futuro" / "Av. Zezé Diogo, s/n", when the job works out its deadline, then the describer receives
  exactly `{ rule, class: { discipline: "surf", level, date: "2026-10-20", weekday: "Tuesday", start: "08:00", end:
  "09:00", locationName: "Praia do Futuro", locationAddress: "Av. Zezé Diogo, s/n", capacity, notes: "Trazer protetor
  solar." } }` — no ids and no names; and the Anthropic adapter sends the SDK only its fixed system prompt and that JSON
  as the one user message, with model `claude-opus-5-5`, effort `low` and the structured-output format.
- **Edge and error cases:** a class without notes sends `notes: null`; "Ana Souza" and any user or class id appear
  nowhere in the request the adapter builds.
- **Verify by:** `npx jest test/school-class/usecase/work-out-cancellation-deadlines.usecase.test.ts -t "sends only"`
  from `modules/classes`, and `npx vitest run src/modules/classes/anthropic.deadline-describer.spec.ts -t "request"`
  from `apps/backend`.

### ER-07 — An unusable answer is retried with backoff, nobody notified

- **Front:** backend
- **Behavior:** Given an upcoming surf class with a rule and a fake describer answering `{ kind: "unclear" }`, when the
  job runs at minute 0, then the class keeps `cancellationDeadline: null`; runs at minutes 0, 1, 3, 7… call the
  describer for it only when its next attempt is due (waits of 1, 2, 4, 8, 16, 32, then 60 minutes), and once the
  describer answers `{ kind: "minutesBefore", minutes: 60 }` the deadline is stored and the attempts reset. No
  notification is stored or pushed at any point.
- **Edge and error cases:** a describer that throws, a malformed or out-of-range answer and a refusal count the same
  as `unclear`; with 25 classes due, one run picks 20 — the never-tried ones first, then by start — and the next run the
  remaining 5; a job run whose use case throws logs the error and doesn't throw.
- **Verify by:** `npx jest test/school-class/usecase/work-out-cancellation-deadlines.usecase.test.ts` from
  `modules/classes`, `npx vitest run src/modules/classes/cancellation-deadline.job.spec.ts` from `apps/backend`, and
  `npm run test:e2e --workspace apps/backend -- test/cancellation-deadlines.e2e-spec.ts -t "retries"`.

### ER-08 — Without a rule, nothing is sent; saving the rule works the classes out

- **Front:** backend
- **Behavior:** Given no skate rule and an upcoming skate class, when the job runs, then the describer isn't called
  and the class stays without a deadline (and counts no attempt); after an admin saves a skate rule and the job runs
  again, the class has a deadline.
- **Edge and error cases:** a surf rule alone doesn't make skate classes eligible; a class flagged for a long time
  without a rule is picked as never-tried once the rule exists.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/cancellation-deadlines.e2e-spec.ts -t "without a rule"`
  and `npx jest test/school-class/usecase/work-out-cancellation-deadlines.usecase.test.ts -t "no rule"` from
  `modules/classes`.

### ER-09 — Editing a detail the model reads recomputes the deadline

- **Front:** backend
- **Behavior:** Given an upcoming class with a stored deadline, when an admin changes its start time with
  `PUT /classes/:id`, then the answer (and `GET /classes/:id`) has `cancellationDeadline: null`, and the next job run
  stores the deadline worked out for the new start.
- **Edge and error cases:** changing only its instructors keeps the deadline; an unchanged save keeps it; a change to
  the level, location, capacity, notes, end or discipline clears it like the start does.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/cancellation-deadlines.e2e-spec.ts -t "edit"` and
  `npx jest test/school-class/usecase/edit-class.usecase.test.ts -t "deadline"` from `modules/classes`.

### ER-10 — Stale results and closed classes are never written

- **Front:** backend
- **Behavior:** Given the job is describing an upcoming class, when an admin edits a detail of that class (or saves a
  different rule for its discipline) before the description returns, then the job's result is not stored: the class
  keeps `cancellationDeadline: null` and is worked out again from the new inputs.
- **Edge and error cases:** a class that started or was cancelled is never picked, so it is never sent to the model; a
  class cancelled during the call doesn't get the result; a dropped write counts as neither worked out nor failed.
- **Verify by:** `npx jest test/school-class/usecase/work-out-cancellation-deadlines.usecase.test.ts -t "stale"` from
  `modules/classes` and `npx vitest run src/modules/classes/school-class.prisma.spec.ts -t "deadline"` from
  `apps/backend`.

### ER-11 — The API key is required in production only

- **Front:** backend
- **Behavior:** Given `ANTHROPIC_API_KEY` is unset, when the Anthropic adapter is constructed with
  `NODE_ENV=production`, then it throws an error naming `ANTHROPIC_API_KEY`, so the backend doesn't start.
- **Edge and error cases:** outside production it is constructed, every `describe` call returns the unusable result
  without calling the SDK, and a warning naming the variable is logged; with a key set, it calls the SDK.
- **Verify by:** `npx vitest run src/modules/classes/anthropic.deadline-describer.spec.ts -t "API key"` from
  `apps/backend`.

### ER-12 — The Profile shows both cancellation rules

- **Front:** mobile
- **Behavior:** Given an approved student (or instructor, or admin) on the Perfil tab, when they press "Regras de
  cancelamento", then a sheet titled "Regras de cancelamento" shows a Surf card with the surf rule exactly as written
  and a Skate card with "A escola ainda não escreveu esta regra." (no skate rule), and "Fechar" closes it.
- **Edge and error cases:** while loading, a spinner; a failed load shows the error with "Tentar novamente", which
  reloads; the "coming soon" toast no longer appears for this row.
- **Verify by:** `npx jest src/modules/cancellation-rules/components/cancellation-rules-sheet src/modules/profile/screens/profile.screen.test.tsx -t "cancellation rules"`
  from `apps/mobile`.

### ER-13 — An admin edits the rules from the home

- **Front:** mobile
- **Behavior:** Given an approved admin on the home, when they press "Regras de cancelamento" ("Uma para surf, outra
  para skate"), then the "Regras de cancelamento" screen opens on Surf with the saved surf text and "Regra de surf em
  vigor"; typing changes the note to "Alterações não salvas" and enables "Salvar regra de surf"; switching to Skate and
  back keeps the surf draft; pressing the button sends `PUT /cancellation-rules/surf` with the text, shows "Regra de
  surf salva", stays on the screen and shows "Regra de surf em vigor" again.
- **Edge and error cases:** the button is disabled while the draft is blank (spaces only) or equal to the saved text
  after trimming; a discipline without a rule shows "Ainda não há regra de skate" and an empty field with the
  placeholder; a failed save shows the no-connection or generic toast and keeps the draft; the field takes at most 2000
  characters (counter `n/2000`); a failed load shows the error with "Tentar novamente".
- **Verify by:** `npx jest src/modules/cancellation-rules/screens src/modules/admin/screens/admin.screen.test.tsx src/modules/admin/admin-tabs.navigation.test.tsx -t "cancellation rules"`
  from `apps/mobile`.

### ER-14 — Admins see a class without a deadline flagged

- **Front:** mobile
- **Behavior:** Given an upcoming class with `cancellationDeadline: null`, when an admin opens the Aulas tab, then its
  card shows the "Sem prazo" chip; on its details, the "Sem prazo de cancelamento" banner says "Ainda não conseguimos
  calcular até quando os alunos podem cancelar. Confira a regra de surf." and pressing it opens the "Regras de
  cancelamento" screen.
- **Edge and error cases:** a class with no instructor and no deadline shows "Sem instrutor" and, under it, "Sem
  prazo" on the card, and both banners on the details ("Sem instrutor" first); no chip or banner once the class has
  started or is cancelled, or when it has a deadline; a student's or instructor's card and details never show them.
- **Verify by:** `npx jest src/modules/classes/components/class-card src/modules/classes/screens/class-details.screen.test.tsx -t "no deadline"`
  from `apps/mobile`, and `npx jest test/school-class/model/class-flags.test.ts` from `modules/classes`.

### ER-15 — The details show the deadline

- **Front:** mobile
- **Behavior:** Given a class with `cancellationDeadline: "2026-10-19T23:00:00.000Z"`, when any approved person opens
  its details with the app in pt-BR, then they see "Cancelamento até seg, 19 out · 20:00".
- **Edge and error cases:** no line when the deadline is `null` or the class is cancelled; in en-US the line reads with
  the English weekday and month ("Mon, 19 Oct · 20:00"); the time is Fortaleza's whatever the phone's time zone.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "cancellation deadline"` from
  `apps/mobile`.

### ER-16 — The privacy policy names Anthropic

- **Front:** web
- **Behavior:** Given the public site, when a visitor opens `/pt-br/privacy-policy`, `/es/privacy-policy` or
  `/en/privacy-policy`, then the "who handles the data" list names "Anthropic" as the service that works out the
  cancellation deadline, receiving only the class details and the rule text.
- **Edge and error cases:** the other providers and the transfers section are unchanged; no language keeps the
  generic "language model (AI) service" wording.
- **Verify by:** `npm run test:e2e --workspace apps/web -- e2e/pages.e2e.ts -g "Anthropic"`.

## Tasks

### Classes module (`modules/classes`)

- [ ] **T-01** — Add the `cancellation-rule` aggregate (D-09, D-10, D-05): `src/cancellation-rule/model/cancellation-rule.entity.ts`
  (discipline, text trimmed 1–2000 with the `cancellationRule.text.*` keys, `updatedBy`, `updatedAt`),
  `provider/cancellation-rule.repository.ts` (`findAll()`, `save(rule, now)` — the rule and the clearing of D-05 as one
  write), `usecase/list-cancellation-rules.usecase.ts` (`assertCanReadClasses`, answers `{ surf, skate }`) and
  `usecase/save-cancellation-rule.usecase.ts` (`assertCanManageClasses`, `cancellationRule.discipline.invalid`, the
  text checks, no write for the same trimmed text, answers `{ surf, skate }`), barrels and the module's `src/index.ts`;
  a fake repository in `test/mock/` that records the clearing; tests in `test/cancellation-rule/`.
  Skills: [`module-aggregate`](../../../.claude/skills/module-aggregate),
  [`module-entity`](../../../.claude/skills/module-entity),
  [`module-repository`](../../../.claude/skills/module-repository),
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest test/cancellation-rule` and `npm run check-types` pass from
  `modules/classes`.

- [ ] **T-02** — Add the deadline model (D-02, D-12): `src/school-class/model/cancellation-deadline.ts`
  (`CancellationDeadlineDescription` union, `computeCancellationDeadline(description, startsAt)`, the ranges and the
  cap), `isWithoutDeadline` in `model/class-flags.ts`; the deadline fields on `SchoolClass` (`cancellationDeadline`,
  `deadlineRevision`, `deadlineAttempts`, `deadlineNextAttemptAt`, all empty / 0 for a new class) and
  `cancellationDeadline` on `ClassView` and `ClassItem` (`toClassItem` as ISO or `null`); update the factories and
  fakes in `test/mock/`; tests `test/school-class/model/cancellation-deadline.test.ts`, `class-flags.test.ts` and the
  class-item test.
  Covers: ER-05, ER-14 · Done when: `npx jest test/school-class/model test/school-class/usecase` passes from
  `modules/classes`.

- [ ] **T-03** — `EditClass` clears the deadline when a class field differs and keeps it when only the instructors
  change (D-05): `SchoolClassRepository.update` receives whether to clear it (same atomic write; the fake applies it),
  in `src/school-class/usecase/edit-class.usecase.ts` and `provider/school-class.repository.ts`; cases named
  "deadline" in `test/school-class/usecase/edit-class.usecase.test.ts`.
  Covers: ER-09 · Done when: `npx jest test/school-class/usecase/edit-class.usecase.test.ts` passes from
  `modules/classes`.

- [ ] **T-04** — Add `WorkOutCancellationDeadlines` (D-04, D-06, D-07, D-08): the `CancellationDeadlineDescriber` port
  (`src/school-class/provider/cancellation-deadline-describer.provider.ts`, input `CancellationDeadlineRequest`, output
  a `CancellationDeadlineDescription`), `SchoolClassRepository.findNeedingDeadline({ now, disciplines, limit })`,
  `saveDeadline(id, revision, deadline)` and `recordDeadlineFailure(id, revision, attempts, nextAttemptAt)` (both
  conditional, returning whether they wrote), the use case in `usecase/work-out-cancellation-deadlines.usecase.ts`
  (rules from `CancellationRuleRepository.findAll`, the request built from the class and its location in Fortaleza, up
  to 5 at a time, output `{ workedOut, failed }`), a fake describer in `test/mock/`, and
  `test/school-class/usecase/work-out-cancellation-deadlines.usecase.test.ts` with cases "sends only", "no rule",
  "stale", the backoff sequence and the 20-class limit.
  Covers: ER-04, ER-06, ER-07, ER-08, ER-10 · Done when: `npm test` and `npm run check-types` pass from
  `modules/classes`.

### Backend (`apps/backend`)

- [ ] **T-05** — Persist rules and deadlines: in `prisma/models/classes.model.prisma` add the `CancellationRule` model
  (`cancellation_rules`, key `discipline`, `text`, `updated_by` `ON DELETE SET NULL`, `updated_at`) and the class
  columns `cancellation_deadline`, `deadline_revision` (default 0), `deadline_attempts` (default 0),
  `deadline_next_attempt_at`, with an index for the job's query; generate the migration
  `classes-add-cancellation-deadlines`. Add `PrismaCancellationRuleRepository` (`cancellation-rule.prisma.ts`, `save`
  as one `$transaction` with the clearing), implement the new and changed `PrismaSchoolClassRepository` methods
  (`update` clearing, `findNeedingDeadline`, the two conditional writes), and return `cancellationDeadline` from
  `PrismaClassViewReader`; register the repository in `classes.module.ts`; specs next to each file (cases named
  "deadline").
  Skills: [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module),
  [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-03, ER-04, ER-09, ER-10 · Done when: `npm run prisma:migrate:dev --workspace apps/backend` applies the
  migration and `npx vitest run src/modules/classes` passes from `apps/backend`.

- [ ] **T-06** — Expose the rules: `CancellationRulesController` (`src/modules/classes/cancellation-rules.controller.ts`,
  protected `GET /cancellation-rules` and `PUT /cancellation-rules/:discipline`, D-10) with its spec,
  `cancellation-rules.integration.http`, registration in `classes.module.ts`, and `test/cancellation-rules.e2e-spec.ts`
  ("GET /cancellation-rules", "PUT /cancellation-rules", "clears the deadlines"; it deletes the rules, classes,
  locations and users it creates after each test).
  Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx vitest run src/modules/classes/cancellation-rules.controller.spec.ts`
  and `npm run test:e2e --workspace apps/backend -- test/cancellation-rules.e2e-spec.ts` pass.

- [ ] **T-07** — Implement `AnthropicDeadlineDescriber` (`src/modules/classes/anthropic.deadline-describer.ts`, D-01,
  D-02, D-03, D-04, D-11): add `@anthropic-ai/sdk` and `zod` to `apps/backend`, `ANTHROPIC_API_KEY=` to
  `.env.example`; the fixed system prompt, the one JSON user message, the flat schema mapped to the domain union with
  the ranges checked, the refusal fallback, every failure mapped to `unclear`, and the key handling; register it in
  `classes.module.ts`. Spec `anthropic.deadline-describer.spec.ts` with the SDK client mocked: "request" (model,
  effort, format, exactly the system prompt and the JSON), each answer kind, a refusal, an API error, "API key".
  Read the `claude-api` skill first for the exact SDK calls.
  Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-06, ER-11 · Done when: `npx vitest run src/modules/classes/anthropic.deadline-describer.spec.ts` passes
  and `npm run check-types --workspace apps/backend` exits 0.

- [ ] **T-08** — Add `CancellationDeadlineJob` (`src/modules/classes/cancellation-deadline.job.ts`, D-06: every
  minute, `waitForCompletion`, runs `WorkOutCancellationDeadlines` with the Prisma repositories, the describer and
  `SystemClockProvider`, logs counts only, catches every error) with `cancellation-deadline.job.spec.ts`; register it
  in `classes.module.ts`; add `test/cancellation-deadlines.e2e-spec.ts` (the describer overridden with a configurable
  fake, the fixed clock, the job run through `app.get(CancellationDeadlineJob).run()`): "works out the deadline",
  "retries", "without a rule", "edit", and no notification row created.
  Covers: ER-04, ER-07, ER-08, ER-09, ER-10 · Done when: `npx vitest run src/modules/classes/cancellation-deadline.job.spec.ts`
  and `npm run test:e2e --workspace apps/backend -- test/cancellation-deadlines.e2e-spec.ts` pass.

### Mobile (`apps/mobile`)

- [ ] **T-09** — Add the `cancellation-rules` module and the Profile sheet (D-13a, D-14): `src/modules/cancellation-rules/hooks/`
  (`useCancellationRules` — `["cancellation-rules"]`, `GET /cancellation-rules`, optional `enabled`;
  `useSaveCancellationRule` — `apiPut`, no retry, writes the answer to the cache) with tests,
  `components/cancellation-rules-sheet/` (component, hook, types, index, test), the `cancellationRules` copy in
  `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, and the Profile row opening the sheet in
  `src/modules/profile/components/profile/` (case "cancellation rules" in `profile.screen.test.tsx`).
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-12 · Done when: `npx jest src/modules/cancellation-rules src/modules/profile` passes from `apps/mobile`.

- [ ] **T-10** — Add the admin's rules screen (D-13b, D-14): `src/modules/cancellation-rules/screens/cancellation-rules.screen.tsx`
  (+ its hook and test), the route `src/app/(private)/admin/cancellation-rules.tsx`, `routes.admin.cancellationRules`
  in `src/constants/routes.ts`, the "Regras de cancelamento" row in `src/modules/admin/screens/admin.screen.tsx`, and
  cases named "cancellation rules" in `admin.screen.test.tsx` and `admin-tabs.navigation.test.tsx`.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-13 · Done when: `npx jest src/modules/cancellation-rules/screens src/modules/admin` passes from
  `apps/mobile`.

- [ ] **T-11** — Flag classes without a deadline for admins (D-12, D-13c, D-13d): `ClassCard`'s hook returns
  `withoutDeadline` (`isWithoutDeadline`), the component stacks the "Sem prazo" chip under "Sem instrutor" with
  `showFlags`; the details' hook returns `showNoDeadline` (`canEdit` and the flag) and the screen draws its banner after
  the no-instructor one, opening `routes.admin.cancellationRules`; copy `classesWeek.noDeadline` and
  `classDetails.noDeadline.*`; cases named "no deadline" in the card's and the details' tests.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-14 · Done when: `npx jest src/modules/classes/components/class-card src/modules/classes/screens/class-details.screen.test.tsx`
  passes from `apps/mobile`.

- [ ] **T-12** — Show the deadline on the details (D-13e): the details' hook formats `cancellationDeadline` in
  Fortaleza with the app's date-fns locale (none when `null` or cancelled) and the screen draws "Cancelamento até …";
  copy `classDetails.cancellationDeadline`; cases named "cancellation deadline" in `class-details.screen.test.tsx`
  (pt-BR and en-US).
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-15 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` passes from
  `apps/mobile`.

### Web (`apps/web`)

- [ ] **T-13** — Name Anthropic in the privacy policy (D-15): the language-model item of `privacyPolicy.services` in
  `src/i18n/dictionaries/{pt-br,es,en}.ts`, and a test named "privacy policy names Anthropic" in `e2e/pages.e2e.ts`
  for the three languages.
  Covers: ER-16 · Done when: `npm run test:e2e --workspace apps/web -- e2e/pages.e2e.ts` passes and
  `npm run check-types --workspace apps/web` exits 0.

### Verification

- [ ] **T-14** — Run every command in the Verification Plan from the repo root and follow its user journeys; all pass.
  Record the output summary as evidence.
  Covers: all · Done when: every automated command passes (`COVERAGE OK`, `E2E PASSED`) and the journeys show what they
  describe.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 036` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 036` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 036` — the backend e2e suite (Postgres up, migrations applied), including
    `test/cancellation-rules.e2e-spec.ts` and `test/cancellation-deadlines.e2e-spec.ts`, and the web Playwright suite,
    including "privacy policy names Anthropic", pass.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile --filter=@rochas-surf-school/web`
    — no errors.
  - `npx turbo run build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/web`
    — builds.
- User journeys (iOS simulator, local backend without `ANTHROPIC_API_KEY` unless stated):
  - Rules: as an approved admin, on the home press "Regras de cancelamento"; the screen opens on Surf with "Ainda não
    há regra de surf" and the placeholder, and the save button disabled. Type "O aluno pode cancelar até 12 horas antes
    do início da aula." — the note says "Alterações não salvas" and the button turns on; switch to Skate and back — the
    draft is still there; save — "Regra de surf salva", the note reads "Regra de surf em vigor" and the button is
    disabled again. As the student review account, open Perfil → "Regras de cancelamento": the sheet shows the surf
    rule as written and "A escola ainda não escreveu esta regra." for skate; "Fechar" closes it.
  - Flag: as the admin, create a surf class for tomorrow. Without a key the deadline can't be worked out: its card on
    Aulas shows "Sem prazo" and its details the "Sem prazo de cancelamento" banner ("… Confira a regra de surf."), which
    opens the rules screen; no "Cancelamento até" line. As the student review account, the same class shows neither
    the chip nor the banner.
  - Deadline (with a real `ANTHROPIC_API_KEY` in `apps/backend/.env`, backend restarted): within about a minute,
    reopening the class's details as the admin shows "Cancelamento até …" 12 hours before its start (Fortaleza) and no
    flag; editing the class's start time makes the flag come back, then the new deadline replaces it about a minute
    later.

## Memory Impact

- `memory/product.md` — Cancellation rule and Cancellation deadline as built (rules of 1–2000 characters read by any
  approved account and saved by admins; the deadline worked out in the background by Claude, retried with backoff, no
  rule → no deadline; who sees the flag and the deadline line); Class's "no cancellation deadline" flag; the decision
  "The privacy policy names only the providers already chosen" now lists Anthropic; Current state: a paragraph for this
  spec; Out of scope: drop the Profile's "the cancellation rules screen ('coming soon')" and spec 032's "recomputing the
  cancellation deadline after an edit", and record this spec's out-of-scope items.
- `memory/technical-context.md` — Applications (backend: `@anthropic-ai/sdk` and `zod`); Persistence (the
  `cancellation_rules` table, the class deadline columns, the revision-conditional writes); Classes (the
  `/cancellation-rules` routes, `ClassItem.cancellationDeadline`, `EditClass` clearing, `WorkOutCancellationDeadlines`,
  `computeCancellationDeadline`, `isWithoutDeadline`, the mobile sheet, screen, chip, banner and line); External
  integrations → Language model (Anthropic, `claude-opus-5-5`, effort low, structured outputs, refusal fallback, the
  request shape, `ANTHROPIC_API_KEY` and its production check, tests fake it); Scheduled work (the
  `cancellation-deadline` job, 20 per tick, 5 at a time, backoff); Automated validation (the e2e suite overrides
  `AnthropicDeadlineDescriber`).
- `memory/structure.md` — the `cancellation-rule` aggregate in `modules/classes`, the mobile `cancellation-rules`
  module, the route `/admin/cancellation-rules`, the new backend files.
- `memory/modules.md` — Classes now also keeps the cancellation rules and works out each class's deadline.
- `memory/modules/classes.md` — the rules (concepts, limits, who reads and saves, the clearing on a change), the
  deadline (what is sent, the four kinds, the cap, the retries and backoff, stale results dropped, no rule → nothing
  sent), the computed flag and who sees it; the spec history entry.

## Assumptions

- The class's notes are sent to the model as part of its details, as the requirement lists them; they are written by
  admins, who are expected not to put personal data in them. Accepted with requirements 4.2.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
