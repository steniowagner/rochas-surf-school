#!/usr/bin/env node
// Proposes how to split a spec's uncommitted work into small commits: one per task, built from the files each
// task's evidence names (then its description), plus a last commit for the archived spec and the memory.
// spec-finish reviews the plan, places what is unassigned, writes the messages and makes the commits.
//
// Usage: node commit-plan.mjs <spec id | slug | path> [--markdown]
//   --markdown   print every file the spec changed since its base_commit (committed or not), grouped by task, as
//                Markdown — the pull request's Files section
// Exit codes: 0 = plan printed, 2 = setup problem.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix, relative, resolve } from "node:path";

const TASK_LINE = /^- \[( |x|X)\] \*\*T-(\d+)\*\*\s*[—–-]?\s*(.*)$/;
const LOCKFILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"]);
const DO_NOT_COMMIT = [/(^|\/)\.env(\.(?!example$|sample$|template$)[\w.-]+)?$/, /(^|\/)settings\.local\.json$/];
const STATUS_WORD = { A: "added", M: "modified", D: "deleted", R: "renamed" };

function stop(message) {
  console.log(`COMMIT PLAN FAILED\n- ${message}`);
  process.exit(2);
}

let root;
const git = (args) =>
  execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 }).toString();

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

// ---------- the spec's tasks ----------

