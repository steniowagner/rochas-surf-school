---
name: spec-plan
description: Plan a new change in this repo as a spec (spec-driven development). Interviews the user critically until every requirement is unambiguous, then writes .specs/changes/NNN-slug/spec.md with a goal, scope, decisions, verifiable Expected Results and a breakdown into small, verifiable tasks per front (e.g. backend, web, mobile, infra) that spec-execute runs one by one. Has a quick mode (--quick) for small changes: a short spec with at most 3 Expected Results and no interview rounds when the request is clear. Also revises an existing spec when its requirements change (--amend NNN, keeping ids stable and logging every change) and abandons a spec that is no longer wanted (--abandon NNN, archiving it with its reason). Use whenever the user runs /spec-plan, or asks to plan, spec out, scope or write a spec/PRD/proposal for a feature, change or fix before implementing it, or asks for a quick or small spec for a minor fix, or to change, revise or amend the requirements of a spec, or to drop, cancel or abandon a spec — even if they don't say "spec". Do not use for executing, reviewing or finishing a spec, or for fixing review findings (spec-execute).
argument-hint: "[--quick] <what to build, as text or a path to a file> | --amend <spec id> [what changes] | --abandon <spec id> [reason]"
---

# spec-plan

Turn a request into a spec that two other agents can rely on: one implements it (`spec-execute`), and a
different one checks the implementation against it (`spec-review`) without ever seeing this conversation.
That second agent is the reason for most of what follows. Anything left vague here becomes either a wrong
implementation or a review that can't decide pass/fail — so the job of this skill is to be the person in the
room who refuses to let ambiguity through, while staying constructive and fast.

The flow is: **preflight → load context → first analysis → interview → confirm → write → report.**
Do not write the spec file before the user has confirmed the summary.

**Modes.** Without a flag, this skill plans a new spec (sections 1–7). `--quick` plans a small change as a
quick spec (section 10). `--amend NNN` revises an existing spec when its requirements change (section 8), and
`--abandon NNN` archives a spec that is no longer wanted (section 9). All of them start with the preflight and
read `.specs/shared/spec-lifecycle.md`.

Whatever the mode, check first that the change needs a spec at all: `spec-lifecycle.md` → When a spec is
needed lists what doesn't (typos, formatting, dependency bumps without behavior changes, tooling, docs). If
the request is one of those, say so and offer to just make the change and commit it — don't plan it. And if a
request without `--quick` is that small (one or two fronts, at most 3 Expected Results, no new concept, no
migration, no auth change), offer the quick spec.

## 1. Preflight (hard gate)

Run from the repo root:

```bash
node .specs/scripts/preflight.mjs
```

It checks that `.specs/` exists and that `.specs/memory/product.md` (business/product context) and
`.specs/memory/technical-context.md` (technical stack) exist, have their required sections filled in, and
have no template leftovers. It also prints the next spec id and the active specs with their status.

**If it fails (non-zero exit), stop immediately.** Do not read further, do not start the interview, do not
offer to plan anyway. Reply with:

- that `spec-plan` cannot run because the spec framework isn't set up (no `.specs/`, exit code 2) or the
  project memory is incomplete (exit code 1);
- the exact problems the script listed;
- how to fix them: run `/spec-init`, which creates `.specs/` when it is missing, interviews the user and
  writes both memory files. (Filling the memory files by hand
  from `.specs/templates/product-model.md` and `.specs/templates/technical-context-model.md` also works, as
  long as the sections marked "Required by `spec-plan`" are filled in.)

The reason is that every question and every decision in a spec is judged against the product and the stack.
Planning without them produces specs that contradict the project, and that costs more than the delay.

If no request was given (empty arguments), ask the user what they want to plan and stop there.

## 2. Load context

Read, in this order, and keep it in mind for the whole interview:

1. The request. If the argument is a path to a file, read the file; if it mixes a path and text, use both.
2. `.specs/shared/spec-lifecycle.md`, `.specs/shared/interviewing.md`, `.specs/shared/acceptance-criteria.md`,
   `.specs/shared/task-breakdown.md`, `.specs/shared/how-to-execute.md`, `.specs/shared/naming-rules.md`, and
   `.specs/templates/base-spec-model.md`.
