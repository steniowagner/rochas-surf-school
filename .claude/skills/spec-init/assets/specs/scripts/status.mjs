#!/usr/bin/env node
// Read-only board of the specs: where each one is, its branch, its progress, its open review findings, and what
// needs attention. Backs the /spec-status skill.
//
// A spec under execution lives on its branch (spec/NNN-slug): once its first commit is there, the default branch
// doesn't have the file. So each spec is read from the most current place it exists — the working tree when its
// branch is checked out (or it has no branch yet, or it is finished and merged), else the tip of its local branch,
// else the tip of the remote one.
//
// Usage: node .specs/scripts/status.mjs [--stale-days N] [--json]
//   --stale-days N   flag in-progress specs with no commit for N days (default 7)
//   --json           print the board as JSON instead of text
// Exit codes: 0 = board printed (flags don't change it), 2 = no .specs folder.

import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  FOLDER, findRoot, git, nextSpecId, pad, parseSpec, readText, specBranches, specFolders,
} from "./lib/spec.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const staleFlag = args.indexOf("--stale-days");
const staleDays = staleFlag !== -1 ? Number(args[staleFlag + 1]) : 7;

const NEXT = {
  planned: (id) => `/spec-execute ${id}`,
  "in-progress": (id) => `/spec-execute ${id} (resume)`,
  "in-review": (id) => `/spec-review ${id} (in a fresh session)`,
  "changes-requested": (id) => `/spec-execute ${id} (fix the findings)`,
  accepted: (id) => `/spec-finish ${id}`,
};

const root = findRoot(process.cwd());
if (!root) {
  console.log("STATUS FAILED\n- no .specs folder found in this directory or any parent. Run /spec-init.");
  process.exit(2);
}
const specsDir = join(root, ".specs");
const today = new Date(new Date().toISOString().slice(0, 10));
const daysSince = (date) => (date ? Math.floor((today - new Date(date)) / 86_400_000) : null);

