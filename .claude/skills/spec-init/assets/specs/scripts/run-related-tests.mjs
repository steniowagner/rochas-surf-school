#!/usr/bin/env node
// Runs only the tests related to a spec's change — the tests it added or changed, and the existing tests that
// load a file it changed — workspace by workspace, with coverage, so the coverage gate can measure the changed
// lines. The change is everything since the spec's base_commit: committed, uncommitted and untracked.
//
// Supported runners: Vitest (`vitest related --run <files>`) and Jest (`jest --findRelatedTests <files>`),
// detected from each workspace's package.json. Workspaces that depend on a changed workspace import it through
// its package, which a test runner can't trace back to files: their suites run too, for regression only.
//
// Usage: node .specs/scripts/run-related-tests.mjs <spec id | slug | path> [--list] [--no-coverage]
//        node .specs/scripts/run-related-tests.mjs --base <git ref> [--list] [--no-coverage]
//   --list          print the commands without running them
//   --no-coverage   run the tests without collecting coverage
// Exit codes: 0 = the related tests passed (or there was nothing to run), 1 = a run failed, 2 = setup problem.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const CODE = /\.[cm]?[jt]sx?$/;
const SKIP = [/^\.(specs|claude|agents)\//, /\.d\.[cm]?ts$/, /^(?!(.*\/)?src\/).*\.config\.[cm]?[jt]s$/, /(^|\/)node_modules\//];

const args = process.argv.slice(2);
const list = args.includes("--list");
const coverage = !args.includes("--no-coverage");

function stop(message) {
  console.log(`RELATED TESTS FAILED\n- ${message}`);
  process.exit(2);
}

let root;
const git = (gitArgs) =>
  execFileSync("git", gitArgs, { cwd: root, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 }).toString();
const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};
const subdirs = (p) => {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
      .map((e) => e.name);
  } catch {
    return [];
  }
};

function resolveSpec(arg) {
  const asPath = resolve(arg);
  if (existsSync(asPath)) return statSync(asPath).isDirectory() ? join(asPath, "spec.md") : asPath;
  const num = /^\d+$/.test(arg) ? arg.padStart(3, "0") : null;
  for (const area of ["changes", "finished"]) {
    for (const n of subdirs(join(root, ".specs", area))) {
      const m = n.match(/^(?:\d{14}-)?(\d{3,})-(.+)$/);
      if (m && ((num && m[1] === num) || m[2] === arg || n === arg)) return join(root, ".specs", area, n, "spec.md");
    }
  }
  return null;
}

function workspaces() {
  const rootPkg = readJson(join(root, "package.json")) ?? {};
  const globs = Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : rootPkg.workspaces?.packages ?? [];
  const dirs = new Set();
  for (const g of globs) {
    const m = g.replace(/\/+$/, "").match(/^(.*?)\/\*\*?$/);
    if (m) subdirs(join(root, m[1])).forEach((n) => dirs.add(`${m[1]}/${n}`));
    else dirs.add(g.replace(/\/+$/, ""));
  }
  const out = [...dirs]
    .filter((d) => existsSync(join(root, d, "package.json")))
    .map((dir) => ({ dir, pkg: readJson(join(root, dir, "package.json")) ?? {} }));
  if (!out.length) out.push({ dir: ".", pkg: rootPkg });
  return out;
}

function runnerOf(pkg) {
  const script = pkg.scripts?.test ?? "";
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (/\bvitest\b/.test(script) || "vitest" in deps) return "vitest";
  if (/\bjest\b/.test(script) || "jest" in deps || "jest-expo" in deps) return "jest";
  return null;
}

function command(runner, files) {
  if (runner === "vitest") {
    const cov = coverage ? ["--coverage", "--coverage.reporter=json", "--coverage.reporter=text-summary"] : [];
    return files ? ["vitest", "related", "--run", ...cov, ...files] : ["vitest", "run"];
  }
  const cov = coverage ? ["--coverage", "--coverageReporters=json", "--coverageReporters=text-summary"] : [];
  return files ? ["jest", "--passWithNoTests", ...cov, "--findRelatedTests", ...files] : ["jest", "--passWithNoTests"];
}

// ---------- main ----------

