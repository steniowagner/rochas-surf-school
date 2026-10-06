#!/usr/bin/env node
// Installs or upgrades the spec framework in a repository's .specs/ folder, from the copy bundled with this skill
// (../assets/specs): changes/, finished/, memory/, scripts/ (the workflow's checks), shared/ (rules) and
// templates/.
//
// .specs/.framework.json records the installed framework version and the hash of every framework file as it was
// installed. That is how a file the project customized (it no longer matches its recorded hash) is told apart
// from one that is just out of date (it still matches, and the bundle has a newer version).
//
// Usage: node scaffold-specs.mjs [--check | --upgrade] [repo-root]
//   (default)   install: create what is missing, never overwrite anything
//   --check     report only, change nothing
//   --upgrade   also replace out-of-date files the project never customized, and delete the ones the framework
//               dropped (again, only when the project never changed them)
//   repo-root   defaults to the git top-level of the current directory, else the current directory
// Exit codes: 0 = done, 1 = the bundled files are missing.
//
// Maintenance: ../assets/specs is the canonical copy and ../assets/VERSION its version. Change the framework there,
// bump the version, then run `--upgrade` in each repository (this one included).

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const assets = resolve(dirname(fileURLToPath(import.meta.url)), "../assets");
const bundle = join(assets, "specs");
const args = process.argv.slice(2);
const check = args.includes("--check");
const upgrade = args.includes("--upgrade") && !check;
const rootArg = args.find((a) => !a.startsWith("--"));

function gitTopLevel() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
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

const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
// `.gitkeep` files only exist to keep empty folders in git, so report them as their folder.
const display = (rel) => rel.replace(/(^|\/)\.gitkeep$/, "$1") || "./";

if (!existsSync(bundle)) {
  console.log(`SCAFFOLD FAILED\n- bundled framework files not found at ${bundle}`);
  process.exit(1);
}

const version = existsSync(join(assets, "VERSION")) ? readFileSync(join(assets, "VERSION"), "utf8").trim() : "unversioned";
const root = resolve(rootArg ?? gitTopLevel() ?? process.cwd());
const target = join(root, ".specs");
const manifestPath = join(target, ".framework.json");
const existed = existsSync(target);
let manifest = { version: null, files: {} };
try {
  manifest = { version: null, files: {}, ...JSON.parse(readFileSync(manifestPath, "utf8")) };
} catch {}

const result = { created: [], upgraded: [], outdated: [], customized: [], unchanged: [], removed: [], dropped: [] };
const bundled = filesUnder(bundle);
const files = { ...manifest.files };

for (const rel of bundled) {
  const src = join(bundle, rel);
  const dst = join(target, rel);
  const bundledHash = hash(src);
  if (!existsSync(dst)) {
    if (!check) {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
      files[rel] = bundledHash;
    }
    result.created.push(display(rel));
    continue;
  }
  const installedHash = hash(dst);
  if (installedHash === bundledHash) {
    files[rel] = bundledHash;
    result.unchanged.push(display(rel));
  } else if (files[rel] === installedHash) {
    // Untouched since it was installed, and the framework has changed it since: out of date.
    if (upgrade) {
      copyFileSync(src, dst);
      files[rel] = bundledHash;
      result.upgraded.push(display(rel));
    } else {
      result.outdated.push(display(rel));
    }
  } else {
    result.customized.push(display(rel));
  }
}

// Files an earlier version installed that the framework no longer ships.
for (const rel of Object.keys(files).filter((r) => !bundled.includes(r))) {
  const dst = join(target, rel);
  if (!existsSync(dst)) {
    delete files[rel];
  } else if (hash(dst) === files[rel]) {
    if (upgrade) {
      rmSync(dst);
      delete files[rel];
      result.removed.push(display(rel));
    } else {
      result.dropped.push(display(rel));
    }
  } else {
    result.customized.push(`${display(rel)} (no longer part of the framework)`);
  }
}

const known = new Set([...bundled, ...Object.keys(files)]);
const projectOnly = filesUnder(target).filter(
  (rel) => /^(shared|templates|scripts)\//.test(rel) && !known.has(rel),
);

const pending = result.outdated.length + result.dropped.length;
if (!check) {
  // The installed version moves forward only when nothing is left out of date.
  const installed = pending ? manifest.version : version;
  writeFileSync(manifestPath, `${JSON.stringify({ version: installed, files }, null, 2)}\n`);
}

const show = (label, items) => {
  if (items.length) console.log(`${label} (${items.length}): ${items.join(", ")}`);
};
console.log(`.specs/ at ${target}: ${existed ? "already existed" : check ? "missing" : "created"}`);
console.log(`framework version: installed ${manifest.version ?? "unknown"} · bundled ${version}`);
show(check ? "missing (would create)" : "created", result.created);
show("upgraded", result.upgraded);
show("out of date — run with --upgrade to update", result.outdated);
show("removed (dropped by the framework)", result.removed);
show("dropped by the framework — run with --upgrade to delete", result.dropped);
show("customized by the project, left untouched", result.customized);
console.log(`unchanged (${result.unchanged.length})`);
if (projectOnly.length) console.log(`project-only files in shared/, templates/ or scripts/: ${projectOnly.join(", ")}`);
