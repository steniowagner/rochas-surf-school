// Output evals of the spec skills: each eval of `.claude/skills/<skill>/evals/evals.json` builds a fixture at a
// stage of the lifecycle (fixture.mjs), runs its prompt through `claude -p` there, and grades the result with
// the programmatic checks in `.claude/skills/<skill>/evals/checks.mjs`. Each check returns
// { text, passed, evidence } — the grading.json format of the skill-creator's viewer.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, buildFixture, git, read } from "./fixture.mjs";

const TOOLS = "Bash,Read,Write,Edit,Glob,Grep,Skill";

function runAgent(cwd, prompt, { model, timeout }) {
  return new Promise((resolveRun) => {
    const args = ["-p", prompt, "--output-format", "json", "--permission-mode", "acceptEdits", "--allowedTools", TOOLS];
    if (model) args.push("--model", model);
    const env = { ...process.env };
    delete env.CLAUDECODE;
    const started = Date.now();
    const child = spawn("claude", args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (err += c));
    const timer = setTimeout(() => child.kill(), timeout * 1000);
    child.on("close", (code) => {
      clearTimeout(timer);
      let result = null;
      try {
        result = JSON.parse(out);
      } catch {}
      resolveRun({ code, result, stderr: err.slice(-4000), seconds: Math.round((Date.now() - started) / 1000) });
    });
  });
}

// Helpers the checks get: the fixture dir, git, file reads, and commands with their exit code and output.
function context(dir, before, agent) {
  const sh = (cmd) => {
    try {
      return { code: 0, out: execFileSync("bash", ["-o", "pipefail", "-c", cmd], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] }).toString() };
    } catch (e) {
      return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
    }
  };
  return {
    dir,
    before, // HEAD and branch of the fixture before the agent ran
    final: agent.result?.result ?? "",
    read: (p) => read(dir, p),
    git: (...args) => {
      try {
        return git(dir, ...args);
      } catch {
        return "";
      }
    },
    sh,
    check: (text, passed, evidence) => ({ text, passed: Boolean(passed), evidence: String(evidence ?? "").slice(0, 600) }),
  };
}

export function outputSkills(all) {
  return all.filter((s) => existsSync(join(REPO, ".claude/skills", s, "evals/evals.json")));
}

export async function runOutputs(skills, { model, timeout = 1800, only, resultsDir, log = console.log } = {}) {
  const jobs = [];
  for (const skill of skills) {
    const { evals } = JSON.parse(readFileSync(join(REPO, ".claude/skills", skill, "evals/evals.json"), "utf8"));
    const checks = (await import(pathToFileURL(join(REPO, ".claude/skills", skill, "evals/checks.mjs")).href)).default;
    for (const ev of evals) if (!only || only.includes(ev.name)) jobs.push({ skill, ev, checks });
  }
  log(`${jobs.length} output eval(s), run in parallel: ${jobs.map((j) => `${j.skill}/${j.ev.name}`).join(", ")}`);

  const report = await Promise.all(
    jobs.map(async ({ skill, ev, checks }) => {
      const dir = buildFixture(ev.stage);
      const before = { head: git(dir, "rev-parse", "HEAD"), branch: git(dir, "branch", "--show-current") };
      log(`▶ ${skill}/${ev.name} — fixture ${dir}`);
      const agent = await runAgent(dir, ev.prompt, { model, timeout });
      const grade = checks[ev.name];
      let expectations;
      try {
        expectations = grade ? grade(context(dir, before, agent)) : [{ text: "checks exist", passed: false, evidence: `no check named ${ev.name}` }];
      } catch (e) {
        expectations = [{ text: "checks ran", passed: false, evidence: String(e.stack ?? e) }];
      }
      const passed = expectations.filter((e) => e.passed).length;
      log(`■ ${skill}/${ev.name} — ${passed}/${expectations.length} in ${agent.seconds}s${agent.code ? ` (claude exited ${agent.code})` : ""}`);
      if (resultsDir) {
        const out = join(resultsDir, skill, ev.name);
        mkdirSync(out, { recursive: true });
        writeFileSync(join(out, "grading.json"), `${JSON.stringify({ eval_name: ev.name, fixture: dir, expectations }, null, 2)}\n`);
        writeFileSync(join(out, "agent.json"), `${JSON.stringify({ prompt: ev.prompt, ...agent }, null, 2)}\n`);
      }
      return { skill, name: ev.name, dir, seconds: agent.seconds, expectations };
    }),
  );
  return report;
}

export function printOutputs(report, log = console.log) {
  for (const r of report) {
    const passed = r.expectations.filter((e) => e.passed).length;
    log(`\n${r.skill}/${r.name}: ${passed}/${r.expectations.length} (${r.seconds}s, fixture ${r.dir})`);
    for (const e of r.expectations) log(`  ${e.passed ? "✓" : "✗"} ${e.text}${e.passed ? "" : ` — ${e.evidence}`}`);
  }
}
