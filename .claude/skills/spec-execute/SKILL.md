---
name: spec-execute
description: Execute a planned spec from .specs/changes/ task by task on its own branch (spec/NNN-slug) — implementing each task (with the project skill it names), verifying its "Done when", recording evidence in the spec and committing the task, then running the related tests and the changed-lines coverage gate before handing the spec to review. Also resumes an interrupted execution and fixes the findings of a review that requested changes. Use whenever the user runs /spec-execute, or asks to implement, build, execute, start, continue or resume a spec or its tasks ("implement spec 003", "continue the booking spec", "fix the review findings on 002") — even if they don't say "execute". Not for writing or changing a plan (spec-plan) or for reviewing an implementation (spec-review).
argument-hint: "[spec id, slug or path]"
---

# spec-execute

A spec is a contract: `spec-plan` wrote it with the user, and `spec-review` — a different agent that never
sees this session — will check the implementation against it. This skill turns the spec's tasks into code,
one commit per task, and leaves behind evidence the reviewer can trust. Two things matter most:

- **Do exactly what the spec says** — all of it, and nothing it didn't ask for. Extra refactors and
  "improvements" widen the review and can break Decisions you didn't know the reason for.
- **Record only what was verified.** A checked box that wasn't verified is worse than an unchecked one: it
  sends the reviewer looking in the wrong place and hides the real state from whoever resumes the work.

The flow is: **find the spec → gate → prepare the branch → execute and commit the tasks one by one → verify the
change → hand off to review → report.**

## 1. Find the spec

The argument may be an id (`3`, `003`), a slug, a folder or a path to `spec.md`. Run from the repo root:

```bash
node .specs/scripts/check-spec.mjs <argument>
```

A spec under execution lives on its branch, not on the default branch, so when the check can't find it or no
argument was given, list every spec with `node .specs/scripts/status.mjs` — it reads them from their
branches. If exactly one is executable (`planned`, `in-progress` or `changes-requested`), use it and say
which; if several are, ask which one; if none is, say so and point to `/spec-plan`. When the spec lives on
`spec/NNN-slug`, switch to that branch (after checking `git status`, as in section 3) and rerun the check.

## 2. Gate

Stop before touching code if any of these fails, and tell the user what is wrong and what fixes it.

1. **Memory** — `node .specs/scripts/preflight.mjs` prints `PREFLIGHT OK`. Otherwise: `/spec-init`.
2. **Structure** — `check-spec.mjs <spec>` prints `CHECK OK`. Errors mean the plan isn't executable as
   written (tasks without `Covers` or `Done when`, Expected Results no task covers, template leftovers): send
   it back to `/spec-plan` instead of guessing what the planner meant. Read the warnings too.
3. **Status** decides what happens next:
   - `planned` → start at the first task;
   - `in-progress` → resume at the first unchecked task (the check prints it as `next task`);
   - `changes-requested` → fix the open review findings (section 6);
   - `in-review` → it is waiting for review: point to `/spec-review` and stop, unless the user explicitly
     wants to reopen it;
   - `accepted`, `finished` or `abandoned` → nothing to execute (`/spec-finish` for an accepted spec).
4. **Dependencies** — every spec in `depends_on` should be finished (the check shows their status). If one
   isn't, say which and ask whether to go ahead anyway.

## 3. Prepare

- Read `.specs/shared/how-to-execute.md` (execution rules, commits, evidence format),
  `.specs/shared/task-breakdown.md` and `.specs/shared/naming-rules.md`, then the memory:
  `technical-context.md` first — its architecture, conventions and validation standard are what your code must
  follow — then `product.md` and the rest.
- Read the whole spec: Goal, Context, Scope, Decisions, Expected Results, Tasks, Verification Plan,
  Amendments, Review. Read `CLAUDE.md` / `AGENTS.md` and the `SKILL.md` of every skill the tasks name.
- Read the source-document sections linked in Context → Requirements: they hold detail the spec summarizes.
  When they and the spec disagree, the spec wins if a Decision explains why; if none does, ask the user.
- **The branch.** Every spec is built on `spec/NNN-slug`.
  - First run (`planned`): run `git status` — if there are uncommitted changes besides the spec itself, tell
    the user and ask: they would come along to the branch. Never stash, reset or discard their work. Then
    `git switch -c spec/NNN-slug`, set `status: in-progress`, add `started: <today>` and
    `base_commit: <git rev-parse HEAD>` to the front matter, and commit the spec:
    `docs(spec-NNN): start <slug>`.
  - Resuming: `git switch spec/NNN-slug` if you aren't on it.
- Tell the user in one short message what is about to happen: the spec, the tasks per front, where you start.

## 4. Execute the tasks

One task at a time, in document order. For each unchecked task — skipping the ones an amendment struck through
and marked `(removed: …)`:

1. **Understand it** — what, where, the skill it names, the Expected Results it covers (reread them) and the
   Decisions that constrain it. Look at the current code before changing it.
