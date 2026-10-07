#!/usr/bin/env node
// Runs the evals of the spec skills (spec-init, spec-plan, spec-execute, spec-review, spec-finish, spec-status).
// Run it after every change to one of those skills or to the framework files in spec-init's bundle.
//
// Usage: node .claude/evals/spec-workflow/run.mjs [triggers | outputs | all] [skill …] [options]
//   triggers          does each request invoke the right skill? (~20 queries per skill, a few minutes)
//   outputs           does each skill produce the right result on a fixture? (full agent runs, ~10–30 min)
//   all               both (default)
//   skill …           limit to these skills (default: every skill with evals)
//   --runs N          runs per trigger query (default 1; 3 for a stable trigger rate)
//   --workers N       trigger queries run at a time (default 8)
//   --limit N         only the first N trigger queries of each skill (a quick smoke run)
//   --model ID        model for `claude -p` (default: your configured model)
//   --eval NAME       only this output eval (repeatable)
// Results go to .claude/evals/spec-workflow/results/<timestamp>/ (gitignored).
// Exit codes: 0 = every eval passed, 1 = something failed.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "./fixture.mjs";
import { outputSkills, printOutputs, runOutputs } from "./outputs.mjs";
import { printTriggers, runTriggers, triggerSkills } from "./triggers.mjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const values = new Set(["--runs", "--workers", "--model", "--eval", "--limit"].flatMap((f) => args.flatMap((a, i) => (a === f ? [i + 1] : []))));
const words = args.filter((a, i) => !a.startsWith("--") && !values.has(i));
const mode = ["triggers", "outputs", "all"].includes(words[0]) ? words.shift() : "all";
const only = args.flatMap((a, i) => (a === "--eval" ? [args[i + 1]] : []));
const model = opt("--model");

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "");
const resultsDir = join(REPO, ".claude/evals/spec-workflow/results", stamp);
mkdirSync(resultsDir, { recursive: true });

let failed = 0;
if (mode !== "outputs") {
  const skills = words.length ? words.filter((s) => triggerSkills().includes(s)) : triggerSkills();
  const report = await runTriggers(skills, {
    runs: Number(opt("--runs", 1)),
    workers: Number(opt("--workers", 8)),
    limit: opt("--limit") ? Number(opt("--limit")) : undefined,
    model,
  });
  writeFileSync(join(resultsDir, "triggers.json"), `${JSON.stringify(report, null, 2)}\n`);
  printTriggers(report);
  failed += Object.values(report).reduce((n, r) => n + r.total - r.passed, 0);
}
if (mode !== "triggers") {
  const skills = outputSkills(words.length ? words : triggerSkills());
  const report = await runOutputs(skills, { model, only: only.length ? only : null, resultsDir });
  writeFileSync(join(resultsDir, "outputs.json"), `${JSON.stringify(report, null, 2)}\n`);
  printOutputs(report);
  failed += report.reduce((n, r) => n + r.expectations.filter((e) => !e.passed).length, 0);
}
console.log(`\n${failed ? `EVALS FAILED (${failed})` : "EVALS PASSED"} — results in ${resultsDir}`);
process.exit(failed ? 1 : 0);
