---
name: spec-plan
description: Plan a new change in this repo as a spec (spec-driven development). Interviews the user critically until every requirement is unambiguous, then writes .specs/changes/NNN-slug/spec.md with a goal, scope, decisions, verifiable Expected Results and a breakdown into small, verifiable tasks per front (e.g. backend, web, mobile, infra) that spec-execute runs one by one. Use whenever the user runs /spec-plan, or asks to plan, spec out, scope or write a spec/PRD/proposal for a feature, change or fix before implementing it — even if they don't say "spec". Do not use for executing, reviewing or finishing an existing spec.
argument-hint: "<what to build, as text or a path to a file>"
---

# spec-plan

Turn a request into a spec that two other agents can rely on: one implements it (`spec-execute`), and a
different one checks the implementation against it (`spec-review`) without ever seeing this conversation.
That second agent is the reason for most of what follows. Anything left vague here becomes either a wrong
implementation or a review that can't decide pass/fail — so the job of this skill is to be the person in the
room who refuses to let ambiguity through, while staying constructive and fast.

The flow is: **preflight → load context → first analysis → interview → confirm → write → report.**
Do not write the spec file before the user has confirmed the summary.

## 1. Preflight (hard gate)

Run from the repo root:

```bash
node .claude/skills/spec-plan/scripts/preflight.mjs
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
  behavior and leave every file it touches at 100% coverage.
- **Verification Plan** — everything the reviewer will run: every test suite (not only the new tests), lint,
  type check and build; the tests with coverage followed by
  `node .claude/skills/spec-plan/scripts/check-coverage.mjs NNN`, which is mandatory — every source file the
  spec creates or changes must reach 100%, and only `technical-context.md` can exclude a file; the e2e suites
  of the apps the spec touches; and the user journeys for user-facing Expected Results. Take the commands from
  the technical context's Automated validation section.
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
node .claude/skills/spec-plan/scripts/check-spec.mjs NNN
```

It must print `CHECK OK`. It checks the structure: front matter, required sections, template leftovers, the
fields of every Expected Result and task, sequential ids, and that every Expected Result is covered by a
task. `spec-execute` runs the same check and refuses a spec that fails it, so fix every error and rerun; read
the warnings and fix the real ones. Then check what the script can't:

- every task sits in one front, fits in one sitting, and comes after everything it depends on;
- the Verification Plan includes every automated command the Expected Results' `Verify by` mention;
- nothing in Out of Scope appears in an Expected Result or a task;
- no `TBD` or `TODO` is left.

Do not implement anything and do not touch `.specs/memory/` — that belongs to the later stages.

## 7. Report

End with a short message: the spec path, that the check passed, the counts (ERs, tasks per front,
decisions), any accepted assumptions worth a second look, and the next step: `/spec-execute NNN`.

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