const head = git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"])?.trim() ?? null;
function defaultBranch() {
  const remoteHead = git(root, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"])?.trim();
  const candidates = [remoteHead?.replace(/^origin\//, ""), remoteHead, "main", "master"].filter(Boolean);
  return candidates.find((b) => git(root, ["rev-parse", "--verify", "--quiet", `${b}^{commit}`]) !== null) ?? head;
}
const base = defaultBranch();

// ---------- collect ----------

const specs = new Map(); // id -> entry
const entry = (id) => {
  if (!specs.has(id)) specs.set(id, { id, local: null, remote: null, sources: {} });
  return specs.get(id);
};

for (const s of specFolders(specsDir)) {
  if (!existsSync(s.file)) continue;
  entry(s.id).sources.worktree = { area: s.area, folder: s.name, slug: s.slug, text: readText(s.file) };
}

const branches = specBranches(root);
for (const b of branches) {
  const e = entry(b.id);
  if (b.remote) e.remote ??= b;
  else e.local = b;
}

function fromRef(ref, id) {
  const files = git(root, ["ls-tree", "-r", "--name-only", ref, "--", ".specs/changes", ".specs/finished"]) ?? "";
  const path = files
    .split("\n")
    .find((f) => {
      const m = f.match(/^\.specs\/(changes|finished)\/([^/]+)\/spec\.md$/);
      return m && m[2].match(FOLDER)?.[2] === id;
    });
  if (!path) return null;
  const [, area, folder] = path.match(/^\.specs\/(changes|finished)\/([^/]+)\//);
  return { area, folder, slug: folder.match(FOLDER)[3], text: git(root, ["show", `${ref}:${path}`]) ?? "" };
}

const rows = [];
const flags = [];
for (const e of [...specs.values()].sort((a, b) => a.id.localeCompare(b.id))) {
  const branch = e.local ?? e.remote;
  const wt = e.sources.worktree;
  let source = null;
  let where = null;
  if (wt && (!branch || head === branch.branch || wt.area === "finished")) {
    source = wt;
    where = "working tree";
  } else if (branch) {
    source = fromRef(branch.short, e.id);
    where = branch.short;
  }
  if (!source) {
    flags.push(`branch ${branch.short} has no spec for ${e.id} (.specs/changes/${e.id}-*/spec.md) — delete it, or finish its spec`);
    continue;
  }

  const spec = parseSpec(source.text);
  const fm = spec.fm ?? {};
  const status = fm.status ?? "unknown";
  const row = {
    id: e.id,
    folder: source.folder,
    title: fm.title ?? "?",
    status,
    read_from: where,
    tasks: spec.progress,
    open_findings: spec.openFindings.map((f) => `F-${pad(f.id)}`),
    review_rounds: spec.rounds.length,
    depends_on: Array.isArray(fm.depends_on) ? fm.depends_on : [],
    branch: null,
  };

  if (branch) {
    const ref = branch.short;
    const last = git(root, ["log", "-1", "--format=%cs", ref])?.trim() || null;
    const counts = base ? git(root, ["rev-list", "--left-right", "--count", `${base}...${ref}`])?.trim().split(/\s+/) : null;
    const unpushed =
      e.local && e.remote ? git(root, ["rev-list", "--count", `${e.remote.short}..${e.local.short}`])?.trim() : null;
    const merged = base ? git(root, ["merge-base", "--is-ancestor", ref, base]) !== null : false;
    row.branch = {
      name: branch.branch,
      local: Boolean(e.local),
      remote: e.remote?.remote ?? null,
      unpushed: unpushed ? Number(unpushed) : 0,
      behind: counts ? Number(counts[0]) : null,
      ahead: counts ? Number(counts[1]) : null,
      merged,
      last_commit: last,
    };
  }

  row.age = daysSince(row.branch?.last_commit ?? fm.started);
  row.started = fm.started ?? null;
  row.slug = source.slug;
  if (status === "finished") {
    row.next = row.branch && !row.branch.merged ? `review and merge the pull request of ${row.branch.name}` : null;
  } else {
    row.next = NEXT[status]?.(e.id) ?? `fix the status "${status}" by hand`;
  }
  rows.push(row);
}

for (const r of rows) {
  const last = r.branch?.last_commit ?? r.started;
  if (r.status === "in-progress" && r.age !== null && r.age >= staleDays) {
    flags.push(`${r.id} is in-progress with no commit for ${r.age} days (last: ${last})`);
  }
  if (r.status === "accepted") {
    flags.push(`${r.id} is accepted but not finished${r.age !== null ? ` (${r.age} days since its last commit)` : ""} — /spec-finish ${r.id} before the code drifts`);
  }
  if (!["planned", "finished"].includes(r.status) && !r.branch) {
    flags.push(`${r.id} is ${r.status} but has no branch spec/${r.id}-${r.slug}`);
  }
  if (r.status === "finished") continue;
  for (const dep of r.depends_on) {
    const num = String(dep).match(/^(\d+)/)?.[1]?.padStart(3, "0");
    const depStatus = rows.find((o) => o.id === num)?.status ?? "not found";
    if (depStatus !== "finished") flags.push(`${r.id} depends on ${dep}, which is ${depStatus}`);
  }
}

const active = rows.filter((r) => r.status !== "finished" || r.next);
const finishedCount = rows.filter((r) => r.status === "finished").length;
const board = { default_branch: base, next_id: nextSpecId(root), active, finished: finishedCount, flags };

// ---------- report ----------

if (json) {
  console.log(JSON.stringify(board, null, 2));
  process.exit(0);
}

const out = [`spec status — default branch: ${base ?? "?"}${head && head !== base ? ` · on ${head}` : ""}`];
if (!active.length) out.push("no active specs");
for (const r of active) {
  const t = r.tasks;
  const b = r.branch;
  const branchText = b
    ? `${b.name} (${[b.local ? "local" : null, b.remote ? b.remote : null].filter(Boolean).join(" + ")}` +
      `${b.unpushed ? `, ${b.unpushed} unpushed` : ""}` +
      `${b.ahead !== null ? `, ${b.ahead} ahead / ${b.behind} behind ${base}` : ""}` +
      `${b.merged && r.status === "finished" ? ", merged" : ""}` +
      `${b.last_commit ? `, last commit ${b.last_commit}` : ""})`
    : "no branch yet";
  out.push(
    "",
    `${r.folder} [${r.status}] — ${r.title}`,
    `  tasks: ${t.done}/${t.total} done${t.blocked ? ` · ${t.blocked} blocked` : ""}${t.pending ? ` · ${t.pending} pending` : ""}` +
      (r.review_rounds ? ` · review: ${r.review_rounds} round(s), ${r.open_findings.length ? `open ${r.open_findings.join(", ")}` : "no open finding"}` : ""),
    `  branch: ${branchText}`,
    ...(r.depends_on.length ? [`  depends on: ${r.depends_on.join(", ")}`] : []),
    `  read from: ${r.read_from}`,
    ...(r.next ? [`  next: ${r.next}`] : []),
  );
}
out.push("", flags.length ? `flags (${flags.length}):` : "flags: none", ...flags.map((f) => `- ${f}`));
out.push("", `next spec id: ${board.next_id} · finished specs: ${finishedCount}`);
console.log(out.join("\n"));