try {
  root = execFileSync("git", ["rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {
  stop("not inside a git repository");
}
let base;
let label;
const baseFlag = args.indexOf("--base");
if (baseFlag !== -1) {
  base = args[baseFlag + 1];
  label = `changes since ${base}`;
} else {
  const arg = args.find((a) => !a.startsWith("--"));
  if (!arg) stop("usage: run-related-tests.mjs <spec id | slug | path> [--list] [--no-coverage]");
  const specFile = resolveSpec(arg);
  if (!specFile || !existsSync(specFile)) stop(`no spec matches "${arg}"`);
  base = readFileSync(specFile, "utf8").match(/^base_commit:\s*["']?([0-9a-f]{4,40})/m)?.[1];
  if (!base) stop(`${relative(root, specFile)} has no base_commit (spec-execute adds it when execution starts)`);
  label = `spec ${relative(join(root, ".specs"), specFile).split("/")[1]}, changes since ${base}`;
}
try {
  git(["cat-file", "-e", `${base}^{commit}`]);
} catch {
  stop(`unknown commit "${base}"`);
}

const changed = [
  ...new Set([
    ...git(["diff", "--name-only", "--diff-filter=ACMR", base]).split("\n"),
    ...git(["ls-files", "--others", "--exclude-standard"]).split("\n"),
  ]),
].filter((f) => f && CODE.test(f) && !SKIP.some((re) => re.test(f)) && existsSync(join(root, f)));

const all = workspaces();
const byDir = new Map(all.map((w) => [w.dir, w]));
const ownerOf = (f) =>
  all.map((w) => w.dir).filter((d) => d === "." || f.startsWith(`${d}/`)).sort((a, b) => b.length - a.length)[0] ?? ".";

const filesByWs = new Map();
for (const f of changed) {
  const ws = ownerOf(f);
  if (!filesByWs.has(ws)) filesByWs.set(ws, []);
  filesByWs.get(ws).push(ws === "." ? f : f.slice(ws.length + 1));
}

// Workspaces that depend, directly or not, on a changed workspace.
const nameToDir = new Map(all.filter((w) => w.pkg.name).map((w) => [w.pkg.name, w.dir]));
const dependents = new Map(); // dir -> package names it imports from changed workspaces
const queue = [...filesByWs.keys()];
const seen = new Set(queue);
while (queue.length) {
  const dir = queue.shift();
  const name = byDir.get(dir)?.pkg.name;
  if (!name) continue;
  for (const w of all) {
    const deps = { ...w.pkg.dependencies, ...w.pkg.devDependencies, ...w.pkg.peerDependencies };
    if (!(name in deps) || filesByWs.has(w.dir)) continue;
    dependents.set(w.dir, [...new Set([...(dependents.get(w.dir) ?? []), name])]);
    if (!seen.has(w.dir)) {
      seen.add(w.dir);
      queue.push(w.dir);
    }
  }
}

const runs = [];
for (const [dir, files] of filesByWs) {
  runs.push({ dir, runner: runnerOf(byDir.get(dir)?.pkg ?? {}), files, why: `${files.length} changed file(s)` });
}
for (const [dir, names] of dependents) {
  runs.push({ dir, runner: runnerOf(byDir.get(dir)?.pkg ?? {}), files: null, why: `whole suite: imports ${names.join(", ")}` });
}

const lines = [`related tests — ${label}`];
if (!runs.length) {
  console.log(`${lines[0]}\nRELATED TESTS PASSED — no code changed, nothing to run`);
  process.exit(0);
}
let failed = 0;
for (const run of runs) {
  if (!run.runner) {
    lines.push(
      run.files
        ? `- ${run.dir} (${run.why}) → no test runner: its changes can't be tested or measured (see technical-context → Coverage)`
        : `- ${run.dir} (${run.why}) → no test runner: skipped`,
    );
    continue;
  }
  const cmd = command(run.runner, run.files);
  const shown = `(cd ${run.dir} && npx ${cmd.join(" ")})`;
  if (list) {
    lines.push(`- ${run.dir} (${run.runner}, ${run.why}): ${shown}`);
    continue;
  }
  console.log(`\n▶ ${run.dir} — ${run.runner}, ${run.why}\n  ${shown}\n`);
  const result = spawnSync("npx", cmd, { cwd: join(root, run.dir), stdio: "inherit", env: { ...process.env, CI: "1" } });
  const ok = result.status === 0;
  if (!ok) failed++;
  lines.push(`- ${run.dir} (${run.runner}, ${run.why}) → ${ok ? "✅ passed" : "❌ failed"}`);
}
if (!list) lines.push(failed ? `RELATED TESTS FAILED (${failed} run${failed > 1 ? "s" : ""})` : "RELATED TESTS PASSED");
console.log(`\n${lines.join("\n")}`);
process.exit(failed ? 1 : 0);