3. All of `.specs/memory/` (`product.md`, `technical-context.md`, and `structure.md`, `modules.md`,
   `modules/*.md` when present).
4. The product's source documents listed in `product.md` → Source documents (a brief, detailed requirements):
   find every section this request touches and read it in full. Those sections hold detail the user already
   agreed on — don't ask again what they answer; do raise it when the request contradicts them.
5. `CLAUDE.md` / `AGENTS.md` at the root, and the project skills in `.claude/skills/` (names and descriptions
   are enough) — tasks should point at the skill that implements them.
6. Active specs in `.specs/changes/` (at least Goal, Scope and Expected Results) to spot overlap,
   dependencies or conflicts. Skim the titles in `.specs/finished/` for prior decisions on the same area.
7. The code the request touches. Explore it yourself: anything the code can answer is not a question for the
   user. Asking "do we already have a User entity?" when you could have looked wastes the user's attention,
   which is the scarcest resource in this process.

## 3. First analysis

Before the first question, show the user that you understood the request and where it is weak. The general
rules for this message are in `.specs/shared/interviewing.md`; for a spec, send one message with:

- **What I understood** — the request restated in 2–4 sentences, in product terms, plus the fronts you think
  it touches.
- **Issues found** — each one concrete and sourced, grouped as:
  - *Contradictions* — with `product.md`, `technical-context.md`, the source documents, existing code, an
    active/finished spec, or within the request itself. Quote both sides.
  - *Ambiguities* — words or statements with more than one reasonable reading. Name the readings.
  - *Missing information* — what a spec needs that the request doesn't say.
  - *Risks and scope* — the request is really several specs, something is expensive to reverse, a
    dependency isn't finished.
- **First round of questions.**

## 4. Interview

`references/interview-guide.md` lists the branches a spec usually has to resolve (actors and permissions,
data, rules, edge cases, each front, verification) and the red flags to call out. Read it once at the start
and use it to notice gaps — not as a questionnaire to recite.

Run it by the rules in `.specs/shared/interviewing.md`: rounds of at most 5 numbered questions, each with
your recommended answer and why; push back on vague or conflicting answers instead of silently picking an
interpretation; "you decide" becomes a recorded decision; nothing stays "TBD". For a spec in particular:

- Order the rounds so that who can do it and what the data is get decided before what the button says.
- If the request turns out to be several specs, propose a split (what goes in this one, what becomes a
  follow-up) and let the user choose. One spec should be reviewable as one unit.
- Something the user explicitly wants to leave open becomes an Assumption they accepted, or goes Out of
  Scope.
- The running decision log (`D-NN`) becomes the Decisions table.

The interview ends when you can answer "yes" to all of these:

- Every Expected Result you would write is observable, binary and has a verification method
  (`.specs/shared/acceptance-criteria.md`).
- Each front is explicitly in or out, and you could already write the task breakdown: every Expected Result
  maps to concrete work in a known front and file area.
- Actors and permissions, data (fields, limits, lifecycle), error cases and empty states are decided.
- Out of scope is written down.
- Nothing is "TBD". There are no open questions — only decisions and accepted assumptions.

## 5. Confirm

Before writing, send a summary and ask for an explicit go-ahead:

- spec id and slug (`NNN-slug`, using the next id from the preflight), title, fronts;
- goal (2–4 sentences);
- in scope / out of scope, and the source-document sections the spec implements;
- the Expected Results, one line each (`ER-01 — …`);
- the decisions;
- the task breakdown, one line per task, grouped by front: `T-01 — what, where — Covers: ER-01`. The user
  approves how the work is divided, not only what it delivers: a task that is too big or in the wrong order
  is cheap to fix here and expensive in the middle of execution.

If the user changes something, update and re-confirm only what changed.

## 6. Write the spec

