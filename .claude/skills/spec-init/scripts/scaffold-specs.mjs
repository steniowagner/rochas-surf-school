#!/usr/bin/env node
// Installs the spec framework's .specs/ folder into a repository, from the copy bundled with this skill
// (../assets/specs): changes/, finished/, memory/, shared/ (rules) and templates/.
// It only adds what is missing and never overwrites: an existing file that differs from the bundled version is
// reported as customized and left alone, because a project may adapt its rules.
//
// Usage: node scaffold-specs.mjs [--check] [repo-root]
//   --check     report only, create nothing
//   repo-root   defaults to the git top-level of the current directory, else the current directory
// Exit codes: 0 = done, 1 = the bundled files are missing.
//
// Maintenance: ../assets/specs is the canonical copy of the framework files. When a rule in a repo's
// .specs/shared or .specs/templates should apply to every project, copy it into the bundle too; running
// `--check` in that repo lists the files that drifted (reported as customized).

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const bundle = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/specs");
const args = process.argv.slice(2);
const check = args.includes("--check");
const rootArg = args.find((a) => !a.startsWith("--"));

function gitTopLevel() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function filesUnder(dir) {
  const files = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) files.push(relative(dir, p).split("\\").join("/"));
    }
  };
  if (existsSync(dir)) walk(dir);
  return files.sort();
}

// `.gitkeep` files only exist to keep empty folders in git, so report them as their folder.
const display = (rel) => rel.replace(/(^|\/)\.gitkeep$/, "$1") || "./";

if (!existsSync(bundle)) {
  console.log(`SCAFFOLD FAILED\n- bundled framework files not found at ${bundle}`);
  process.exit(1);
}

const root = resolve(rootArg ?? gitTopLevel() ?? process.cwd());
const target = join(root, ".specs");
const existed = existsSync(target);
const bundled = filesUnder(bundle);
const created = [];
const unchanged = [];
const customized = [];

for (const rel of bundled) {
  const src = join(bundle, rel);
  const dst = join(target, rel);
  if (!existsSync(dst)) {
    if (!check) {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
    }
    created.push(display(rel));
  } else if (readFileSync(src).equals(readFileSync(dst))) {
    unchanged.push(display(rel));
  } else {
    customized.push(display(rel));
  }
}

const known = new Set(bundled);
const projectOnly = filesUnder(target).filter((rel) => /^(shared|templates)\//.test(rel) && !known.has(rel));

const state = existed ? "already existed" : check ? "missing" : "created";
console.log(`.specs/ at ${target}: ${state}`);
console.log(
  `${check ? "missing (would create)" : "created"} (${created.length})${created.length ? `: ${created.join(", ")}` : ""}`,
);
console.log(
  `customized — differ from the bundled version, left untouched (${customized.length})` +
    (customized.length ? `: ${customized.join(", ")}` : ""),
);
console.log(`unchanged (${unchanged.length})`);
if (projectOnly.length) console.log(`project-only files in shared/ or templates/: ${projectOnly.join(", ")}`);
