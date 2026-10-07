#!/usr/bin/env node
// Runs the end-to-end suites of the apps a spec's change touches. The suites are declared by the project in the
// ```e2e block of .specs/memory/technical-context.md → Automated validation, one per line:
//
//   apps/web: npx playwright test --config apps/web/playwright.config.ts   # public pages, 3 languages
//
// A suite runs when its workspace changed since the spec's base_commit, or depends on a workspace that changed —
// an API change can break the app that calls it. Commands run from the repo root with CI=1, so they must start
// their own servers (e.g. Playwright's webServer) and expect their services (a database) to be up.
//
// Usage: node .specs/scripts/run-e2e.mjs <spec id | slug | path> [--list]
//        node .specs/scripts/run-e2e.mjs --base <git ref> [--list]
//        node .specs/scripts/run-e2e.mjs --all [--list]
//   --list   print the suites and why they would run, without running them
// Exit codes: 0 = the suites passed (or none applies), 1 = a suite failed, 2 = setup problem.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { affectedWorkspaces, findRoot, git, parseFrontMatter, readText, resolveSpec } from "./lib/spec.mjs";

const args = process.argv.slice(2);
const list = args.includes("--list");
const all = args.includes("--all");

function stop(message) {
  console.log(`E2E FAILED\n- ${message}`);
  process.exit(2);
}

const root = findRoot(process.cwd());
if (!root) stop("no .specs folder found. Run /spec-init.");

// The declared suites.
const contextFile = join(root, ".specs", "memory", "technical-context.md");
const suites = [];
if (existsSync(contextFile)) {
  for (const block of readText(contextFile).matchAll(/```e2e[^\n]*\n([\s\S]*?)```/g)) {
    for (const raw of block[1].split("\n")) {
      const line = raw.replace(/\s+#.*$/, "").replace(/^#.*$/, "").trim();
      const m = line.match(/^([^:\s]+):\s*(.+)$/);
      if (m) suites.push({ dir: m[1].replace(/^\.\/|\/+$/g, "") || ".", command: m[2].trim() });
    }
  }
}
if (!suites.length) {
  console.log(
    "E2E PASSED — no e2e suites declared (```e2e block in .specs/memory/technical-context.md → Automated validation);\n" +
      "user-facing Expected Results are verified by driving the apps",
  );
  process.exit(0);
}

// What changed.
let label = "all suites";
let affected = null;
if (!all) {
  let base;
  const baseFlag = args.indexOf("--base");
  if (baseFlag !== -1) {
    base = args[baseFlag + 1];
    label = `changes since ${base}`;
  } else {
    const arg = args.find((a) => !a.startsWith("--"));
    if (!arg) stop("usage: run-e2e.mjs <spec id | slug | path> | --base <git ref> | --all  [--list]");
    const specFile = resolveSpec(join(root, ".specs"), arg);
    if (!specFile) stop(`no spec matches "${arg}"`);
    base = parseFrontMatter(readText(specFile)).fm?.base_commit;
    if (!base) stop(`${relative(root, specFile)} has no base_commit (spec-execute adds it when execution starts)`);
    label = `spec ${relative(join(root, ".specs"), specFile).split("/")[1]}, changes since ${base}`;
  }
  if (git(root, ["cat-file", "-e", `${base}^{commit}`]) === null) stop(`unknown commit "${base}"`);
  const files = [
    ...(git(root, ["diff", "--name-only", base]) ?? "").split("\n"),
    ...(git(root, ["ls-files", "--others", "--exclude-standard"]) ?? "").split("\n"),
  ].filter((f) => f && !/^\.(specs|claude|agents)\//.test(f));
  const { changed, dependents } = affectedWorkspaces(root, files);
  affected = new Map([
    ...[...dependents].map(([dir, names]) => [dir, `imports ${names.join(", ")}`]),
    ...[...changed].map(([dir, f]) => [dir, `${f.length} changed file(s)`]),
  ]);
}

const lines = [`e2e suites — ${label}`];
let failed = 0;
let ran = 0;
for (const suite of suites) {
  const why = all ? "--all" : suite.dir === "." ? (affected.size ? "the repository changed" : null) : affected.get(suite.dir);
  if (!why) {
    lines.push(`- ${suite.dir}: skipped — not affected by the change`);
    continue;
  }
  if (list) {
    lines.push(`- ${suite.dir} (${why}): ${suite.command}`);
    continue;
  }
  console.log(`\n▶ ${suite.dir} — ${why}\n  ${suite.command}\n`);
  const result = spawnSync(suite.command, { cwd: root, shell: true, stdio: "inherit", env: { ...process.env, CI: "1" } });
  ran++;
  if (result.status !== 0) failed++;
  lines.push(`- ${suite.dir} (${why}) → ${result.status === 0 ? "✅ passed" : "❌ failed"}`);
}
if (!list) {
  lines.push(
    failed
      ? `E2E FAILED (${failed} suite${failed > 1 ? "s" : ""})`
      : `E2E PASSED${ran ? "" : " — no e2e suite applies to the changed workspaces"}`,
  );
}
console.log(`\n${lines.join("\n")}`);
process.exit(failed ? 1 : 0);