function parseTasks(text) {
  const tasks = [];
  let inTasks = false;
  let inFence = false;
  let group = null;
  let task = null;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    if (/^## /.test(line)) {
      inTasks = /^## Tasks\s*$/.test(line);
      task = null;
      continue;
    }
    if (!inTasks) continue;
    if (/^### /.test(line)) {
      const name = line.replace(/^###\s+/, "").trim();
      group = { name: name.replace(/\s*\(.*\)\s*$/, ""), workspace: name.match(/`([^`]+)`/)?.[1]?.replace(/\/$/, "") ?? null };
      task = null;
      continue;
    }
    const t = line.match(TASK_LINE);
    if (t) {
      task = { id: `T-${t[2].padStart(2, "0")}`, title: t[3], group, body: [t[3]], evidence: [] };
      tasks.push(task);
      continue;
    }
    if (task && (/^\s/.test(line) || !line.trim())) {
      if (/^\s+>/.test(line)) task.evidence.push(line.replace(/^\s+>\s?/, ""));
      else if (line.trim()) task.body.push(line.trim());
      continue;
    }
    if (line.trim()) task = null;
  }
  return tasks;
}

const backticked = (s) => [...s.matchAll(/`([^`\s]+)`/g)].map((m) => m[1]);
const looksLikePath = (t) => (t.includes("/") || /\.[a-z0-9]{1,6}$/i.test(t)) && !/^(https?:|npx|npm|node|git)/.test(t);

function evidencePaths(task) {
  const text = task.evidence.join(" ");
  const out = [];
  for (const m of text.matchAll(/files?:\s*([^;]+)/gi)) {
    const ticks = backticked(m[1]);
    out.push(...(ticks.length ? ticks : m[1].split(",").map((s) => s.trim()).filter(Boolean)));
  }
  return out.filter(looksLikePath);
}

const descriptionPaths = (task) => backticked(task.body.join(" ")).filter(looksLikePath);

// ---------- main ----------

const args = process.argv.slice(2);
const markdown = args.includes("--markdown");
const arg = args.find((a) => !a.startsWith("--"));
try {
  root = execFileSync("git", ["rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {
  stop("not inside a git repository");
}
if (!arg) stop("usage: commit-plan.mjs <spec id | slug | path> [--markdown]");
const specFile = resolveSpec(arg);
if (!specFile || !existsSync(specFile)) stop(`no spec matches "${arg}"`);
const text = readFileSync(specFile, "utf8").replace(/\r\n/g, "\n");
const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
const id = fm.match(/^id:\s*["']?(\d+)/m)?.[1];
const slug = fm.match(/^slug:\s*["']?([\w-]+)/m)?.[1];
if (!id || !slug) stop(`${relative(root, specFile)} has no id or slug in its front matter`);

// The plan works on the uncommitted work; the Markdown lists everything since base_commit, committed or not.
const changed = [];
const base = fm.match(/^base_commit:\s*["']?([0-9a-f]{4,40})/m)?.[1];
if (markdown && base) {
  const entries = git(["diff", "--name-status", "-z", "--find-renames", base]).split("\0");
  for (let i = 0; i < entries.length; i++) {
    const code = entries[i];
    if (!code) continue;
    if (code[0] === "R" || code[0] === "C") changed.push({ status: "R", from: entries[++i], path: entries[++i] });
    else changed.push({ status: code[0] === "D" ? "D" : code[0] === "A" ? "A" : "M", path: entries[++i] });
  }
  for (const p of git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean)) {
    changed.push({ path: p, status: "A" });
  }
} else {
  const entries = git(["status", "--porcelain=v1", "-z", "-uall"]).split("\0");
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e) continue;
    const xy = e.slice(0, 2);
    const path = e.slice(3);
    if (xy[0] === "R" || xy[0] === "C") changed.push({ path, status: "R", from: entries[++i] });
    else changed.push({ path, status: xy.includes("D") ? "D" : xy === "??" || xy.includes("A") ? "A" : "M" });
  }
}
const paths = changed.map((c) => c.path);
const byPath = new Map(changed.map((c) => [c.path, c]));

const owner = new Map(); // path -> task
const shared = new Map(); // path -> [other task ids]
const specFiles = paths.filter((p) => p.startsWith(".specs/"));
const doNotCommit = paths.filter((p) => !p.startsWith(".specs/") && DO_NOT_COMMIT.some((re) => re.test(p)));
const work = paths.filter((p) => !specFiles.includes(p) && !doNotCommit.includes(p));

function resolveToken(token, workspace, allowFolders) {
  const t = token.replace(/^\.\//, "").replace(/\/$/, "");
  const tries = [t, workspace ? `${workspace}/${t}` : null].filter(Boolean);
  for (const c of tries) if (work.includes(c)) return [c];
  if (allowFolders) {
    for (const c of tries) {
      const under = work.filter((p) => p.startsWith(`${c}/`));
      if (under.length) return under;
    }
  }
  const suffix = work.filter((p) => p.endsWith(`/${t}`));
  if (suffix.length === 1) return suffix;
  if (!t.includes("/")) {
    const base = work.filter((p) => posix.basename(p) === t);
    if (base.length === 1) return base;
  }
  return [];
}

const tasks = parseTasks(text);
// 1. what each task's evidence says it touched, in document order
for (const task of tasks) {
  for (const token of evidencePaths(task)) {
    for (const p of resolveToken(token, task.group?.workspace, true)) {
      if (!owner.has(p)) owner.set(p, task);
      else if (owner.get(p) !== task) shared.set(p, [...new Set([...(shared.get(p) ?? []), task.id])]);
    }
  }
}
// 2. files the task descriptions name, for what the evidence missed
for (const task of tasks) {
  for (const token of descriptionPaths(task)) {
    for (const p of resolveToken(token, task.group?.workspace, false)) if (!owner.has(p)) owner.set(p, task);
  }
}
// 3. a test goes with the task that owns its source; a lockfile with the task that changed a package.json
const workspaceOf = (p) => p.split("/").slice(0, 2).join("/");
const stem = (p) => posix.basename(p).replace(/\.(test|spec|e2e-spec|e2e)(?=\.)/, "").replace(/\.[^.]+$/, "");
for (const p of work.filter((p) => !owner.has(p))) {
  if (/\.(test|spec|e2e-spec|e2e)\.[cm]?[jt]sx?$/.test(p)) {
    const source = [...owner.keys()].find((q) => q !== p && stem(q) === stem(p) && workspaceOf(q) === workspaceOf(p));
    if (source) owner.set(p, owner.get(source));
  } else if (LOCKFILES.has(posix.basename(p))) {
    const manifest = [...owner.keys()].find((q) => posix.basename(q) === "package.json");
    if (manifest) owner.set(p, owner.get(manifest));
  }
}
const unassigned = work.filter((p) => !owner.has(p));

const line = (p) => {
  const c = byPath.get(p);
  return c.status === "R" ? `R ${c.from} → ${p}` : `${c.status} ${p}`;
};
const groups = tasks
  .map((task) => ({ task, files: work.filter((p) => owner.get(p) === task) }))
  .filter((g) => g.files.length);

if (markdown) {
  const out = [];
  for (const { task, files } of groups) {
    out.push(`- **${task.id}** — ${task.title.slice(0, 120)}${task.group ? ` _(${task.group.name})_` : ""}`);
    for (const p of files) {
      const c = byPath.get(p);
      out.push(`  - \`${p}\` — ${STATUS_WORD[c.status]}${c.status === "R" ? ` from \`${c.from}\`` : ""}`);
    }
  }
  if (unassigned.length) {
    out.push("- **Other changes**");
    for (const p of unassigned) out.push(`  - \`${p}\` — ${STATUS_WORD[byPath.get(p).status]}`);
  }
  if (specFiles.length) {
    out.push("- **Spec and memory**");
    for (const p of specFiles) out.push(`  - \`${p}\` — ${STATUS_WORD[byPath.get(p).status]}`);
  }
  console.log(out.join("\n"));
  process.exit(0);
}

const out = [];
out.push(`branch: spec/${id.padStart(3, "0")}-${slug}`);
out.push(`commit subject: <type>(spec-${id.padStart(3, "0")}): <what the commit does> — one commit per group, in this order`);
out.push(
  `uncommitted files: ${paths.length} — in task groups ${work.length - unassigned.length}, unassigned ${unassigned.length}, ` +
    `spec and memory ${specFiles.length}, not to commit ${doNotCommit.length}`,
);
let n = 0;
for (const { task, files } of groups) {
  out.push(`\n${++n}. ${task.id}${task.group ? ` · ${task.group.name}` : ""} — ${task.title.slice(0, 100)}`);
  for (const p of files) out.push(`   ${line(p)}`);
}
if (specFiles.length) {
  out.push(`\n${++n}. Spec and memory — always the last commit`);
  for (const p of specFiles) out.push(`   ${line(p)}`);
}
if (unassigned.length) {
  out.push("\nunassigned — put each with the task it belongs to, or in its own commit if it is a separate concern:");
  for (const p of unassigned) out.push(`   ${line(p)}`);
}
if (shared.size) {
  out.push("\nshared — committed with the first task that changed it; name the other tasks in that commit's body:");
  for (const [p, others] of shared) out.push(`   ${p} — first ${owner.get(p).id}, also ${others.join(", ")}`);
}
if (doNotCommit.length) {
  out.push("\ndo not commit (local settings or secrets):");
  for (const p of doNotCommit) out.push(`   ${p}`);
}
if (!paths.length) out.push("\nnothing uncommitted.");
console.log(out.join("\n"));
