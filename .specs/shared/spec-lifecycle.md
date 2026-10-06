# Spec Lifecycle

Shared rules for the spec skills: `spec-init` (installs `.specs/` and writes the project memory), then, for
each change, `spec-plan`, `spec-execute`, `spec-review` and `spec-finish`. Every skill reads this file before
it touches a spec.

## Folders

```
.specs/
  memory/      # living memory of the project: product, technical context, structure, modules
  shared/      # rules every spec skill follows (this file, interviewing, acceptance-criteria, task-breakdown,
               # how-to-execute, naming)
  templates/   # models used to create specs and memory files
  changes/     # active specs: one folder per spec, NNN-slug/spec.md (+ supporting files)
  finished/    # accepted specs, moved here by spec-finish: YYYYMMDDHHMMSS-NNN-slug/
```

`shared/` and `templates/` are **framework files**: `spec-init` installs them from the copy bundled with the
skill, and never overwrites them afterwards, so a project can adapt them. Facts about the project — its
domain, stack, conventions, file suffixes — belong in `memory/`, never in `shared/` or `templates/`; that is
what keeps the framework files valid in any repository.

## Identity

- A spec lives in `changes/NNN-slug/spec.md`. `NNN` is a zero-padded, sequential number that is never
  reused: the next id is the highest `NNN` found in `changes/` **and** `finished/`, plus one.
- `slug` is short kebab-case English describing the change (`booking-cancellation`, not `feature-2`).
- Supporting files (fixtures, constants, diagrams) live in the same folder and are linked from the spec.
- When `spec-finish` moves a spec, it keeps the id in the folder name so links and history stay traceable.

## Front matter

`id`, `slug`, `title`, `status`, `created`, `fronts` and `depends_on` are written by `spec-plan`. On its first
run, `spec-execute` adds `started` (date) and `base_commit` (the short sha of `HEAD` when execution started),
so the reviewer can diff exactly what the spec changed. On acceptance, `spec-review` adds `reviewed_tree`: a
fingerprint of the reviewed code that `spec-finish` checks before shipping. `spec-finish` adds `finished`
(date). `check-spec.mjs` (in the `spec-plan` skill)
validates the whole structure; every spec skill runs it before working on a spec.

## Status

The `status` field in the spec front matter is the single source of truth for where a spec is.

| Status              | Set by         | Meaning                                                                   |
| ------------------- | -------------- | ------------------------------------------------------------------------- |
| `planned`           | `spec-plan`    | Interview done, user confirmed the summary, spec written. Ready to build. |
| `in-progress`       | `spec-execute` | Execution started, or resumed to fix review findings.                     |
| `in-review`         | `spec-execute` | All tasks checked with evidence. Waiting for an independent review.       |
| `changes-requested` | `spec-review`  | At least one Expected Result failed. Findings recorded in `## Review`.    |
| `accepted`          | `spec-review`  | Every Expected Result verified, all suites green, 100% coverage on the    |
|                     |                | change; the reviewed code's fingerprint recorded (`reviewed_tree`).       |
| `finished`          | `spec-finish`  | Memory updated, folder moved to `finished/`, work committed in small      |
|                     |                | commits on `spec/NNN-slug`, pushed, pull request opened.                  |

Allowed transitions: `planned → in-progress → in-review → (accepted | changes-requested)`,
`changes-requested → in-progress`, `accepted → finished`. A skill that finds a spec in an unexpected status
stops and says so instead of forcing it.

## Ownership of sections

- `spec-plan` writes everything except `## Amendments`, `## Review`, task checkboxes and evidence.
- `spec-execute` checks tasks and adds evidence, appends tasks marked `(added during execution)`, adds
  `started` and `base_commit`, and closes review findings with evidence
  ([How to execute](how-to-execute.md)). It changes Scope, Decisions or Expected Results only with the user's
  explicit approval, logged in `## Amendments`; it never removes, reorders or rewords a task.
- `spec-review` writes only `## Review` — one `### Round N — date — verdict` per review, with findings as
  `- [ ] **F-NN** (ER-xx) — …` — the status and, on acceptance, `reviewed_tree`. It makes no commits.
- `spec-finish` refuses to run if the code changed since the review, updates `.specs/memory/` from
  `## Memory Impact` and the actual change set, sets the status, moves the folder to
  `finished/<YYYYMMDDHHMMSS>-<NNN-slug>/`, then commits the work in small commits — one per task, built from
  the files its evidence names, then one for the spec and the memory — on the branch `spec/NNN-slug`, pushes
  it and opens a pull request whose title names the spec. It is the only skill that commits by default;
  `spec-execute` commits only when the user asks.

## Memory

| File | Created by | Updated by |
| --- | --- | --- |
| `product.md` | `spec-init` (interview) | `spec-finish` (every spec: Current state; concepts and decisions when they change) |
| `technical-context.md` | `spec-init` (interview) | `spec-finish` (when a spec changes the stack or a convention) |
| `structure.md` | `spec-finish`, at the first finished spec | `spec-finish` (every spec: the `.specs/` section; folders when they change) |
| `modules.md` | `spec-finish`, at the first finished spec | `spec-finish` (a module is created, or a responsibility moves) |
| `modules/<module-id>.md` | `spec-finish`, when a module is first described | `spec-finish` (whenever a spec changes the module) |

`product.md` and `technical-context.md` are prerequisites for every spec skill; the other files are read when
present. Besides `spec-init` and `spec-finish`, only the user changes memory — so it always describes what is
actually built, not what is planned. Every module listed in `modules.md` has its file in `modules/`, and every
file in `modules/` is listed there; the preflight checks it.
