#!/usr/bin/env node
// Tunes a spec skill's description with the skill-creator's optimization loop (scripts/run_loop.py), against the
// skill's trigger evals. The loop injects the candidate description as a temporary command, so it runs in a
// fixture where every other skill of this repository is installed but not the one being tuned: the candidate
// competes with its real siblings, not with a copy of itself.
//
// Usage: node .claude/evals/spec-workflow/tune.mjs <skill> --model <model id> [--iterations 5] [--runs 3] [--workers 4]
// It is expensive — up to 6 evaluations of 20 queries × 3 runs, plus the rewrites. Run one skill at a time with few
// workers: when the account hits its rate limit, every failing `claude -p` counts as "not triggered", and the loop
// reports 0% recall instead of failing.
// Needs the skill-creator skill (default ~/.claude/skills/skill-creator, or $SKILL_CREATOR) and Python 3.
// Prints the best description (chosen on the held-out queries); it doesn't edit SKILL.md — paste it in after
// reviewing it, and rerun `run.mjs triggers` to see it among all the siblings.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { REPO, buildFixture } from "./fixture.mjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const skill = args[0];
const model = opt("--model");
if (!skill || !model) {
  console.log("usage: tune.mjs <skill> --model <model id> [--iterations 5] [--runs 3] [--workers 4]");
  process.exit(2);
}
const creator = process.env.SKILL_CREATOR ?? join(homedir(), ".claude/skills/skill-creator");
if (!existsSync(join(creator, "scripts/run_loop.py"))) {
  console.log(`skill-creator not found at ${creator} (set SKILL_CREATOR)`);
  process.exit(2);
}
const evalSet = join(REPO, ".claude/skills", skill, "evals/trigger-evals.json");
if (!existsSync(evalSet)) {
  console.log(`no trigger evals for ${skill}`);
  process.exit(2);
}

const dir = buildFixture("base");
rmSync(join(dir, ".claude/skills"), { recursive: true, force: true });
for (const s of readdirSync(join(REPO, ".claude/skills"))) {
  if (s !== skill) cpSync(join(REPO, ".claude/skills", s), join(dir, ".claude/skills", s), { recursive: true, dereference: true });
}
const results = join(REPO, ".claude/evals/spec-workflow/results/tune", skill);
mkdirSync(results, { recursive: true });
console.log(`fixture without ${skill}: ${dir}\nresults: ${results}`);

const env = { ...process.env, PYTHONPATH: creator };
delete env.CLAUDECODE;
const run = spawnSync(
  "python3",
  [
    "-m", "scripts.run_loop",
    "--eval-set", evalSet,
    "--skill-path", join(REPO, ".claude/skills", skill),
    "--model", model,
    "--max-iterations", opt("--iterations", "5"),
    "--runs-per-query", opt("--runs", "3"),
    "--num-workers", opt("--workers", "4"),
    "--results-dir", results,
    "--report", "none",
    "--verbose",
  ],
  { cwd: dir, env, stdio: ["ignore", "pipe", "inherit"], maxBuffer: 64 * 1024 * 1024 },
);
const out = run.stdout.toString();
try {
  const best = JSON.parse(out.slice(out.indexOf("{")));
  console.log(`\nbest description for ${skill}:\n\n${best.best_description}\n`);
  console.log(JSON.stringify({ best_score: best.best_score, iterations: best.iterations_run ?? best.history?.length }, null, 2));
} catch {
  console.log(out);
}
process.exit(run.status ?? 1);
