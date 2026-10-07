# Spec Lifecycle

Shared rules for the spec skills: `spec-init` (installs `.specs/` and writes the project memory), then, for
each change, `spec-plan`, `spec-execute`, `spec-review` and `spec-finish`; `spec-status` shows the board of all
the specs at any time, read-only. Every skill reads this file before it touches a spec.

## Folders

```
.specs/
  memory/              # living memory of the project: product, technical context, structure, modules
  scripts/             # the workflow's checks: preflight, check-spec, status, run-related-tests,
                       # check-coverage; lib/ holds the spec parsing they share
  shared/              # rules every spec skill follows (this file, interviewing, acceptance-criteria,
                       # task-breakdown, how-to-execute, naming)
  templates/           # models used to create specs and memory files
  changes/             # active specs: one folder per spec, NNN-slug/spec.md (+ supporting files)
  finished/            # archived specs — finished by spec-finish, or abandoned by spec-plan --abandon:
                       # YYYYMMDDHHMMSS-NNN-slug/
  .framework.json      # installed framework version and the hash of each framework file
```

`scripts/`, `shared/` and `templates/` are **framework files**: `spec-init` installs them from the copy bundled
with the skill. A project may adapt them; `.framework.json` is how an upgrade tells a file the project
customized (left alone) from one that is just out of date (replaced). Facts about the project — its domain,
stack, conventions, file suffixes — belong in `memory/`, never in the framework files; that is what keeps
them valid in any repository.

## Identity

- A spec lives in `changes/NNN-slug/spec.md`. `NNN` is a zero-padded, sequential number that is never
  reused — not even an abandoned spec's: the next id is one more than the highest `NNN` found in `changes/`,
  `finished/` and the spec branches.
- `slug` is short kebab-case English describing the change (`booking-cancellation`, not `feature-2`).
- Its branch is `spec/NNN-slug`.
- Supporting files (fixtures, constants, diagrams) live in the same folder and are linked from the spec.
- When `spec-finish` moves a spec, it keeps the id in the folder name so links and history stay traceable.

## Front matter

`id`, `slug`, `title`, `status`, `created`, `fronts` and `depends_on` are written by `spec-plan`. On its first
run, `spec-execute` adds `started` (date) and `base_commit` (the commit the spec branch starts from), so
everyone can see exactly what the spec changed. On acceptance, `spec-review` adds `reviewed_commit`: the commit
it accepted, which `spec-finish` checks before shipping. `spec-finish` adds `finished` (date);
`spec-plan --abandon` adds `abandoned` (date).
`.specs/scripts/check-spec.mjs` validates the whole structure; every spec skill runs it before working on a
spec. `.specs/scripts/status.mjs` reads every spec — from its branch when it is under execution, since the
default branch doesn't have it then — and prints the board `spec-status` shows.

## Status

The `status` field in the spec front matter is the single source of truth for where a spec is.

| Status              | Set by         | Meaning                                                                   |
| ------------------- | -------------- | ------------------------------------------------------------------------- |
| `planned`           | `spec-plan`    | Interview done, user confirmed the summary, spec written. Ready to build. |
| `in-progress`       | `spec-execute` | Execution started on `spec/NNN-slug`, or resumed to fix review findings.  |
| `in-review`         | `spec-execute` | All tasks committed with evidence. Waiting for an independent review.     |
| `changes-requested` | `spec-review`  | At least one Expected Result failed. Findings recorded in `## Review`.    |
| `accepted`          | `spec-review`  | Every Expected Result verified, related tests green, every changed line   |
|                     |                | covered; the accepted commit recorded (`reviewed_commit`).                |
| `finished`          | `spec-finish`  | Memory and source documents updated, folder moved to `finished/`, branch  |
|                     |                | pushed, pull request opened.                                              |
| `abandoned`         | `spec-plan`    | No longer wanted (`--abandon`): the reason is under `## Outcome`, the     |
|                     |                | folder moved to `finished/`; memory and source documents untouched.       |

Allowed transitions: `planned → in-progress → in-review → (accepted | changes-requested)`,
`changes-requested → in-progress`, `accepted → finished`, and `planned | in-progress | changes-requested →
abandoned`. `finished` and `abandoned` are final. A skill that finds a spec in an unexpected status stops and
says so instead of forcing it.

## Changing a spec

