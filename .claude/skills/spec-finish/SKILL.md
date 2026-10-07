---
name: spec-finish
description: Close an accepted spec — update the project memory in .specs/memory (product, technical context, structure.md, modules.md and one file per module in modules/) and the linked sections of the source documents so they describe what the spec actually built, move the spec folder from .specs/changes/ to .specs/finished/ with a timestamp prefix, commit that on the spec's branch (spec/NNN-slug), push it, and open a pull request whose title names the spec and what was done and whose description lists every file the spec touched. Refuses when the code changed after the review. Use whenever the user runs /spec-finish, or asks to finish, close, archive or wrap up a spec ("finish 001-start-monorepo", "archive spec 003", "003 was accepted, close it") — even if they don't say "finish". Not for reviewing (spec-review) or executing (spec-execute) a spec.
argument-hint: "<spec id, slug or path>"
---

# spec-finish

A finished spec becomes history, and what it changed must become memory. Every future spec is planned
against `.specs/memory/` and the product's source documents, so the real job of this skill is to make them
describe what was actually built, precisely, without losing what was already there. Moving the folder and
opening the pull request are the easy part.

The flow is: **find and gate → gather what changed → update the memory → update the source documents →
archive → validate → commit, push and open the pull request → report.** The work itself is already committed,
one commit per task, on `spec/NNN-slug`; this skill adds the last commit and is the only one that pushes.

## 1. Find the spec and gate

```bash
node .specs/scripts/check-spec.mjs <argument>
```

The spec lives on its branch, `spec/NNN-slug`: if the check can't find it, `node .specs/scripts/status.mjs`
shows where it is — switch to its branch and rerun the check.

- `accepted` → finish it.
- `finished` → already archived. If the branch wasn't pushed or the pull request wasn't opened (an
  interrupted run), continue at step 7.
- `abandoned` → nothing to finish: it was archived by `spec-plan --abandon`, and memory stays as it is.
- `in-review` → point to `/spec-review` and stop; `planned`, `in-progress` or `changes-requested` → point to
  `/spec-execute` and stop.

Then:

- `check-spec.mjs` prints `CHECK OK` and `node .specs/scripts/preflight.mjs` prints `PREFLIGHT OK`.
- You are on `spec/NNN-slug` (`git switch` to it) and `git status` is clean.
- The code is exactly what the review accepted:

  ```bash
  node .claude/skills/spec-finish/scripts/finish-spec.mjs --check <spec id>
  ```

  It refuses when anything outside `.specs/` and the source documents changed since the front matter's
  `reviewed_commit`, listing the files: stop and point to `/spec-review` — shipping code nobody reviewed is
  exactly what the review exists to prevent. The CI check applies the same rule to the pull request.

## 2. Gather what changed

- **The spec**: Goal, Context (its Requirements line), Scope, Decisions, Expected Results, `## Memory Impact`,
  `## Amendments`, and the notes in the last Review round — the reviewer flags gaps in Memory Impact there.
  Expected Results and decisions struck through as `(removed: …)` were not built: they don't go into memory.
- **The change set**: `git log --oneline <base_commit>..HEAD` and `git diff --stat <base_commit>..HEAD`, then
  read what matters: workspaces, modules, aggregates, routes and top-level folders created, moved or removed;
  new dependencies, integrations, environment variable names, conventions.
- **The memory and its templates**: everything in `.specs/memory/`, and `product-model.md`,
  `technical-context-model.md`, `structure-model.md`, `modules-model.md` and `module-model.md` in
  `.specs/templates/`.

Memory Impact is the planner's forecast; the code is what happened. When they disagree, describe the code,
and say so in the report.

## 3. Update the memory

Change only what the spec changed and keep everything else as it is — the user may have edited memory by
hand. Write in English, in the present tense: memory describes what is built now. Plans belong in specs, and
history in the finished specs (plus each module's Spec history).

| File | Update it when | What changes |
| --- | --- | --- |
| `product.md` | always | `Current state`: this spec's delivered scope and the active specs. New or changed domain concepts and product decisions. `Out of scope`: remove what was delivered, add the product features this spec consciously postponed. Never technical. |
| `technical-context.md` | the spec changed the stack or a convention | Stack items with major versions, conventions with their reason, integrations, environment variable names, test runners, coverage notes and exclusions the spec decided, e2e suites. |
| `structure.md` | the spec created, moved or removed a workspace, module, aggregate, route or top-level folder | Representative paths and the role of each place, from `structure-model.md`. |
| `modules.md` | the spec created a module or moved a responsibility between modules | One short, non-technical block per module, from `modules-model.md`. |
| `modules/<module-id>.md` | the spec created or changed a module | Purpose, concepts, rules, who can do what, boundaries — from `module-model.md` — and a new line in its Spec history. |

- **Which modules**: the business modules as the technical context's Architecture defines them (e.g. the
  workspaces in `modules/`). A spec changed a module when its change set touches the module's code, or when it
  altered the module's concepts, rules or boundaries.