Create `.specs/changes/NNN-slug/spec.md` from `.specs/templates/base-spec-model.md`;
`references/example-spec.md` shows a complete spec that passes the check. The template is the baseline: you
may add a section the change needs (e.g. an API contract table, a state diagram, a data model) or drop an
optional one that doesn't apply, but keep these, because the other skills depend on them: front matter,
Goal, Context, Scope, Decisions, Expected Results, Tasks, Verification Plan, Memory Impact, References, and
the empty Amendments and Review sections.

Writing rules:

- Front matter: `status: planned`, `created:` today's date, `fronts:` only the fronts touched,
  `depends_on:` ids of unfinished specs this one needs.
- Delete every `>` instruction block and every unused placeholder or task group. Don't use blockquotes
  anywhere else in the body either: the check treats them as leftover instructions.
- **Expected Results** follow `.specs/shared/acceptance-criteria.md`: one behavior each, Given/When/Then,
  edge and error cases, front, and a `Verify by` the reviewer can run or follow — matching the project's
  `Automated validation` standard in the technical context.
- **Tasks** — never skip or compress them, however small the change. `spec-execute` executes tasks and
  nothing else: work that isn't a task doesn't get built, and a vague task gets built wrong. Follow
  `.specs/shared/task-breakdown.md`: one group per front the spec touches (the applications and packages
  listed in `technical-context.md`), in dependency order, with the Verification group last. Each task sits in
  one front, is one coherent change small enough for one sitting, and names its real paths, the project skill
  when one fits, `Covers` (ER ids or `enabling`), an observable `Done when`, and the tests that prove its
  behavior and cover every line it adds or changes. Each task becomes one commit, so it must also make sense
  as one.
- **A front without a test runner** can't pass the coverage gate. When the spec touches one, raise it in the
  first analysis: either the spec's first task for that front sets the runner up (`Covers: enabling`), or
  the user decides to exclude that front's files in `technical-context.md` → Coverage before the spec is
  written.
- **Verification Plan** — everything the reviewer will run, on the change rather than the whole repository:
  `node .specs/scripts/run-related-tests.mjs NNN` (the tests the spec adds or changes, and the existing tests
  related to its changes, with coverage); `node .specs/scripts/check-coverage.mjs NNN`, which is mandatory —
  every line the spec adds or changes must be covered, and only `technical-context.md` can exclude a file;
  lint, type check and build of the workspaces it touches; `node .specs/scripts/run-e2e.mjs NNN` when the
  technical context declares e2e suites (it runs those of the apps the spec touches); and the user journeys for
  the user-facing Expected Results no suite covers. When an app has a suite, a user-facing Expected Result's
  `Verify by` names an e2e test, and the task that implements the behavior writes it.
- **Decisions** include the reason, so that the executor doesn't "fix" them and the reviewer can check them.
- **Context** links to memory instead of copying it; only change-specific technical detail goes in the spec.
  Its **Requirements** line links every source-document section the spec implements — the section's own
  anchor, never just the document — or says "none". When the spec deliberately departs from a linked section,
  a Decision records it; the executor and the reviewer read those links.
