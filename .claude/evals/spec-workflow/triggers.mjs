// Trigger evals of the spec skills: does each realistic request invoke the right skill, and do the near-misses
// stay away from it? Every query of `.claude/skills/<skill>/evals/trigger-evals.json` runs through `claude -p`
// in a fixture repository where all of this repository's skills are installed — so the skills compete for
// each request the way they do for real — and the first skill invoked is recorded.
//
// A should-trigger query passes when the skill is invoked in at least half the runs; a near-miss passes when it
// isn't. The report also shows where each query went, so a near-miss that lands on the wrong sibling shows up.

import { spawn } from "node:child_process";
import { cpSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { REPO, buildFixture } from "./fixture.mjs";

// One run of one query: resolves with the skill the agent invoked first, or null.
function invokedSkill(cwd, query, { model, timeout }) {
  return new Promise((resolveRun) => {
    const args = ["-p", query, "--output-format", "stream-json", "--verbose", "--max-turns", "4"];
    if (model) args.push("--model", model);
    const env = { ...process.env };
    delete env.CLAUDECODE; // allows a nested `claude -p` inside a Claude Code session
    const child = spawn("claude", args, { cwd, env, stdio: ["ignore", "pipe", "ignore"] });
    let buffer = "";
    let done = false;
    const finish = (skill) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill();
      resolveRun(skill);
    };
    const timer = setTimeout(() => finish(null), timeout * 1000);
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      let nl;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          continue;
        }
        if (event.type === "assistant") {
          for (const block of event.message?.content ?? []) {
            if (block.type === "tool_use" && block.name === "Skill") return finish(String(block.input?.skill ?? "").replace(/^\//, ""));
          }
        }
        if (event.type === "result") return finish(null);
      }
    });
    child.on("close", () => finish(null));
  });
}

async function pool(items, size, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await worker(items[i], i);
      }
    }),
  );
  return out;
}

export function triggerSkills() {
  return readdirSync(join(REPO, ".claude/skills")).filter((s) => {
    try {
      readFileSync(join(REPO, ".claude/skills", s, "evals/trigger-evals.json"));
      return true;
    } catch {
      return false;
    }
  });
}

export async function runTriggers(skills, { runs = 1, workers = 8, model, timeout = 90, limit, log = console.log } = {}) {
  // One fixture with every skill of this repository (symlinked ones copied), so the near-misses can land on
  // their real owner.
  const dir = buildFixture("base");
  cpSync(join(REPO, ".claude/skills"), join(dir, ".claude/skills"), { recursive: true, dereference: true, force: true });
  log(`fixture: ${dir}`);

  const jobs = [];
  for (const skill of skills) {
    const set = JSON.parse(readFileSync(join(REPO, ".claude/skills", skill, "evals/trigger-evals.json"), "utf8"));
    for (const item of limit ? set.slice(0, limit) : set) for (let r = 0; r < runs; r++) jobs.push({ skill, item });
  }
  log(`${jobs.length} runs (${skills.length} skill(s), ${runs} run(s) per query, ${workers} at a time)`);
  let finished = 0;
  const results = await pool(jobs, workers, async (job) => {
    const got = await invokedSkill(dir, job.item.query, { model, timeout });
    finished++;
    if (finished % 10 === 0) log(`  ${finished}/${jobs.length}`);
    return { ...job, got };
  });

  const report = {};
  for (const skill of skills) {
    const byQuery = new Map();
    for (const r of results.filter((x) => x.skill === skill)) {
      if (!byQuery.has(r.item.query)) byQuery.set(r.item.query, { ...r.item, got: [] });
      byQuery.get(r.item.query).got.push(r.got);
    }
    const queries = [...byQuery.values()].map((q) => {
      const rate = q.got.filter((g) => g === skill).length / q.got.length;
      const pass = q.should_trigger ? rate >= 0.5 : rate < 0.5;
      return { ...q, trigger_rate: rate, pass };
    });
    report[skill] = { passed: queries.filter((q) => q.pass).length, total: queries.length, queries };
  }
  return report;
}

export function printTriggers(report, log = console.log) {
  for (const [skill, r] of Object.entries(report)) {
    log(`\n${skill}: ${r.passed}/${r.total}`);
    for (const q of r.queries) {
      if (q.pass) continue;
      const where = q.got.map((g) => g ?? "none").join(", ");
      log(`  ✗ ${q.should_trigger ? "should trigger" : `near-miss (${q.routes_to ?? "no skill"})`} — went to ${where}: ${q.query.slice(0, 100)}`);
    }
  }
  const wrongRoute = Object.values(report)
    .flatMap((r) => r.queries)
    .filter((q) => !q.should_trigger && q.pass && q.routes_to && !q.got.includes(q.routes_to));
  if (wrongRoute.length) {
    log(`\nnear-misses that missed their own skill too (not a failure of the skill under test):`);
    for (const q of wrongRoute) log(`  · expected ${q.routes_to}, got ${q.got.map((g) => g ?? "none").join(", ")}: ${q.query.slice(0, 90)}`);
  }
}
