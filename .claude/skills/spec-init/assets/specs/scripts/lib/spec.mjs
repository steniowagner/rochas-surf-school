// Shared parsing for the spec workflow's scripts: locating .specs/ and specs, front matter, the structure of a
// spec (sections, Expected Results, tasks, review rounds), spec branches and the next spec id. Every script that
// reads a spec imports it, so they never disagree about what a spec says.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const STATUSES = ["planned", "in-progress", "in-review", "changes-requested", "accepted", "finished", "abandoned"];
export const EXECUTABLE = new Set(["planned", "in-progress", "changes-requested"]);
// Statuses spec-plan --amend and --abandon accept.
export const AMENDABLE = new Set(["planned", "in-progress", "changes-requested"]);
// A spec in one of these is archived in finished/ and never changes again.
export const ARCHIVED = new Set(["finished", "abandoned"]);
// changes/NNN-slug or finished/YYYYMMDDHHMMSS-NNN-slug
export const FOLDER = /^(?:(\d{14})-)?(\d{3,})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
// A spec branch: spec/NNN-slug, local or remote (origin/spec/NNN-slug).
const BRANCH = /^(?:([^/]+)\/)?spec\/(\d{3,})-([a-z0-9-]+)$/;

// An amendment never deletes an Expected Result, a task or a decision: it strikes it through and marks it
// `(removed: <reason>)`, so the ids stay stable and the history readable.
const TASK_LINE = /^- \[( |x|X)\] (?:~~)?\*\*T-(\d+)\*\*\s*[—–-]?\s*(.*)$/;
const FINDING_LINE = /^- \[( |x|X)\] \*\*F-(\d+)\*\*\s*(.*)$/;
const ER_HEADING = /^###\s+(?:~~)?ER-(\d+)\b\s*[—–-]?\s*(.*)$/;
const ER_FIELD = /^- \*\*([^*]+?):\*\*\s*(.*)$/;
const DECISION_ROW = /^\|\s*(?:~~)?D-(\d+)(?:~~)?\s*\|(.*)\|\s*$/;
const REMOVED = /\(removed:\s*([^)]*)\)/;
const EVIDENCE = /^\s+>\s*(✅|⛔)/;

export const pad = (n) => String(n).padStart(2, "0");
// The reason of a `(removed: <reason>)` marker: null when the text has none, "" when the reason is empty.
export const removedReason = (text) => text.match(REMOVED)?.[1].trim() ?? null;
export const readText = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

// ---------- files and git ----------

