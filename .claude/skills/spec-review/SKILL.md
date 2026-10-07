---
name: spec-review
description: Independently review an implemented spec from .specs/changes/ against its contract — runs the tests related to the change, enforces that every changed line is covered, verifies each Expected Result (including end-to-end checks on the running apps, from the user's perspective), checks Decisions, scope and test quality, and records the verdict in the spec's Review section as a commit on the spec's branch — on acceptance, with the reviewed commit, so spec-finish ships exactly what was reviewed. Use whenever the user runs /spec-review, or asks to review, verify, validate, QA or accept a spec or its implementation ("review 001-start-monorepo", "is spec 003 done?", "check the booking spec") — even if they don't say "review". Not for planning (spec-plan), implementing or fixing findings (spec-execute), or archiving (spec-finish).
argument-hint: "<spec id, slug or path>"
---

# spec-review

You are the independent check between "the executor says it's done" and "it is done". You never saw the
planning interview or the execution: you have the spec, the code and the tools to run both — and that
distance is the point. Judge the implementation only against what the spec says, verify instead of trusting
the recorded evidence, and make every finding concrete enough that the executor can reproduce and fix it
without asking you anything.

The flow is: **find and gate → understand the contract → what changed → run the checks → verify each Expected
Result → review the code → verdict and commit → report.** This skill changes no code: it commits only its
review round, on the spec's branch. Pushing belongs to `spec-finish`.

## 1. Find the spec and gate

Locate it from the repo root (the argument is an id, a slug like `001-start-monorepo`, or a path):

```bash
node .specs/scripts/check-spec.mjs <argument>
```

A spec under review lives on its branch, `spec/NNN-slug`: if the check can't find it, `node
.specs/scripts/status.mjs` shows where it is — switch to its branch and rerun the check.

The status decides what happens:

- `in-review` → review it.
- `planned` or `in-progress` → not ready: point to `/spec-execute` and stop.
- `changes-requested` → the last round's findings are still open: point to `/spec-execute` and stop.
- `accepted` → already accepted; review again only when the user asks — typically because `spec-finish`
  found that the code changed after the review.
- `finished` or `abandoned` → nothing to review.

Then stop and say why if any of these fails:

- `node .specs/scripts/preflight.mjs` prints `PREFLIGHT OK`.
- `check-spec.mjs` prints `CHECK OK`: every task checked with evidence, nothing blocked.
- You are on the spec's branch, `spec/NNN-slug` (`git switch` to it), and `git status` is clean: the executor
  commits every task, so uncommitted code means the execution isn't finished — point to `/spec-execute`.
- The front matter has a `base_commit` that exists (`git cat-file -e <sha>`): it defines what the spec
  changed, and the coverage gate depends on it.

**Independence.** If this conversation is the one that executed the spec — you wrote the code under review
— say so and recommend running `/spec-review` in a fresh session. Continue only if the user insists, and
mention it in the review round. A quick spec (`template: quick`) is the exception: its review may run in the
same session. Do every step all the same — the related tests, the coverage gate, each Expected Result — and
mark the round as a self-review in its heading: `### Round 1 — YYYY-MM-DD — accepted (self-review)`.

## 2. Understand the contract

Read the whole spec — Goal, Scope, Decisions, Expected Results, Tasks and their evidence, Verification
Plan, Amendments, earlier Review rounds — plus `.specs/shared/acceptance-criteria.md`,
`.specs/shared/task-breakdown.md`, `.specs/shared/how-to-execute.md`, `.specs/shared/naming-rules.md`, the
memory (`technical-context.md` first: architecture, conventions, and the Automated validation section with
its test runners, coverage notes and e2e suites; then `product.md`) and `CLAUDE.md` / `AGENTS.md`.

Also read the source-document sections linked in Context → Requirements. Behavior that contradicts them
without a Decision or an Amendment explaining why is a finding; what the spec's Scope leaves out is not.

Treat the evidence as claims to verify, not as proof. If an earlier round exists, check each of its findings
specifically — and still review everything else: a fix can break something that used to pass.

## 3. What changed

- `git log --oneline <base_commit>..HEAD` shows the work commit by commit — one per task, plus the fixes of
  earlier rounds — and `git diff --stat <base_commit>..HEAD` the whole change. Read the diff.
- Every changed file should be explained by a task. Changes no task explains, or that build something in
  Out of scope, are findings — unless trivial and necessary (the lockfile for a dependency a task added).
- Hand edits to generated or ignored folders, committed secrets, debug leftovers, commented-out code and
  stray TODOs are findings.

## 4. Run the checks

Start from a reproducible state: install dependencies if the lockfile changed, run the project's generators
(e.g. the Prisma client), apply migrations to the local database. Never reset or delete data without asking.

1. **The related tests** — the tests the spec added or changed, the existing tests that load a file it
   changed, and the suites of workspaces that import a changed workspace. Not the whole repository:

   ```bash
   node .specs/scripts/run-related-tests.mjs <spec id>
   ```

   It must print `RELATED TESTS PASSED`. A red test is a finding, even if it looks unrelated. If one looks
   flaky, rerun it once; red twice is a finding.
2. **Coverage of the changed lines** — right after the related tests, which wrote the coverage reports:

   ```bash
   node .specs/scripts/check-coverage.mjs <spec id>
   ```

   It must print `COVERAGE OK`: every line the spec added or changed is covered — the statements, branches and
   functions on it. The only exclusions are the ones declared in `technical-context.md`; you don't add any.
   Also search the diff for coverage-ignore comments (`istanbul ignore`, `v8 ignore`, `c8 ignore`): each needs
   a written reason, and you judge whether it holds.
3. **Test quality** — coverage proves the lines ran, not that the behavior is checked. For every Expected
   Result with an automated `Verify by`, the named test exists, runs, and asserts the observable behavior and
   each edge and error case. Tests without meaningful assertions, tests that only check that mocks were
   called, and tests that would still pass with the implementation removed are findings.
4. **The rest of the Verification Plan** — lint, type check and build of the workspaces the spec touches, e2e
   suites, and anything else it lists.

## 5. Verify each Expected Result

Follow each Expected Result's `Verify by` yourself and record how it went. Expected Results an amendment
struck through and marked `(removed: …)` are not verified — but check that the amendment is logged under
`## Amendments`, and that nothing in the code still builds them (that is a `(scope)` finding).

- **Tests and commands** — run them (step 4 already covers most).
- **HTTP** — start the backend and its database locally and send the requests; compare status and body with
  the Expected Result.
- **User-facing behavior (e2e)** — run the app's e2e suites when the project has them. Then exercise the
  Expected Result the way a user would: drive the web app with the browser automation available in this
  session and the mobile app in the simulator — tap, type, read the screen — following its Given/When/Then
  and its edge cases. When no automation is available, give the user the exact steps and ask them to report
  what they see; until someone has seen it, it is not a pass.

Start the services the checks need in the background, and stop the ones you started when you finish. An
Expected Result passes only when its behavior *and* its edge and error cases hold.

## 6. Review the code

Against the contract, not your taste:

- every Decision (`D-NN`) is honored;
- the architecture and conventions of the technical context and `CLAUDE.md` hold: layer dependencies,
  naming rules, error format, data ownership;
- nothing in Out of scope was built;
- `## Memory Impact` matches what was actually built — `spec-finish` relies on it. Note anything missing.

A different but valid design is not a finding. Put useful suggestions under Notes.

## 7. Verdict and commit

- **accepted** — every Expected Result passes, the related tests are green, `COVERAGE OK`, the Verification
  Plan passes, and there are no findings.
- **changes-requested** — anything else.

Append a new round at the end of `## Review`; never edit earlier rounds:

```md
### Round 1 — YYYY-MM-DD — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (apps/api, modules/booking)
- related tests ✅ 48 passed (modules/booking, apps/api)
- coverage of the changed lines ❌ 1 of 9 files has uncovered changed lines
- e2e: backend suite ✅ 12 passed · web: ER-04 exercised in the browser ✅

**Expected Results**

- ER-01 ✅ — `cancel booking` request → 200; status `cancelled`; the slot is free again
- ER-02 ❌ — see F-01

**Findings**

- [ ] **F-01** (ER-02) — a booking exactly 2h ahead is refused with 409; D-01 says it is still allowed.
  Reproduce: `cancel at the limit` request in `booking.integration.http`. Expected: 200.
- [ ] **F-02** (coverage) — `booking.controller.ts` lines 41–44 (the 404 branch) are never executed.

**Notes**

- …
```

Each finding is one problem, tagged with what it breaks — `(ER-xx)`, `(D-xx)`, `(requirement)`,
`(coverage)`, `(tests)`, `(scope)` or `(convention)` — with how to reproduce it and what is expected.

Then set `status` to `accepted` or `changes-requested`. When accepted, also add `reviewed_commit:
<git rev-parse HEAD>` to the front matter — the commit you reviewed; `spec-finish` refuses to ship, and the CI
check fails the pull request, if anything outside `.specs/` and the source documents changed after it. Rerun `check-spec.mjs`, then commit the spec alone:
`docs(spec-NNN): review round N — <verdict>`.

## 8. Report

Keep it short: the verdict; each Expected Result with ✅/❌; the checks and coverage; the findings by id.

- Accepted → the next step: `/spec-finish NNN`, which updates the memory and the source documents, archives
  the spec, pushes `spec/NNN-slug` and opens the pull request. Run it before touching the code again.
- Changes requested → the next step: `/spec-execute NNN` to fix the findings, then `/spec-review NNN` again,
  in a fresh session.
