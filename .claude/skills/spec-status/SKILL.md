---
name: spec-status
description: Show the board of the repo's specs (spec-driven workflow) in one read-only view — every active spec with its status, branch (local or remote, ahead or behind the default branch, last commit), tasks done/blocked/pending and open review findings, plus what needs attention (stale executions, accepted specs not finished, spec branches without a spec, dependencies on unfinished specs), the next spec id and the next command for each spec. Use whenever the user runs /spec-status, or asks what is going on with the specs, which specs are in progress, blocked, waiting for review or ready to finish, or what to work on next ("status of the specs", "where are we with the specs?", "what's in flight?") — even if they don't say "status". Read-only: not for planning, executing, reviewing or finishing a spec.
argument-hint: "[spec id, to zoom in on one spec]"
---

# spec-status

One command that answers "what is going on with the specs?" without opening any of them. Specs under
execution live on their own branches (`spec/NNN-slug`), so the default branch alone doesn't show them; the
script reads each spec from its branch and builds the board. This skill only runs it, presents what it says
and suggests the next step — it changes nothing: no files, no branches, no commits.

## 1. Build the board

From the repo root:

```bash
node .specs/scripts/status.mjs
```

- Exit code 2 (no `.specs/`) → the workflow isn't set up: point to `/spec-init` and stop.
- The script doesn't exist (an older install) → say so and point to `/spec-init`, which upgrades the framework
  files; meanwhile `node .specs/scripts/check-spec.mjs` lists the specs in `.specs/changes/`.
- `--stale-days N` changes when an in-progress spec counts as stale (default 7); pass it when the user asks.
- `--json` prints the same board as JSON, when you need to filter or count.

With a spec id as argument, also run `node .specs/scripts/check-spec.mjs <id>` and show its detail: next task,
blocked tasks, which tasks cover each Expected Result, the latest review round. If that spec lives only on
its branch, say so: `check-spec.mjs` reads the working tree, so its detail needs `git switch spec/NNN-slug`
first — suggest it, don't do it.

## 2. Present it

Keep the script's facts as they are; don't reread the specs to second-guess them. Format:

- **Active specs**, one line or two each, in id order: `NNN-slug` — title — status — tasks done/total
  (blocked) — open findings — branch state — **next:** the command the script suggests.
- **Needs attention** — the flags, each with the action that clears it:
  - in-progress with no recent commit → resume it (`/spec-execute NNN`) or ask whether it is still wanted
    (`/spec-plan --abandon NNN`);
  - accepted but not finished → `/spec-finish NNN` soon: every commit on the branch after the review blocks
    it;
  - a `spec/*` branch with no spec → the user decides whether to delete the branch; never delete it yourself;
  - a dependency on an unfinished spec → finish that one first, or confirm the order with the user;
  - a status with no branch → the spec was edited by hand or its branch was deleted: point it out.
- **Footer** — the next spec id (what `/spec-plan` will use) and how many specs are finished and abandoned.

When nothing is active, say so in one line and suggest `/spec-plan <what to build next>`.

## 3. Suggest the next step

End with one recommendation, the most useful thing to do now, in this order of priority: an accepted spec
to finish, a review waiting, findings to fix, an execution to resume, a planned spec to start. One sentence,
with the command.