export function findRoot(start) {
  let dir = resolve(start);
  while (true) {
    if (existsSync(join(dir, ".specs")) && statSync(join(dir, ".specs")).isDirectory()) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function subdirs(p) {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

// Runs git and returns its output, or null when it fails.
export function git(cwd, args) {
  try {
    return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 }).toString();
  } catch {
    return null;
  }
}

// ---------- locating specs ----------

// Every spec folder in changes/ and finished/, with its id, slug and spec.md path.
export function specFolders(specsDir) {
  const out = [];
  for (const area of ["changes", "finished"]) {
    for (const name of subdirs(join(specsDir, area))) {
      const m = name.match(FOLDER);
      if (!m) continue;
      out.push({ area, name, stamp: m[1] ?? null, id: m[2], slug: m[3], file: join(specsDir, area, name, "spec.md") });
    }
  }
  return out;
}

// The spec.md an argument names: an id (3, 003), a slug, a folder name, or a path to a folder or a spec.md.
export function resolveSpec(specsDir, arg) {
  const asPath = resolve(arg);
  if (existsSync(asPath)) {
    if (statSync(asPath).isDirectory()) return existsSync(join(asPath, "spec.md")) ? join(asPath, "spec.md") : null;
    return asPath;
  }
  const num = /^\d+$/.test(arg) ? arg.padStart(3, "0") : null;
  const found = specFolders(specsDir).find(
    (s) => (num && s.id === num) || s.slug === arg || s.name === arg || `${s.id}-${s.slug}` === arg,
  );
  return found && existsSync(found.file) ? found.file : null;
}

export function findById(specsDir, id) {
  const num = String(id).padStart(3, "0");
  const found = specFolders(specsDir).find((s) => s.id === num);
  if (!found) return null;
  return { ...found, status: found.area === "finished" ? statusOf(found.file, "finished") : statusOf(found.file) };
}

export function statusOf(specFile, fallback = "unknown") {
  if (!existsSync(specFile)) return "no spec.md";
  return parseFrontMatter(readText(specFile)).fm?.status ?? fallback;
}

// Local and remote branches named spec/NNN-slug.
export function specBranches(root) {
  const refs = git(root, ["for-each-ref", "--format=%(refname)", "refs/heads", "refs/remotes"]) ?? "";
  const out = [];
  for (const ref of refs.split("\n").filter(Boolean)) {
    const short = ref.replace(/^refs\/(heads|remotes)\//, "");
    const remote = ref.startsWith("refs/remotes/");
    const m = short.match(BRANCH);
    if (!m || (remote && !m[1]) || (!remote && m[1])) continue;
    out.push({ ref, short, branch: `spec/${m[2]}-${m[3]}`, remote: remote ? m[1] : null, id: m[2], slug: m[3] });
  }
  return out;
}

// One more than the highest id in changes/, finished/ and the spec branches: ids are never reused.
export function nextSpecId(root) {
  const ids = [
    ...specFolders(join(root, ".specs")).map((s) => Number(s.id)),
    ...specBranches(root).map((b) => Number(b.id)),
  ];
  return String((ids.length ? Math.max(...ids) : 0) + 1).padStart(3, "0");
}

// ---------- parsing ----------

export function parseFrontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: null, body: text, offset: 0 };
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([\w-]+):\s*(.*?)\s*$/);
    if (!kv) continue;
    let v = kv[2].replace(/\s+#.*$/, "");
    if (/^\[.*\]$/.test(v)) {
      v = v
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      v = v.replace(/^["']|["']$/g, "");
    }
    fm[kv[1]] = v;
  }
  return { fm, body: text.slice(m[0].length), offset: m[0].split("\n").length - 1 };
}

// `## ` sections of a Markdown body, ignoring fenced code. Each item keeps its line number and whether it is
// inside a fence.
function splitSections(body, offset = 0) {
  const sections = [];
  let current = null;
  let inFence = false;
  let h1 = null;
  body.split("\n").forEach((line, i) => {
    const n = offset + i + 1;
    const fenceLine = /^\s*```/.test(line);
    if (fenceLine) inFence = !inFence;
    if (!inFence && !fenceLine && /^# /.test(line) && !h1) h1 = { n, text: line };
    if (!inFence && !fenceLine && /^## /.test(line)) {
      current = { name: line.slice(3).trim(), line: n, items: [] };
      sections.push(current);
      return;
    }
    if (current) current.items.push({ n, text: line, fenced: inFence || fenceLine });
  });
  sections.h1 = h1;
  return sections;
}

export const prose = (items) => items.filter((it) => !it.fenced);

// Everything the scripts need to know about a spec, without judging it: check-spec.mjs does the judging.
export function parseSpec(text) {
  const { fm, body, offset } = parseFrontMatter(text);
  const sections = splitSections(body, offset);
  const section = (name) => sections.find((s) => s.name.toLowerCase() === name.toLowerCase());

  // Scope
  const scope = { "in scope": [], "out of scope": [] };
  if (section("Scope")) {
    let key = null;
    for (const it of prose(section("Scope").items)) {
      const h = it.text.match(/^###\s+(.+?)\s*$/);
      if (h) {
        key = h[1].toLowerCase();
        continue;
      }
      if (key in scope && it.text.trim() && !/^>/.test(it.text)) scope[key].push(it.text.trim());
    }
  }

  // Decisions
  const decisions = [];
  for (const it of prose(section("Decisions")?.items ?? [])) {
    const m = it.text.match(DECISION_ROW);
    if (!m) continue;
    decisions.push({ id: Number(m[1]), line: it.n, cells: m[2].split("|").map((c) => c.trim()), removed: removedReason(m[2]) });
  }

  // Expected Results
  const ers = [];
  let er = null;
  let field = null;
  for (const it of prose(section("Expected Results")?.items ?? [])) {
    const h = it.text.match(ER_HEADING);
    if (h) {
      const removed = removedReason(h[2]);
      const title = h[2].replace(REMOVED, "").replace(/~~/g, "").trim();
      er = { id: Number(h[1]), title, line: it.n, fields: {}, removed };
      ers.push(er);
      field = null;
      continue;
    }
    if (/^###\s/.test(it.text)) {
      er = null;
      continue;
    }
    if (!er) continue;
    const f = it.text.match(ER_FIELD);
    if (f) {
      field = f[1].trim();
      er.fields[field] = f[2].trim();
    } else if (field && /^\s+\S/.test(it.text)) {
      er.fields[field] += ` ${it.text.trim()}`;
    } else if (!it.text.trim()) {
      field = null;
    }
  }

  // Tasks
  const groups = [];
  const tasks = [];
  let group = null;
  let task = null;
  for (const it of prose(section("Tasks")?.items ?? [])) {
    if (/^###\s/.test(it.text)) {
      group = { name: it.text.replace(/^###\s+/, "").trim(), line: it.n, tasks: [] };
      group.verification = /^verification\b/i.test(group.name);
      groups.push(group);
      task = null;
      continue;
    }
    const t = it.text.match(TASK_LINE);
    if (t) {
      task = { id: Number(t[2]), checked: t[1].toLowerCase() === "x", line: it.n, group, body: [t[3]], evidence: [] };
      tasks.push(task);
      if (group) group.tasks.push(task);
      continue;
    }
    if (task && (/^\s/.test(it.text) || !it.text.trim())) {
      if (EVIDENCE.test(it.text)) task.evidence.push(it.text.trim());
      else if (it.text.trim()) task.body.push(it.text.trim());
      continue;
    }
    if (it.text.trim()) task = null;
  }
  for (const t of tasks) {
    const bodyText = t.body.join(" ");
    const covers = bodyText.match(/Covers:\s*(.*?)(?=\s*(?:·|Done when:|$))/);
    const done = bodyText.match(/Done when:\s*(.*?)(?=\s*(?:·|Covers:|$))/);
    t.coversText = covers ? covers[1].trim() : null;
    t.doneWhen = done ? done[1].trim() : null;
    const tokens = covers ? [...covers[1].matchAll(/\bER-(\d+)\b|\b(enabling|all)\b/gi)] : [];
    t.coverTokens = tokens.length;
    t.covers = tokens.filter((m) => m[1]).map((m) => Number(m[1]));
    t.removed = removedReason(bodyText);
    t.state = t.removed !== null
      ? "removed"
      : t.checked ? "done" : t.evidence.some((e) => e.includes("⛔")) ? "blocked" : "pending";
  }

  // Review rounds
  const rounds = [];
  let round = null;
  for (const it of prose(section("Review")?.items ?? [])) {
    const h = it.text.match(/^###\s+(.+?)\s*$/);
    if (h) {
      round = { name: h[1], findings: [] };
      rounds.push(round);
      continue;
    }
    const f = it.text.match(FINDING_LINE);
    if (f) {
      if (!round) {
        round = { name: "(no round heading)", findings: [] };
        rounds.push(round);
      }
      round.findings.push({ id: Number(f[2]), done: f[1].toLowerCase() === "x", text: f[3] });
    }
  }
  const latestRound = rounds.at(-1) ?? null;
  const openFindings = latestRound ? latestRound.findings.filter((f) => !f.done) : [];

  const count = (state) => tasks.filter((t) => t.state === state).length;
  return {
    fm,
    body,
    offset,
    h1: sections.h1,
    sections,
    section,
    scope,
    decisions,
    ers,
    groups,
    tasks,
    progress: {
      total: tasks.length - count("removed"),
      done: count("done"),
      blocked: count("blocked"),
      pending: count("pending"),
      removed: count("removed"),
    },
    rounds,
    latestRound,
    openFindings,
  };
}