2. **Implement it.**
   - When it names a skill, invoke that skill with the task's specifics — files, fields, and the rules from
     the Expected Results and Decisions — as the main implementation. Check what it produced against the
     task, and finish by hand only what it didn't cover, recording the deviation.
   - Follow the technical context, `CLAUDE.md` and the naming rules. Stay inside the task: no refactors,
     renames or improvements the spec didn't ask for. Note them for the report instead.
   - When an Expected Result's `Verify by` names a test, write it in the task that implements the behavior —
     first, when practical, and watch it fail. A test that can't fail proves nothing, and the reviewer will
     look for that.
   - Every line the task adds or changes must be covered — the statements, branches and functions on it. If a
     line can't reasonably be covered, don't exclude its file or add a coverage-ignore comment on your own:
     exclusions are project policy in `technical-context.md`. Ask the user.
3. **Verify it** — run the check in `Done when` (the narrowest command that proves it: the task's tests, the
   workspace's type check…) and read the output. If it fails, fix and rerun. The task isn't done until the
   check passes.
4. **Record it** — check the box and write the evidence below it, in the format from `how-to-execute.md`: what
   was done, every file touched (paths from the repo root), the command and its result, deviations.
5. **Commit it** — the task's files and the spec, nothing else: `git add -- <files> <the spec>`, then
   `<type>(spec-NNN): <what the task did> (T-03)`. Never commit secrets or local settings. Committing every
   task right away keeps the history exact, and the branch is the progress record: an interrupted session
   resumes from it.

When reality doesn't match the plan:

- **A small technical step is missing** inside a task (a dependency, a bit of wiring) → do it as part of that
  task and mention it in the evidence.
- **An Expected Result needs work no task covers** → append a task to the right group with the next free id,
  marked `(added during execution)`, execute it like the others, and mention it in the report.
- **The plan is wrong** — a Decision or Expected Result contradicts the code or a constraint, or a task is
  impossible as written → stop and explain, with a concrete proposal. Change Scope, Decisions or Expected
  Results only after the user explicitly approves, by the rules in `spec-lifecycle.md` → Changing a spec, and
  log the change under `## Amendments` (date, before → after, reason). When the change is bigger than a
  sentence or two — several Expected Results, tasks to remove, a new front — stop and point to
  `/spec-plan --amend NNN` instead. When the user no longer wants the spec at all: `/spec-plan --abandon NNN`.
- **Blocked** — a missing credential, an external service, a decision only the user can make → leave the box
  unchecked with ⛔ evidence, continue with the tasks that don't depend on it, and ask the user once you run
  out of them.
- **Destructive or outward-facing actions** — deleting data, migrations that drop columns or tables,
  anything against a non-local environment, publishing → ask first, even when the task implies it. Never
  push: pushing belongs to `spec-finish`.

## 5. Verify the change and hand off

When every task is checked:

1. Run the Verification Plan. Tests run on the change, not on the whole repository:

   ```bash
   node .specs/scripts/run-related-tests.mjs <spec id>   # tests this spec added or changed, and the existing
                                                         # tests related to its changes, with coverage
   node .specs/scripts/check-coverage.mjs <spec id>      # every line the spec adds or changes is covered
   ```

   Then lint, type check and build for the workspaces the spec touches, the e2e suites
   (`node .specs/scripts/run-e2e.mjs <spec id>`, with their services up), and the user journeys no suite
   covers that you can drive yourself (browser, simulator) — for the ones you can't, write exactly what the
   user must do and see. Everything passes; otherwise fix, commit the fix with the task it belongs to (or a new one), and
   rerun.
2. Go through each Expected Result: its `Verify by` passes and its edge and error cases are handled. This
   isn't the review — it keeps the review from bouncing on something obvious.
3. Rerun `check-spec.mjs <spec>`: no task unchecked or without evidence, `CHECK OK`.
4. Set `status: in-review` and commit the spec: `docs(spec-NNN): ready for review`. If a task is still
   blocked, keep `in-progress` and say what unblocks it.

## 6. Fixing review findings (`changes-requested`)

The reviewer's findings are in `## Review`, under the latest round: `- [ ] **F-NN** (ER-xx) — …`.

1. Switch to `spec/NNN-slug` and set `status: in-progress`.
2. For each open finding: reproduce it the way the reviewer observed it, fix it, verify, check it and add
   evidence below it, in the same format as tasks, and commit it: `fix(spec-NNN): <what> (F-01)`.
3. If a finding looks wrong — it asks for something out of scope, or misreads an Expected Result — don't skip
   it silently: record why below it with ⛔ and ask the user.
4. Rerun the Verification Plan and `check-spec.mjs`, set `status: in-review`, and commit the spec.

## 7. Report

Keep it short:

- what was built, per front, and the commits (`git log --oneline <base_commit>..HEAD`);
- deviations, tasks added during execution, and amendments;
- anything still blocked, and what unblocks it;
- issues noticed outside the scope, as follow-ups (not fixed);
- the next step: `/spec-review NNN`, ideally in a fresh session, so the reviewer judges the code against the
  spec without this session's context — that independence is what makes the review worth running. A quick
  spec (`template: quick`) may be reviewed in this same session, as a self-review.