Requirements change. While a spec is `planned`, `in-progress` or `changes-requested`, `spec-plan --amend NNN`
revises it with the user; `spec-execute` may also apply a small change the user approves mid-execution. Either
way the same rules hold, so that the executor and the reviewer can keep trusting the spec:

- **Ids are stable.** New Expected Results, decisions and tasks get the next free id; an id is never reused.
- **Nothing is deleted.** A removed item stays, struck through and marked with its reason:
  `### ~~ER-03 — Title~~ (removed: <reason>)`, `- [ ] ~~**T-04** — …~~ (removed: <reason>)`,
  `| D-02 | ~~…~~ (removed: <reason>) | … |`. `check-spec.mjs` accepts them: a removed Expected Result needs no
  task, and a removed task isn't pending.
- **Done work isn't rewritten.** A task already committed is never reworded or unchecked; a new task changes or
  undoes its work.
- **Every change is logged** under `## Amendments`: date, what changed (before → after), the reason, and that
  the user approved it.

A spec that is no longer wanted is abandoned with `spec-plan --abandon NNN`, never deleted: the record and its
reason stay in `finished/`, and its branch is kept until the user deletes it.

## Branch and commits

- `spec-execute` creates `spec/NNN-slug` when execution starts and works there. It commits the spec as it
  starts, then every task — the task's files and its evidence — as soon as the task is verified, and every
  review finding it fixes. One task, one commit: small, exact, and in the order the work happened.
- `spec-review` commits each review round (the spec only).
- `spec-finish` commits the memory, the source-document updates and the archived spec, then pushes the branch
  and opens the pull request. Nothing is pushed before that.
- The default branch never receives unfinished work; merging the pull request is the user's call. Specs can
  run in parallel, each on its own branch in its own git worktree.

## Ownership of sections

- `spec-plan` writes everything except `## Review`, task checkboxes and evidence. Once the spec is written, it
  changes it only through `--amend` (logged in `## Amendments`) and `--abandon` (status, `abandoned` and
  `## Outcome`).
- `spec-execute` checks tasks and adds evidence, appends tasks marked `(added during execution)`, adds
  `started` and `base_commit`, and closes review findings with evidence
  ([How to execute](how-to-execute.md)). It changes Scope, Decisions or Expected Results only with the user's
  explicit approval, logged in `## Amendments`; it never removes, reorders or rewords a task — that takes
  `spec-plan --amend`.
- `spec-review` writes only `## Review` — one `### Round N — date — verdict` per review, with findings as
  `- [ ] **F-NN** (ER-xx) — …` — the status and, on acceptance, `reviewed_commit`.
- `spec-finish` refuses to run if anything outside `.specs/` changed since `reviewed_commit`; updates
  `.specs/memory/` from `## Memory Impact` and the actual change set; updates the linked sections of the source
  documents; sets the status; and moves the folder to `finished/<YYYYMMDDHHMMSS>-<NNN-slug>/`.

## Memory

| File | Created by | Updated by |
| --- | --- | --- |
| `product.md` | `spec-init` (interview) | `spec-finish` (every spec: Current state; concepts and decisions when they change) |
| `technical-context.md` | `spec-init` (interview) | `spec-finish` (when a spec changes the stack or a convention) |
| `structure.md` | `spec-finish`, at the first finished spec | `spec-finish` (when a spec creates, moves or removes a workspace, module, aggregate, route or top-level folder) |
| `modules.md` | `spec-finish`, at the first finished spec | `spec-finish` (a module is created, or a responsibility moves) |
| `modules/<module-id>.md` | `spec-finish`, when a module is first described | `spec-finish` (whenever a spec changes the module) |

`product.md` and `technical-context.md` are prerequisites for every spec skill; the other files are read when
present. Besides `spec-init` and `spec-finish`, only the user changes memory — so it always describes what is
actually built, not what is planned. Every module listed in `modules.md` has its file in `modules/`, and every
file in `modules/` is listed there; the preflight checks it.

## Source documents

The product documents listed in `product.md` → Source documents (a brief, detailed requirements) are where
specs come from: each spec links the sections it implements. They are living documents: when a spec is
finished, `spec-finish` brings every section it linked in line with what was built — updating the text a
Decision or an Amendment changed — and notes the spec under the section. So they never describe behavior the
product no longer has.