- **Memory Impact** lists, one bullet per memory file, what `spec-finish` must update: `product.md`
  (concepts, product decisions), `technical-context.md` (stack, conventions), `structure.md` (workspaces,
  modules, aggregates, routes), `modules.md` (a new module or a moved responsibility) and
  `modules/<module-id>.md` (the module's concepts, rules, permissions, boundaries) — or "None.".
- Write in English, like the rest of `.specs/`. Quote user-facing strings literally in the language the
  product uses.
- If supporting files help (a fixture, a payload example, a constant list), put them next to `spec.md` and
  link them.

Then validate it:

```bash
node .specs/scripts/check-spec.mjs NNN
```

It must print `CHECK OK`. It checks the structure: front matter, required sections, template leftovers, the
fields of every Expected Result and task, sequential ids, that every Expected Result is covered by a task, and
every relative link — the file exists and its anchor matches a heading (GitHub's slugs). A broken link on the
Requirements line, or one that links a whole document instead of a section, is an error; elsewhere it is a
warning. `spec-execute` runs the same check and refuses a spec that fails it, so fix every error and rerun; read
the warnings and fix the real ones. Then check what the script can't:

- every task sits in one front, fits in one sitting, and comes after everything it depends on;
- the Verification Plan includes every automated command the Expected Results' `Verify by` mention;
- nothing in Out of Scope appears in an Expected Result or a task;
- no `TBD` or `TODO` is left.

Do not implement anything and do not touch `.specs/memory/` — that belongs to the later stages.

## 7. Report

End with a short message: the spec path, that the check passed, the counts (ERs, tasks per front,
decisions), any accepted assumptions worth a second look, and the next step: `/spec-execute NNN`.

## 8. Amend mode (`--amend NNN`)

Requirements change after planning: a decision turns out wrong, the user wants less (or something else), an
Expected Result can't hold. The spec must change through the workflow, not by hand, so that the executor and
the reviewer can still trust it: ids stay stable, nothing is deleted, every change is logged.

1. **Gate.** The preflight passes, and `check-spec.mjs NNN` finds the spec — if it lives on `spec/NNN-slug`,
   check `git status` is clean and switch to that branch (`node .specs/scripts/status.mjs` shows where it is).
   The status must be `planned`, `in-progress` or `changes-requested`. `in-review` → the review comes first
   (or the user reopens it with `/spec-execute`); `accepted` → finish it and plan the change as a new spec;
   `finished` or `abandoned` → plan a new spec.
2. **Load context** as in section 2, plus the whole spec: tasks with their evidence, Amendments, Review rounds.
   On `in-progress` and `changes-requested`, `git log --oneline <base_commit>..HEAD` shows what is already
   built.
3. **Short interview.** Restate the change and what it touches: which Expected Results, Decisions and tasks
   change, appear or go away; which of those tasks are already done (their code exists); which open review
   findings it makes obsolete; whether Scope or Memory Impact move. Then ask only what the change leaves
   open, with the rules of `.specs/shared/interviewing.md`. If the change is really a different spec, say so:
   abandoning this one and planning a new one may be cleaner.
4. **Confirm** the change as a diff, one line per id: `ER-03 — removed: <reason>`, `ER-05 — added: …`,
   `D-02 — changed: before → after`, `T-07 — added (Covers: ER-05)`. Wait for the go-ahead.
5. **Edit the spec in place**:
   - **Added** Expected Results, decisions and tasks get the next free id — never a reused one — and go where
     they belong (a task in its front's group, before the Verification group). Out-of-order ids are fine.
   - **Removed** ones stay, struck through and marked with the reason, never deleted:
     `### ~~ER-03 — Title~~ (removed: <reason>)`, `- [ ] ~~**T-04** — …~~ (removed: <reason>)`,
     `| D-02 | ~~…~~ (removed: <reason>) | … |`. A task that only covers removed Expected Results is removed too.
   - **A task that is already done** is never reworded or unchecked: its commit exists. When its work must
     change or go, add a new task that changes or undoes it; when its code stays, the removal reason says why.
   - **Changed** Expected Results, decisions and pending tasks are edited in place; the log keeps the before.
   - Update Goal, Scope, the Requirements line, the Verification Plan and Memory Impact when the change moves
     them.
   - Log every change under `## Amendments`, one bullet each:
     `- YYYY-MM-DD — /spec-plan --amend — ER-03 removed: <before → after>. Reason: <why>. Approved by the user.`
   - Don't touch `## Review`: findings that the change makes obsolete stay open, and `spec-execute` closes them
     pointing to the amendment.
   - The status doesn't change.
6. **Validate** with `check-spec.mjs NNN` (`CHECK OK`, struck items accepted) and the checks of section 6.
7. **Commit** when the spec is on its branch (any status but `planned`): the spec alone,
   `docs(spec-NNN): amend <what changed>`. A `planned` spec isn't committed yet: leave it as it is.
8. **Report**: what changed, by id; the tasks to (re)do; and the next step — `/spec-execute NNN`.

## 9. Abandon mode (`--abandon NNN`)

A spec that is no longer wanted is archived with its reason instead of lingering in `changes/` or vanishing:
the id is never reused, and whoever reads the history knows why it stopped.

1. **Gate.** The preflight passes, and the status is `planned`, `in-progress` or `changes-requested` (the
   same rule as amend: an accepted spec is finished, not abandoned). Ask for the reason if the user didn't
   give one: one or two sentences someone will read a year from now.
2. **Confirm** with the user: the spec, its progress (`status.mjs` shows it), the reason, and that the
   branch is kept with whatever was built — nothing reaches the default branch except the archived spec.
3. **Bring the spec to the default branch** when it lives on `spec/NNN-slug` (any status but `planned`):
   check `git status` is clean, `git switch <default branch>`, then
   `git checkout spec/NNN-slug -- .specs/changes/NNN-slug` — the spec folder only, never the code. A
   `planned` spec is abandoned where it is.
4. **Archive** it:

   ```bash
   node .specs/scripts/abandon-spec.mjs NNN --reason "<why>"
   ```

   It sets `status: abandoned` and `abandoned: <date>`, writes the reason and the progress under
   `## Outcome`, and moves the folder to `.specs/finished/<YYYYMMDDHHMMSS>-NNN-slug/`. The memory and the
   source documents are not touched: they describe what is built, and the spec built nothing that ships.
5. **Validate** with `check-spec.mjs NNN` (`CHECK OK`, status `abandoned`), then **commit** the archived spec
   alone on the current branch: `docs(spec-NNN): abandon <slug>`, with the reason in the body. Never push.
6. **Report**: where it was archived, the reason, and the branch that is kept — deleting it
   (`git branch -D spec/NNN-slug`, and the remote one) is the user's call; never delete it yourself.

## 10. Quick mode (`--quick`)

For a small change that still changes behavior, data or a contract: the same contract and the same workflow,
with less planning. The rules are in `spec-lifecycle.md` → When a spec is needed.

1. **Preflight and context** as in sections 1–2, reading only what the change touches: the memory, the source
   sections it implements, the code around it.
2. **Check it fits**: one or two fronts, at most 3 Expected Results, no new domain concept, no data migration,
   no change to authentication or permissions, no overlap with an active spec. If it doesn't fit, say why and
   switch to the full flow (sections 3–7) — don't squeeze a big change into a short template.
3. **No interview rounds when the request is unambiguous.** When something is open, ask it in one round of at
   most 3 questions, with your recommendation — never more.
4. **Confirm in one message**: id and slug, title, the Expected Results (`ER-01 — …`), the tasks
   (`T-01 — what, where — Covers: ER-01`), and any decision you made. Wait for the go-ahead.
5. **Write** `.specs/changes/NNN-slug/spec.md` from `.specs/templates/quick-spec-model.md`
   (`references/example-quick-spec.md` shows one): `template: quick`, Goal, Context with its Requirements line,
   1–3 Expected Results by the usual rules, tasks with their tests, the Verification task, a Verification Plan
   with the related tests and the coverage gate, and Memory Impact (or "None."). Add `Scope` or `Decisions`
   only when something is deliberately excluded or decided.
6. **Validate** with `check-spec.mjs NNN` — it applies the quick template's rules — and report as in section
   7. The next step is `/spec-execute NNN`; after it, the review may run in the same session (a self-review).

## Example of a good first analysis (abridged)

> **What I understood:** owners can cancel a booked walk from the mobile app, and the walker's slot opens
> up again. Fronts: booking module, backend, mobile.
>
> **Issues found**
> - *Contradiction:* you said "cancel anytime", but `product.md` → Relevant product decisions says
>   cancellations close 2h before the walk. Which one wins?
> - *Ambiguity:* "refund the owner" — money back to the card, or credit for a future walk? The code has no
>   payment concept yet (`modules/` has only `auth`).
> - *Missing:* what the walker sees and whether they are notified; whether a waitlist exists (spec 004 is
>   planning one — overlap).
>
> **Questions**
> 1. Cancellation cutoff: keep the 2h rule from product.md? *Recommended: yes — it is a recorded product
>    decision, and changing it would also change spec 004.*
> 2. …
