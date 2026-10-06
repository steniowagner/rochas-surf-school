# How to Execute

Standard rules for executing a spec. Used by `spec-execute`; read by `spec-review` to know what to expect.

## Starting

1. Read Goal, Context, Scope, Decisions, Expected Results and Tasks before touching code.
2. On the first run, set `status: in-progress` and add `started: YYYY-MM-DD` and `base_commit: <short sha of
   HEAD>` to the front matter. `base_commit` lets the reviewer see exactly what the spec changed
   (`git diff <base_commit>`).
3. When resuming (`in-progress`), continue from the first unchecked task: checked tasks are done.

## Executing tasks

4. Tasks run in document order: groups top to bottom, tasks top to bottom.
5. When a task names a skill, script or generator, use it as the main implementation. If it doesn't cover the
   whole case, apply it as far as it makes sense and record the deviation in the evidence.
6. Check a box only after the task's `Done when` was actually verified — the command run and its output read.
   Add the evidence right below the task before starting the next one, so the spec always shows the real
   progress. List every file the task created, changed or deleted, with its path from the repo root:
   `spec-finish` builds one commit per task from those lists.
7. Every file a task creates or changes ends at 100% coverage; its tests are written in the same task.
   Coverage exclusions are project policy (`technical-context.md` → Coverage): don't add one — ask the user.
8. Never remove, reorder or reword a task. Work an Expected Result needs that no task covers is appended to
   the relevant group with the next free id and marked `(added during execution)`.
9. A change to Scope, Decisions or Expected Results needs the user's explicit approval. Apply it in place and
   log it under `## Amendments`: date, before → after, reason.
10. A blocked task keeps its box unchecked, with ⛔ evidence. Stop and ask the user when the blocker needs a
    decision, a credential or access, or changes a Decision or an Expected Result.

## Finishing

11. When every task is checked, run the Verification Plan — every test suite, the tests with coverage and
    `check-coverage.mjs` (`COVERAGE OK`), lint, type check, build and the e2e suites; everything passes.
12. Set `status: in-review`.

## Evidence format

```md
- [x] **T-03** — task description
  > ✅ YYYY-MM-DD HH:MM — what was done; files: `apps/api/src/booking/booking.controller.ts`,
  > `apps/api/src/booking/booking.controller.spec.ts`; verified: `npx vitest run …` (12 passed); deviations: none
```

A task that could not be completed keeps its box unchecked:

```md
- [ ] **T-04** — task description
  > ⛔ YYYY-MM-DD HH:MM — why it is blocked and what is needed to unblock it
```

## Fixing review findings

When `spec-review` sets `status: changes-requested`, its findings are in `## Review`, under the latest round:

```md
### Round 1 — YYYY-MM-DD — changes-requested

- [ ] **F-01** (ER-03) — what failed and how it was observed
```

A finding is tagged with what it breaks: `(ER-xx)`, `(D-xx)`, `(coverage)`, `(tests)`, `(scope)` or
`(convention)`.

Set `status: in-progress`, fix each open finding, verify it the way the reviewer observed it, then check it
and add evidence below it, in the same format as tasks. If a finding looks wrong (it asks for something out
of scope, or misreads an Expected Result), don't skip it silently: record why below it with ⛔ and ask the
user. Rerun the Verification Plan and set `status: in-review`.

## Intent

These rules keep execution traceable without turning the spec into heavy documentation: the reviewer can
trust a checked box, and anyone can resume an interrupted execution from the spec alone.
