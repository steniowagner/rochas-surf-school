# How to Execute

Standard rules for executing a spec. Used by `spec-execute`; read by `spec-review` to know what to expect.

## Starting

1. Read Goal, Context (and the source-document sections its Requirements line links), Scope, Decisions,
   Expected Results and Tasks before touching code.
2. On the first run, create the branch `spec/NNN-slug` from the current `HEAD` and switch to it. Set
   `status: in-progress`, add `started: YYYY-MM-DD` and `base_commit: <sha of the commit the branch starts
   from>` to the front matter, and commit the spec: `docs(spec-NNN): start <slug>`. `base_commit` lets everyone
   see exactly what the spec changed (`git diff <base_commit>`).
3. When resuming (`in-progress`), switch to the spec's branch and continue from the first unchecked task:
   checked tasks are done and committed.

## Executing tasks

4. Tasks run in document order: groups top to bottom, tasks top to bottom.
5. When a task names a skill, script or generator, use it as the main implementation. If it doesn't cover the
   whole case, apply it as far as it makes sense and record the deviation in the evidence.
6. Check a box only after the task's `Done when` was actually verified — the command run and its output read.
   Write the evidence right below the task, listing every file the task created, changed or deleted, with its
   path from the repo root.
7. Commit the task right away — its files and the spec with its evidence, nothing else:
   `<type>(spec-NNN): <what the task did> (T-03)`, with the type the repo's convention uses (`feat`, `fix`,
   `refactor`, `test`, `chore`…). One task, one commit: the history then reads like the task list.
8. Every line a task adds or changes is covered by tests — the statements, branches and functions on it. Its
   tests are written in the same task. Coverage exclusions are project policy (`technical-context.md` →
   Coverage): don't add one — ask the user.
9. Never remove, reorder or reword a task. Work an Expected Result needs that no task covers is appended to
   the relevant group with the next free id and marked `(added during execution)`. A task struck through and
   marked `(removed: …)` by an amendment is skipped.
10. A change to Scope, Decisions or Expected Results needs the user's explicit approval. Apply a small one in
    place, by the rules in [Spec lifecycle → Changing a spec](spec-lifecycle.md#changing-a-spec) (new ids,
    removed items struck through, never deleted), and log it under `## Amendments`: date, before → after,
    reason. Anything bigger — several Expected Results, removing tasks, a new front — goes through
    `/spec-plan --amend NNN`.
11. A blocked task keeps its box unchecked, with ⛔ evidence. Stop and ask the user when the blocker needs a
    decision, a credential or access, or changes a Decision or an Expected Result.

## Testing the change

Tests run on the change, not on the whole repository: the tests the spec added or changed, and the existing
tests that load a file it changed.

```bash
node .specs/scripts/run-related-tests.mjs <spec id>   # related tests, with coverage, workspace by workspace
node .specs/scripts/check-coverage.mjs <spec id>      # every changed line covered
```

`run-related-tests.mjs` also runs the suites of the workspaces that import a changed workspace, for
regression: their imports go through the package, which a test runner can't trace back to files.

```bash
node .specs/scripts/run-e2e.mjs <spec id>             # e2e suites of the apps the change touches
```

`run-e2e.mjs` runs the suites declared in the technical context's `e2e` block for the workspaces the spec
changed and those that depend on them. Their services (a database) must be up first.

## Finishing

12. When every task is checked, run the Verification Plan — the related tests with coverage, the coverage
    gate (`COVERAGE OK`), lint, type check and build for the workspaces the spec touches, and the e2e suites
    (`E2E PASSED`); everything passes.
13. Set `status: in-review` and commit the spec: `docs(spec-NNN): ready for review`.

## Evidence format

```md
- [x] **T-03** — task description
  > ✅ YYYY-MM-DD HH:MM — what was done; files: `apps/api/src/booking/booking.controller.ts`,
  > `apps/api/src/booking/booking.controller.spec.ts`; verified: `npx vitest related --run …` (12 passed);
  > deviations: none
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

A finding is tagged with what it breaks: `(ER-xx)`, `(D-xx)`, `(requirement)` (a linked source-document
section), `(coverage)`, `(tests)`, `(scope)` or `(convention)`.

Set `status: in-progress`, then for each open finding: fix it, verify it the way the reviewer observed it, check
it and add evidence below it, in the same format as tasks, and commit it: `fix(spec-NNN): <what> (F-01)`. If a
finding looks wrong (it asks for something out of scope, or misreads an Expected Result), don't skip it
silently: record why below it with ⛔ and ask the user. A finding an amendment made obsolete (it is about an
Expected Result or a decision that was removed) is checked with evidence that names the amendment. Rerun the
Verification Plan, set `status: in-review` and commit the spec.

## Intent

These rules keep execution traceable without turning the spec into heavy documentation: the reviewer can
trust a checked box, every task is one commit, and anyone can resume an interrupted execution from the spec
and the branch alone.
