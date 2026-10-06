---
name: spec-finish
description: Close an accepted spec — update the project memory in .specs/memory (product, technical context, structure.md, modules.md and one file per module in modules/) so it describes what the spec actually built, move the spec folder from .specs/changes/ to .specs/finished/ with a timestamp prefix, then commit the work in small commits (one per task, then the spec and memory) on a spec/NNN-slug branch, push it, and open a pull request whose title names the spec and what was done and whose description lists every file the spec touched. Refuses when the code changed after the review. Use whenever the user runs /spec-finish, or asks to finish, close, archive or wrap up a spec ("finish 001-start-monorepo", "archive spec 003", "003 was accepted, close it") — even if they don't say "finish". Not for reviewing (spec-review) or executing (spec-execute) a spec.
argument-hint: "<spec id, slug or path>"
---

# spec-finish

A finished spec becomes history, and what it changed must become memory. Every future spec is planned
against `.specs/memory/` — the product, the technical context, the structure and the modules — so the real
job of this skill is to make memory describe what was actually built, precisely, without losing what was
already there. Moving the folder is the easy part.

The flow is: **find and gate → gather what changed → update the memory → archive → validate → commit, push
and open the pull request → report.** This is the only skill in the workflow that commits and pushes: until
now, the spec's work has been sitting uncommitted in the working tree.

## 1. Find the spec and gate

```bash
node .claude/skills/spec-plan/scripts/check-spec.mjs <argument>
```

- `accepted` → finish it.
- `finished` → already archived. If it was never committed or pushed (an interrupted run), verify the
  fingerprint below and continue at step 6.
- `in-review` → point to `/spec-review` and stop; `planned`, `in-progress` or `changes-requested` → point to
  `/spec-execute` and stop.

Then:

- `check-spec.mjs` prints `CHECK OK` and `node .claude/skills/spec-plan/scripts/preflight.mjs` prints
  `PREFLIGHT OK`.
- The code is exactly what the review accepted:

  ```bash
  node .claude/skills/spec-plan/scripts/fingerprint.mjs <spec id> --verify
  ```

  `FINGERPRINT CHANGED` lists the files that changed since the review: stop and point to `/spec-review` —
  shipping code nobody reviewed is exactly what the review exists to prevent.
- `git status` shows the spec's work, uncommitted. If something unrelated is mixed in, ask now whether it
  belongs to this spec — otherwise it would end up in its commits.

## 2. Gather what changed

- **The spec**: Goal, Scope, Decisions, Expected Results, `## Memory Impact`, `## Amendments`, and the notes
  in the last Review round — the reviewer flags gaps in Memory Impact there.
- **The change set**: `git diff --stat <base_commit>` plus the untracked files in `git status --porcelain` —
  the work is still uncommitted — then read what matters: workspaces, modules,
  aggregates, routes and top-level folders created, moved or removed; new dependencies, integrations,
  environment variable names, conventions.
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
| `technical-context.md` | the spec changed the stack or a convention | Stack items with major versions, conventions with their reason, integrations, environment variable names, test, coverage and e2e commands, coverage exclusions the spec decided. |
| `structure.md` | the spec created, moved or removed a workspace, module, aggregate, route or top-level folder — and always for its `.specs/` section | Representative paths and the role of each place, from `structure-model.md`. |
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

## 4. Archive

```bash
node .claude/skills/spec-finish/scripts/finish-spec.mjs <spec id>
```

It sets `status: finished` and `finished: <today>` in the front matter and moves the folder to
`.specs/finished/<YYYYMMDDHHMMSS>-<NNN-slug>/` — the moment it runs, e.g.
`20261006153000-001-start-monorepo` — with `git mv` when the folder is tracked. It lists the links elsewhere
in `.specs/` that still point to the old location: update them.

## 5. Validate

- `check-spec.mjs <spec id>` prints `CHECK OK`, with status `finished`.
- `preflight.mjs` prints `PREFLIGHT OK`. Besides the required memory, it checks `structure.md`, `modules.md`
  and `modules/*.md` for template leftovers and that the module index and the module files link to each
  other.
- `fingerprint.mjs <spec id> --verify` still prints `FINGERPRINT OK`: updating the memory and archiving touch
  only `.specs/`, never the code.

