#!/usr/bin/env node
// Archives an accepted spec: sets `status: finished` and `finished: <date>` in its front matter, then moves its
// folder from .specs/changes/ to .specs/finished/<YYYYMMDDHHMMSS>-<NNN-slug>/ — with `git mv` when the folder
// is tracked, so its history follows it. The agent updates the memory before running this.
//
// Usage: node finish-spec.mjs [--check] <spec id | slug | path>
//   --check   report what would happen, change nothing
// Exit codes: 0 = archived (or already finished), 1 = refused (status isn't accepted), 2 = not found.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const check = args.includes("--check");
const arg = args.find((a) => !a.startsWith("--"));

function findRoot(start) {
  let dir = resolve(start);
  while (true) {
    if (existsSync(join(dir, ".specs")) && statSync(join(dir, ".specs")).isDirectory()) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function subdirs(p) {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

function git(cwd, gitArgs) {
  try {
    return execFileSync("git", gitArgs, { cwd, stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch {
    return null;
  }
}

function stop(code, message) {
  console.log(message);
  process.exit(code);
}

function findSpecFolder(specsDir, area, value) {
  const asPath = resolve(value);
  if (existsSync(asPath)) {
    const dir = statSync(asPath).isDirectory() ? asPath : dirname(asPath);
    return dirname(dir) === join(specsDir, area) ? basename(dir) : null;
  }
  const num = /^\d+$/.test(value) ? value.padStart(3, "0") : null;
  return (
    subdirs(join(specsDir, area)).find((n) => {
      const m = n.match(/^(?:\d{14}-)?(\d{3,})-(.+)$/);
      return m && ((num && m[1] === num) || m[2] === value || n === value || n.endsWith(`-${value}`));
    }) ?? null
  );
}

const pad = (n) => String(n).padStart(2, "0");

const root = findRoot(arg && existsSync(resolve(arg)) ? dirname(resolve(arg)) : process.cwd());
if (!root) stop(2, "FINISH FAILED\n- no .specs folder found in this directory or any parent. Run /spec-init.");
if (!arg) stop(2, "FINISH FAILED\n- usage: finish-spec.mjs [--check] <spec id | slug | path>");
const specsDir = join(root, ".specs");

const folder = findSpecFolder(specsDir, "changes", arg);
if (!folder) {
  const done = findSpecFolder(specsDir, "finished", arg);
  if (done) stop(0, `already finished: .specs/finished/${done}`);
  stop(2, `FINISH FAILED\n- no spec matches "${arg}" in .specs/changes/`);
}

const specFile = join(specsDir, "changes", folder, "spec.md");
if (!existsSync(specFile)) stop(2, `FINISH FAILED\n- .specs/changes/${folder} has no spec.md`);
const text = readFileSync(specFile, "utf8").replace(/\r\n/g, "\n");
const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
if (!fmMatch) stop(2, `FINISH FAILED\n- .specs/changes/${folder}/spec.md has no front matter`);
const status = fmMatch[1].match(/^status:\s*["']?([\w-]+)/m)?.[1];
if (status !== "accepted") {
  stop(1, `FINISH REFUSED\n- status is "${status ?? "missing"}": only an accepted spec can be finished (run /spec-review first)`);
}

const now = new Date();
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const target = `${stamp}-${folder}`;
const from = join(specsDir, "changes", folder);
const to = join(specsDir, "finished", target);
if (existsSync(to)) stop(2, `FINISH FAILED\n- .specs/finished/${target} already exists`);

let movedWith = "nothing (--check)";
if (!check) {
  let fm = fmMatch[1].replace(/^status:.*$/m, "status: finished");
  fm = /^finished:.*$/m.test(fm) ? fm.replace(/^finished:.*$/m, `finished: ${date}`) : `${fm}\nfinished: ${date}`;
  writeFileSync(specFile, text.replace(fmMatch[0], `---\n${fm}\n---`));

  mkdirSync(join(specsDir, "finished"), { recursive: true });
  const tracked = git(root, ["ls-files", "--error-unmatch", relative(root, specFile)]) !== null;
  if (tracked && git(root, ["mv", relative(root, from), relative(root, to)]) !== null) {
    movedWith = "git mv";
  } else {
    renameSync(from, to);
    movedWith = "rename (the folder wasn't tracked by git yet)";
  }
}

// Links elsewhere in .specs that still point at the old location.
const references = [];
const scan = [
  ...subdirs(join(specsDir, "changes"))
    .filter((n) => n !== folder)
    .map((n) => join(specsDir, "changes", n, "spec.md")),
  ...(function memoryFiles(dir) {
    const out = [];
    for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) {
      if (e.isDirectory()) out.push(...memoryFiles(join(dir, e.name)));
      else if (e.name.endsWith(".md")) out.push(join(dir, e.name));
    }
    return out;
  })(join(specsDir, "memory")),
].filter((f) => existsSync(f));
const oldRef = new RegExp(`(changes/|\\.\\./)${folder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(/|\\b)`);
for (const f of scan) {
  readFileSync(f, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (oldRef.test(line)) references.push(`${relative(root, f)}:${i + 1}`);
    });
}

console.log(
  [
    `spec: .specs/changes/${folder} (${status})`,
    `${check ? "would archive" : "archived"} → .specs/finished/${target}`,
    `front matter: status: finished · finished: ${date}${check ? " (not written)" : ""}`,
    `moved with: ${movedWith}`,
    `links to the old location: ${references.length ? references.join(", ") : "none"}`,
  ].join("\n"),
);