- **Files that don't exist yet** (`structure.md`, `modules.md`, a module's file): create them from their
  template describing the **current state of the whole repository** — read the code to do it, not only this
  spec's diff. That is how memory catches up with code written before the spec workflow existed.
- **One vocabulary**: the same concept names and ids in `product.md`, `modules.md` and `modules/*.md`. Every
  module in `modules.md` links to its file in `modules/`, and every file there is linked from `modules.md`.
- Remove every template instruction and placeholder from the files you create.

## 4. Update the source documents

The documents listed in `product.md` → Source documents are living: a section a spec implemented must not go
on describing behavior the product doesn't have. For every section linked in the spec's Context →
Requirements:

- if a Decision or an Amendment changed what the section requires, rewrite the affected sentences to match
  what was built — keep the section's structure, and change nothing the spec didn't touch;
- add one line under the section's heading: `_Implemented in spec NNN-slug._` (once per spec);
- keep the heading as it is: specs link sections by their anchor, so renaming a heading breaks every spec that
  links it. When a heading truly must change, update the links (`grep -rn '<old-anchor>' .specs`) and say so
  in the report.

Only Markdown documents are edited; for others (designs, exports), say in the report what no longer matches.

## 5. Archive

```bash
node .claude/skills/spec-finish/scripts/finish-spec.mjs <spec id>
```

It checks the reviewed commit again, sets `status: finished` and `finished: <today>` in the front matter and
moves the folder to `.specs/finished/<YYYYMMDDHHMMSS>-<NNN-slug>/` — the moment it runs, e.g.
`20261006153000-001-start-monorepo` — with `git mv`. It lists the links elsewhere in `.specs/` that still
point to the old location: update them.

## 6. Validate

- `check-spec.mjs <spec id>` prints `CHECK OK`, with status `finished` — including its links, which still
  resolve from `finished/` (same depth as `changes/`).
- `preflight.mjs` prints `PREFLIGHT OK`. Besides the required memory, it checks `structure.md`, `modules.md`
  and `modules/*.md` for template leftovers and that the module index and the module files link to each
  other.

Fix what fails and rerun.

## 7. Commit, push and open the pull request

1. **Commit** what this skill changed — the memory, the source documents and the archived spec — in one
   commit: `docs(spec-NNN): finish <slug>`, with the memory files and source-document sections it updated in
   the body. Then `git status` is clean.
2. **Push** — `git push -u origin spec/NNN-slug`. Never force-push, and never push to the default branch. If
   the push is rejected or there is no remote, stop and report: the commits are safe locally.
3. **Open the pull request** against the default branch
   (`gh repo view --json defaultBranchRef -q .defaultBranchRef.name`):
   `gh pr create --base <default> --head spec/NNN-slug --title "<title>" --body-file <file>`.
   - **Title** — names the spec and says clearly what was done:
     `[spec 003] Owners can cancel a booked walk up to 2h before it starts`.
   - **Body** — the template below. Its Files section lists every file the spec touched, commit by commit —
     one commit per task — from:

     ```bash
     git log --reverse --name-status --format='%n%s' <base_commit>..HEAD
     ```

     with a few words added where a file's role isn't obvious.

   If `gh` is missing or not authenticated, give the user the title and the body to paste, and the compare
   URL. Opening the pull request doesn't merge it: merging is the user's call.
4. **The CI check** — when the repository has `.github/workflows/spec-check.yml`, it runs on the pull request.
   You can run the same gate locally first: `node .specs/scripts/check-pr.mjs spec/NNN-slug` (after the commit;
   it needs a clean tree). Don't wait for CI in this skill; mention in the report that it will run.

```md
Implements spec **003 — Owners cancel a booked walk** ([spec.md](<link to the archived spec on the branch>)),
accepted in review round 2.

## What was done

2–5 sentences in plain words: what changes for users, then what changed in the system.

## Expected Results

- ✅ ER-01 — Owner cancels a booking more than 2h ahead
- ✅ ER-02 — Cancellation is refused inside the 2h window

## Files

- **feat(spec-003): add the cancelled state to Booking (T-01)**
  - `modules/booking/src/booking/model/booking.entity.ts` — modified
  - `modules/booking/test/booking/model/booking.entity.test.ts` — added
- **docs(spec-003): finish booking-cancellation**
  - `.specs/memory/product.md` — modified

## Verification

From the accepted review round: the related tests, the coverage of the changed lines, lint, type check and
build, e2e.

## Memory and documents

- `.specs/memory/product.md` — the Booking lifecycle gains `cancelled`
- `.docs/requirements.md` → Cancelling a booking — marked as implemented
```

The link to the spec points to the file on the branch:
`<repository URL>/blob/spec/NNN-slug/.specs/finished/<folder>/spec.md` (`gh repo view --json url -q .url`).

## 8. Report

Keep it short:

- where the spec was archived;
- each memory file and source-document section created or updated, with one line on what changed;
- any difference between Memory Impact and what was actually built;
- the branch, the push result and the pull request's URL — or its title and body, if it couldn't be opened;
- the next step: reviewing and merging the pull request, which is the user's call.
