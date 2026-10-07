# Spec workflow evals

Evals for the spec skills — `spec-init`, `spec-plan`, `spec-execute`, `spec-review`, `spec-finish` and
`spec-status`. Run them after every change to one of those skills or to the framework files in
`spec-init/assets/`, so that an edit can't quietly change what a skill produces or when it triggers.

```bash
node .claude/evals/spec-workflow/run.mjs                 # everything
node .claude/evals/spec-workflow/run.mjs triggers        # routing only, a few minutes
node .claude/evals/spec-workflow/run.mjs outputs spec-review
```

They run `claude -p` (your configured model, or `--model`), so they cost real tokens: the trigger evals are short
runs, but each output eval is a full agent session. Results land in `results/<timestamp>/` (gitignored).

## Trigger evals

`.claude/skills/<skill>/evals/trigger-evals.json` — about 20 realistic requests per skill: half should invoke
it, half are near-misses that belong to a sibling skill (`routes_to`) or to no skill (e.g. "fix the review
findings" belongs to `spec-execute`, not `spec-review`). `triggers.mjs` runs each one in a fixture repository
where all of this repository's skills are installed, and records the first skill invoked. A should-trigger
query passes when its skill is invoked in at least half the runs (`--runs 3` for a stable rate), and a
near-miss passes when it isn't. The report also lists near-misses that missed their own skill.

The format is the skill-creator's, so the same file drives its description loop:

```bash
node .claude/evals/spec-workflow/tune.mjs spec-review --model <model id>
```

`tune.mjs` runs the skill-creator's `run_loop` (60/40 train/test split, 3 runs per query, up to 5 rewrites) in a
fixture without the skill being tuned, and prints the best description by held-out score. It is expensive: run
one skill at a time, with few workers (`--workers`, default 4). When the account hits its rate limit, the failed
runs count as "not triggered" and the loop reports 0% recall — a sign to stop and retry later, not a verdict on
the description. Paste the description you keep into `SKILL.md` yourself, then rerun the trigger evals for every
skill: a description that wins a query can take it from a sibling.

## Output evals

`.claude/skills/<skill>/evals/evals.json` lists the evals (prompt, fixture stage, expected output, the
assertions in words), and `evals/checks.mjs` checks them programmatically against the fixture after the
agent ran. Each check returns `{ text, passed, evidence }`, the skill-creator's `grading.json` format.

| Skill | Fixture | What it checks |
| --- | --- | --- |
| `spec-plan` | memory and a requirements doc | the spec passes `check-spec.mjs`, links the real section, covers the edge cases, changes no code |
| `spec-execute` | a planned three-task spec | its branch, one commit per task, evidence, related tests and coverage green, the behavior itself |
| `spec-review` | an in-review spec with a planted bug and an untested branch | changes requested, with a finding for each, committed, no code changed |
| `spec-finish` | an accepted spec | memory from the templates, the source section marked, the archive's name, one commit, pushed, the CI gate passes |
| `spec-status` | specs at several stages and an orphan branch | the board, the next commands, the flag; nothing changed |

`spec-init` has trigger evals only: its output is an interview.

The prompts tell the agent the user isn't available, so the interactive skills take their recommended answers
instead of waiting. `fixture.mjs <stage>` builds a fixture by hand to look around or debug a check.
