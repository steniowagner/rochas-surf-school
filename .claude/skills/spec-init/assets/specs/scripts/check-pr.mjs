#!/usr/bin/env node
// The CI gate of a spec pull request: fails unless the spec is really done. Every other check of the workflow runs
// inside an agent session; this one runs wherever the branch is pushed, so the rules hold whoever pushes.
//
// For a branch spec/NNN-slug, on a checkout of the branch's head (not GitHub's merge commit) with full history:
//   1. spec      — check-spec.mjs passes and the spec is finished, in .specs/finished/*-NNN-slug/
//   2. reviewed  — nothing outside .specs/ and the source documents changed between reviewed_commit and HEAD:
//                  the code that ships is the code the review accepted
//   3. tests     — run-related-tests.mjs and check-coverage.mjs pass (skipped with --no-tests)
// Lint, type check and build are project-specific: the workflow runs them on the workspaces changed since
// base_commit, which this script prints (and writes to $GITHUB_OUTPUT as base_commit and spec_id).
//
// Usage: node .specs/scripts/check-pr.mjs [branch] [--no-tests]
//   branch   defaults to $GITHUB_HEAD_REF, then the current branch
// Exit codes: 0 = passed, or not a spec branch (nothing to check); 1 = a step failed; 2 = setup problem.

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { findRoot, git, parseSpec, readText, reviewDrift, specFolders } from "./lib/spec.mjs";

const args = process.argv.slice(2);
const runTests = !args.includes("--no-tests");
const scripts = dirname(fileURLToPath(import.meta.url));

function stop(code, message) {
  console.log(message);
  process.exit(code);
}

const root = findRoot(process.cwd());
if (!root) stop(2, "SPEC PR CHECK FAILED\n- no .specs folder found. Run /spec-init.");
const branch =
  args.find((a) => !a.startsWith("--")) ||
  process.env.GITHUB_HEAD_REF ||
  git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"])?.trim();
const m = branch?.match(/^spec\/(\d{3,})-([a-z0-9-]+)$/);
if (!m) stop(0, `SPEC PR CHECK SKIPPED — "${branch ?? "detached HEAD"}" is not a spec branch (spec/NNN-slug)`);
const [, id, slug] = m;

const results = [];
const step = (name, ok, detail) => results.push({ name, ok, detail });
const run = (script, scriptArgs) => {
  console.log(`\n▶ node .specs/scripts/${script} ${scriptArgs.join(" ")}\n`);
  return spawnSync(process.execPath, [join(scripts, script), ...scriptArgs], { cwd: root, stdio: "inherit" }).status === 0;
};
const finish = () => {
  const failed = results.filter((r) => !r.ok);
  console.log(
    [
      "",
      `spec pull request — ${branch}`,
      ...results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`),
      failed.length ? `SPEC PR CHECK FAILED (${failed.map((r) => r.name).join(", ")})` : "SPEC PR CHECK PASSED",
    ].join("\n"),
  );
  process.exit(failed.length ? 1 : 0);
};

// 1. The spec is finished.
const spec = specFolders(join(root, ".specs")).find((s) => s.id === id && s.slug === slug && s.area === "finished");
if (!spec || !existsSync(spec.file)) {
  const active = specFolders(join(root, ".specs")).find((s) => s.id === id);
  step(
    "spec",
    false,
    active
      ? `.specs/${active.area}/${active.name} isn't finished — run /spec-finish ${id} before opening the pull request`
      : `no .specs/finished/*-${id}-${slug}/spec.md on this branch`,
  );
  finish();
}
const { fm } = parseSpec(readText(spec.file));
const checked = run("check-spec.mjs", [relative(root, spec.file)]);
step("spec", checked && fm?.status === "finished", `${relative(root, spec.file)} · status ${fm?.status ?? "?"}`);

// 2. The reviewed code is what ships.
const reviewed = fm?.reviewed_commit;
if (!reviewed) {
  step("reviewed", false, "no reviewed_commit in the front matter — the spec was never accepted by spec-review");
} else {
  const drift = reviewDrift(root, reviewed, { worktree: false });
  if (drift === null) {
    step("reviewed", false, `reviewed_commit ${reviewed} isn't in this checkout — check out the branch head with full history (fetch-depth: 0)`);
  } else {
    step(
      "reviewed",
      !drift.length,
      drift.length
        ? `changed after the review (${reviewed.slice(0, 7)}): ${drift.slice(0, 10).join(", ")}${drift.length > 10 ? ` … +${drift.length - 10}` : ""} — run /spec-review again`
        : `nothing outside .specs/ and the source documents changed since ${reviewed.slice(0, 7)}`,
    );
  }
}

// 3. The related tests and the coverage gate.
if (runTests) {
  if (!fm?.base_commit) {
    step("tests", false, "no base_commit in the front matter");
  } else {
    step("related tests", run("run-related-tests.mjs", [id]));
    step("coverage", run("check-coverage.mjs", [id]));
  }
}

if (fm?.base_commit) {
  console.log(`\nbase_commit: ${fm.base_commit} — lint, type check and build the workspaces changed since it`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `base_commit=${fm.base_commit}\nspec_id=${id}\n`);
}
finish();
