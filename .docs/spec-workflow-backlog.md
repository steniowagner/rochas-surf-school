# Spec Workflow — Backlog

Improvements to the spec-driven workflow (`spec-init`, `spec-plan`, `spec-execute`, `spec-review`,
`spec-finish`) that are worth adding but not built yet. Each item says why it matters, what it is, a design
sketch that fits the current workflow, and when it is done.

Before any of them: run one small real spec through the whole workflow. Every item below is easier to get
right once the workflow has been used for real.

## Contents

1. [CI check on spec pull requests](#1-ci-check-on-spec-pull-requests)
2. [`/spec-status`](#2-spec-status)
3. [Revising and abandoning a spec](#3-revising-and-abandoning-a-spec)
4. [A lightweight path for trivial changes](#4-a-lightweight-path-for-trivial-changes)
5. [Real end-to-end suites](#5-real-end-to-end-suites)
6. [Link checking in the spec validator](#6-link-checking-in-the-spec-validator)
7. [Evals and description tuning for the skills](#7-evals-and-description-tuning-for-the-skills)

## 1. CI check on spec pull requests

**Status.** Done in framework 1.5.0: `.specs/scripts/check-pr.mjs` (steps 1–3), the workflow template
`.specs/templates/github-spec-check.yml` (step 4 with Turborepo's `--filter=...[<base_commit>]`), offered by
`spec-init`, and this repository's `.github/workflows/spec-check.yml`. `spec-finish` and the CI check share the
"nothing changed since the review" rule (`reviewDrift` in `lib/spec.mjs`), which leaves out the source
documents: `spec-finish` used to refuse its own source-document updates. Still to do by hand: make the `spec`
job a required check on `main`.

**Why.** Every check in the workflow runs inside an agent session. Nothing stops a pull request that skipped
the review, or whose branch changed after it. A CI check makes the rules hold whoever pushes.

**What.** A GitHub Actions workflow that runs on pull requests from `spec/**` branches and fails when the spec
isn't really done.

**Design sketch.**

- `.github/workflows/spec.yml`, on `pull_request` for `spec/**` branches; Node per `engines`, `npm ci`, the
  project's generators (e.g. `prisma generate`).
- Find the spec from the branch name (`spec/NNN-slug` → `.specs/finished/*-NNN-slug/spec.md`).
- Steps, each failing the job:
  1. `node .specs/scripts/check-spec.mjs NNN` — `CHECK OK`, status `finished`.
  2. The reviewed code is what ships: nothing outside `.specs/` and the source documents changed between
     `reviewed_commit` and the head of the branch
     (`git diff --name-only <reviewed_commit> HEAD -- . ':(exclude).specs' ':(exclude).docs'` is empty).
  3. `node .specs/scripts/run-related-tests.mjs NNN` and `node .specs/scripts/check-coverage.mjs NNN`.
  4. Lint, type check and build of the affected workspaces (`turbo run lint check-types build
     --filter=...[<base_commit>]`).
- Optional second job for the e2e suites (item 5), with a Postgres service container.
- Make the workflow a required check on the default branch.

**Done when.** A pull request from a spec branch can't be merged unless all the steps pass; a pull request
whose code changed after the review fails step 2.

## 2. `/spec-status`

**Status.** Done in framework 1.1.0: `.specs/scripts/status.mjs` and the `spec-status` skill. The parsing moved
to `.specs/scripts/lib/spec.mjs`, which `check-spec`, `status`, `preflight` and the test scripts share. The
board reads each spec from its branch, since a spec under execution isn't on the default branch.

**Why.** With more than one spec in flight, nothing shows the whole picture: which specs are where, what is
blocked, which reviews have open findings.

**What.** A read-only board of the specs, as a skill (`/spec-status`) backed by a script.

**Design sketch.**

- `.specs/scripts/status.mjs`. Move the spec parsing out of `check-spec.mjs` into a shared module
  (`.specs/scripts/lib/spec.mjs`) that both scripts import, so the two never disagree.
- For each spec in `changes/`: id, title, status, branch (exists locally? remotely? ahead or behind?), tasks
  done/blocked/pending, open findings of the latest review round, the date of the last commit on its branch.
- Flags: `in-progress` with no commit for N days; `accepted` but not finished; branches `spec/*` with no
  spec; `depends_on` pointing to unfinished specs.
- Footer: the next spec id, and the count of finished specs.
- The skill only formats the script's output and suggests the next command for each spec.

**Done when.** One command answers "what is going on with the specs?" without opening any of them.

## 3. Revising and abandoning a spec

**Status.** Done in framework 1.2.0: `spec-plan --amend` and `--abandon`, `.specs/scripts/abandon-spec.mjs`,
the `abandoned` status and the rules in `spec-lifecycle.md` → Changing a spec. An abandoned spec under
execution is brought to the default branch (the spec folder only) and archived there, so its record survives
the branch.

**Why.** `spec-plan` only creates specs. When requirements change before or during execution, the only
options today are editing the spec by hand or logging Amendments during execution. And there is no way to
stop a spec that is no longer wanted.

**What.** An amend mode for `spec-plan`, and an `abandoned` status.

**Design sketch.**

- `/spec-plan --amend NNN`: allowed while the status is `planned`, `in-progress` or `changes-requested`. It
  runs a short interview about what changes, then edits the spec, keeping ids stable: new Expected Results
  and tasks get new ids, removed ones are struck through and marked `(removed: <reason>)` instead of
  deleted, and every change is logged under `## Amendments`. `check-spec.mjs` learns to accept the struck
  items.
- Status `abandoned`, set by `/spec-plan --abandon NNN` with a reason: the folder moves to
  `.specs/finished/<timestamp>-NNN-slug/` like a finished spec, memory and source documents are not touched,
  and the reason is recorded under a new `## Outcome` section. The branch is kept unless the user deletes it.
- Lifecycle: `planned | in-progress | changes-requested → abandoned`; ids are never reused.

**Done when.** A spec can be changed through the workflow instead of by hand, and an abandoned spec is
archived with its reason and leaves memory untouched.

## 4. A lightweight path for trivial changes

**Status.** Done in framework 1.3.0: `spec-lifecycle.md` → When a spec is needed (the "No spec needed" list and
the quick spec's limits), `spec-plan --quick`, `templates/quick-spec-model.md` (`template: quick`, checked by
`check-spec.mjs`: at most 3 Expected Results) and the self-review in `spec-review`.

**Why.** A typo or a dependency bump doesn't deserve an interview, Expected Results, a review session and a
pull request with memory updates. Without a lighter path, small changes skip the workflow entirely — and the
ones that do change behavior slip past the memory.

**What.** An explicit rule for what needs no spec, plus a quick spec for small changes that still deserve a
record.

**Design sketch.**

- In `.specs/shared/spec-lifecycle.md`, a "No spec needed" list: typos and copy-only fixes, formatting,
  dependency bumps without behavior changes, CI and tooling tweaks, docs. Anything that changes behavior, data
  or a contract needs a spec.
- `/spec-plan --quick`: no interview rounds when the request is already unambiguous; a short template (Goal,
  1–3 Expected Results, tasks, Verification Plan); the same branch, commits, related tests and coverage gate.
  The review can run in the same session, marked as a self-review in its round.
- `check-spec.mjs` accepts the short template (`template: quick` in the front matter).

**Done when.** Trivial changes have a documented path that keeps memory honest, and a quick spec takes
minutes, not an afternoon.

## 5. Real end-to-end suites

**Status.** Workflow side done in framework 1.6.0. The suites are declared in a fenced `e2e` block in
`technical-context.md` → Automated validation. `.specs/scripts/run-e2e.mjs` runs the suites of the workspaces a
spec changed and of those that depend on them. `spec-plan`, `spec-execute` and `spec-review` use it, and the CI
check has an `e2e` job with a disposable Postgres. Still to do, as this item says: plan and build the suites
themselves (Playwright for `apps/web`, Maestro or Detox for `apps/mobile`, the backend's `test:e2e`) as a spec
with `/spec-plan`, once `/spec-init` has written the memory. Then declare them in the `e2e` block.

**Why.** Today the reviewer verifies user-facing behavior by driving the app with whatever tools the session
has, or by asking the user. That is slow, hard to repeat, and impossible in CI.

**What.** Automated e2e suites for the apps — planned and built as a spec with `/spec-plan`, not as a change
to the workflow.

**Design sketch.**

- Web: Playwright for `apps/web`, starting with the two public pages (privacy policy, account deletion) in
  the three languages.
- Mobile: Maestro (simple YAML flows, works with Expo) or Detox for `apps/mobile`, starting with sign-in and
  the pending-approval screen.
- Backend: the existing Vitest e2e setup (`test:e2e`) against a disposable Postgres.
- Record the commands in `technical-context.md` → Automated validation, so `spec-plan` puts them in every
  Verification Plan and `spec-review` runs them instead of driving the app.
- Add the e2e job to the CI check (item 1).

**Done when.** Each app has an e2e command that runs headless, and Expected Results about user-facing behavior
can point to an e2e test instead of a manual journey.

## 6. Link checking in the spec validator

**Status.** Done in framework 1.4.0: `checkLinks` in `.specs/scripts/lib/spec.mjs` (GitHub slugs, numbered
duplicates, `<a id>` anchors), used by `check-spec.mjs` (errors on the Requirements line, which must also link
a section rather than a whole document; warnings elsewhere) and `preflight.mjs` (missing source documents fail
it; broken links in memory are warnings).

**Why.** Specs link source-document sections by anchor (`requirements.md#waiting-list`). Rename a heading and
the link silently points nowhere: the executor and the reviewer lose the detail they were meant to read.

**What.** `check-spec.mjs` verifies every relative link in a spec.

**Design sketch.**

- For each Markdown link with a relative path: the file exists.
- For each anchor: the target file has a heading whose slug matches, using GitHub's rules (lowercase, spaces
  to `-`, punctuation dropped, `-1`, `-2` for duplicate headings).
- Broken links in Context → Requirements are errors; elsewhere, warnings.
- The same check in `preflight.mjs` for the memory files and the Source documents list in `product.md`.

**Done when.** A spec with a broken requirement link fails `check-spec.mjs`, naming the link and the heading it
expected.

## 7. Evals and description tuning for the skills

**Why.** The skills were written and tested piece by piece, never measured as a whole. Without evals, an edit
to a skill can quietly change what it produces or when it triggers.

**What.** Trigger evals and output evals for the five skills, and tuned descriptions.

**Design sketch.**

- Trigger evals: for each skill, about 20 realistic requests — half that should trigger it, half near-misses
  that belong to another skill (e.g. "fix the review findings" → `spec-execute`, not `spec-review`). Optimize
  each description with the skill-creator's description loop.
- Output evals, in `.claude/skills/<skill>/evals/`, on a small fixture repository:
  - `spec-plan`: from a detailed request and fixture memory, the spec passes `check-spec.mjs`, every Expected
    Result is covered, and the Requirements line links real sections.
  - `spec-execute`: on a three-task spec, one commit per task, evidence for each, related tests and coverage
    green.
  - `spec-review`: on an implementation with a planted bug and an untested branch, it finds both.
  - `spec-finish`: memory files created from the templates, source-document sections marked, the archive
    named correctly.
- Run them after every change to a skill or to the framework files.

**Done when.** Each skill has an eval set that runs in one command, and the descriptions trigger on the right
requests and not on the near-misses.