Fix what fails and rerun.

## 6. Commit, push and open the pull request

Small commits, each grouping files that belong together, keep the history readable and let the pull request
be reviewed commit by commit. The spec's tasks already are those groups — one coherent change in one front,
with its tests — so the commits follow the tasks.

1. **Branch** — `spec/<NNN-slug>`, e.g. `spec/001-start-monorepo`, so the name says which spec it carries.
   Create it from the current state with `git switch -c spec/<NNN-slug>`: the uncommitted work comes along.
   If you're already on it, stay; if it exists elsewhere, switch to it, and if that would lose or conflict
   with work, stop and ask. If commits for this spec were made on another branch after `base_commit`
   (`spec-execute` commits only when the user asks), tell the user: that branch keeps them too.
2. **Plan the commits**:

   ```bash
   node .claude/skills/spec-finish/scripts/commit-plan.mjs <spec id>
   ```

   It groups the uncommitted files by task, in task order — from the files each task's evidence names, then
   its description — and puts the archived spec and the memory in a last group. Review it before committing:
   put each *unassigned* file with the task it belongs to, or in its own commit when it is a separate concern
   (a dependency bump, say); a file *shared* by several tasks goes with the first one; never commit what it
   lists under *do not commit*.
3. **Commit each group**, in order — `git add -A -- <its files>`, then `git commit`:
   - subject: `<type>(spec-NNN): <what this commit does>`, imperative, at most 72 characters, with the type
     the repo's convention uses (`feat`, `fix`, `refactor`, `test`, `chore`, `docs`…), e.g.
     `feat(spec-003): add the cancelled state to Booking`;
   - body: the task and the Expected Results it covers (`T-01 · ER-01, ER-02`), and, for a shared file, the
     other tasks that changed it;
   - the last commit carries the spec and the memory: `docs(spec-003): archive the spec and update the
     memory`, listing the memory files in the body.

   Then `git status`: nothing of the spec is left uncommitted.
4. **Push** — `git push -u origin spec/<NNN-slug>`. Never force-push, and never push to the default branch.
   If the push is rejected or there is no remote, stop and report: the commits are safe locally.
5. **Open the pull request** against the default branch
   (`gh repo view --json defaultBranchRef -q .defaultBranchRef.name`):
   `gh pr create --base <default> --head spec/<NNN-slug> --title "<title>" --body-file <file>`.
   - **Title** — names the spec and says clearly what was done:
     `[spec 003] Owners can cancel a booked walk up to 2h before it starts`.
   - **Body** — the template below. Its Files section comes from
     `node .claude/skills/spec-finish/scripts/commit-plan.mjs <spec id> --markdown` — every file the spec
     touched since `base_commit`, grouped by task — with a few words added where a file's role isn't obvious.

   If `gh` is missing or not authenticated, give the user the title and the body to paste, and the compare
   URL. Opening the pull request doesn't merge it: merging is the user's call.

```md
Implements spec **003 — Owners cancel a booked walk** ([spec.md](<link to the archived spec on the branch>)),
accepted in review round 2.

## What was done

2–5 sentences in plain words: what changes for users, then what changed in the system.

## Expected Results

- ✅ ER-01 — Owner cancels a booking more than 2h ahead
- ✅ ER-02 — Cancellation is refused inside the 2h window

## Files

(the `commit-plan.mjs --markdown` output)

## Commits

- `feat(spec-003): add the cancelled state to Booking` — T-01
- `docs(spec-003): archive the spec and update the memory`

## Verification

From the accepted review round: lint, type check and build; the test suites; coverage (100% on the files the
spec changed); e2e.

## Memory

- `.specs/memory/product.md` — the Booking lifecycle gains `cancelled`
```

The link to the spec points to the file on the branch:
`<repository URL>/blob/spec/<NNN-slug>/.specs/finished/<folder>/spec.md` (`gh repo view --json url -q .url`).

## 7. Report

Keep it short:

- where the spec was archived;
- each memory file created or updated, with one line on what changed;
- any difference between Memory Impact and what was actually built;
- the branch, the commits (subjects) and the push result;
- the pull request's URL — or its title and body, if it couldn't be opened — and the next step: reviewing and
  merging it, which is the user's call.
