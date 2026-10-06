#!/usr/bin/env node
// Fingerprint of the code a review accepted: the git tree hash of the working tree — tracked and untracked
// files, respecting .gitignore — leaving out .specs/, .claude/ and .agents/, which legitimately change between
// the review and the finish (the spec, the memory, agent settings). Computed in a temporary index, so nothing
// gets staged.
//
// Usage: node fingerprint.mjs <spec id | slug | path>            print the current fingerprint
//        node fingerprint.mjs <spec id | slug | path> --record   spec-review: store it as `reviewed_tree`
//        node fingerprint.mjs <spec id | slug | path> --verify   spec-finish: compare it with `reviewed_tree`
// Exit codes: 0 = printed, recorded or unchanged; 1 = the code changed since the review; 2 = setup problem.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

const EXCLUDED = [".specs", ".claude", ".agents"];

function stop(code, message) {
  console.log(message);
  process.exit(code);
}

let root;
function git(args, env = {}) {
  return execFileSync("git", args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
  })
    .toString()
    .trim();
}

function subdirs(p) {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

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

function fingerprint() {
  const tmp = join(tmpdir(), `spec-fingerprint-${process.pid}-${Date.now()}`);
  // Starting from a copy of the real index lets git reuse its stat cache instead of re-hashing every file.
  const realIndex = resolve(root, git(["rev-parse", "--git-path", "index"]));
  if (existsSync(realIndex)) copyFileSync(realIndex, tmp);
  const env = { GIT_INDEX_FILE: tmp };
  try {
    // -f: the temporary index may hold staged changes (e.g. a staged rename); dropping them there is harmless.
    git(["rm", "-r", "-q", "-f", "--cached", "--ignore-unmatch", "--", ...EXCLUDED], env);
    git(["add", "-A", "--", ".", ...EXCLUDED.map((d) => `:(exclude)${d}`)], env);
    return git(["write-tree"], env);
  } finally {
    rmSync(tmp, { force: true });
  }
}

const args = process.argv.slice(2);
const mode = args.includes("--record") ? "record" : args.includes("--verify") ? "verify" : "print";
const arg = args.find((a) => !a.startsWith("--"));

try {
  root = execFileSync("git", ["rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
} catch {
  stop(2, "FINGERPRINT FAILED\n- not inside a git repository");
}
if (!arg) stop(2, "FINGERPRINT FAILED\n- usage: fingerprint.mjs <spec id | slug | path> [--record | --verify]");
const specFile = resolveSpec(arg);
if (!specFile || !existsSync(specFile)) stop(2, `FINGERPRINT FAILED\n- no spec matches "${arg}"`);

const text = readFileSync(specFile, "utf8").replace(/\r\n/g, "\n");
const fm = text.match(/^---\n([\s\S]*?)\n---/);
if (!fm) stop(2, `FINGERPRINT FAILED\n- ${relative(root, specFile)} has no front matter`);
let current;
try {
  current = fingerprint();
} catch (e) {
  stop(2, `FINGERPRINT FAILED\n- git: ${String(e.stderr ?? e.message).trim().split("\n")[0]}`);
}

if (mode === "print") stop(0, `fingerprint: ${current}`);

if (mode === "record") {
  const body = /^reviewed_tree:.*$/m.test(fm[1])
    ? fm[1].replace(/^reviewed_tree:.*$/m, `reviewed_tree: ${current}`)
    : `${fm[1]}\nreviewed_tree: ${current}`;
  writeFileSync(specFile, text.replace(fm[0], `---\n${body}\n---`));
  stop(0, `recorded reviewed_tree: ${current} in ${relative(root, specFile)}`);
}

const reviewed = fm[1].match(/^reviewed_tree:\s*["']?([0-9a-f]{40})/m)?.[1];
if (!reviewed) {
  stop(2, "FINGERPRINT FAILED\n- the spec has no reviewed_tree: spec-review records it when it accepts a spec");
}
if (reviewed === current) stop(0, `FINGERPRINT OK — the code is exactly what the review accepted (${current})`);

let changes = "";
try {
  const diff = git(["diff-tree", "-r", "--name-status", reviewed, current]).split("\n").filter(Boolean);
  changes = diff.slice(0, 20).map((l) => `- ${l.replace(/\t/g, " ")}`).join("\n") + (diff.length > 20 ? `\n- … +${diff.length - 20} more` : "");
} catch {
  changes = "- (the reviewed tree is no longer in the repository, so the changed files can't be listed)";
}
stop(1, `FINGERPRINT CHANGED — the code changed since the review:\n${changes}\nRun /spec-review again before finishing.`);
