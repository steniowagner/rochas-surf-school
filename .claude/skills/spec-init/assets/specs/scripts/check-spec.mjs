#!/usr/bin/env node
// Validates a spec's structure and reports its progress. spec-plan runs it before handing a spec over;
// spec-execute runs it before and after executing; spec-review runs it before reviewing.
//
// Usage: node check-spec.mjs [id | slug | folder | path/to/spec.md]
//   Without an argument, lists the specs in .specs/changes/ with their status.
// Exit codes: 0 = valid (warnings allowed) or listing, 1 = errors found, 2 = .specs or the spec not found.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const STATUSES = ["planned", "in-progress", "in-review", "changes-requested", "accepted", "finished"];
const EXECUTABLE = new Set(["planned", "in-progress", "changes-requested"]);
const REQUIRED_SECTIONS = [
  "Goal", "Context", "Scope", "Decisions", "Expected Results", "Tasks", "Verification Plan", "Memory Impact",
  "References",
];
// Sections filled after planning (or optional): they may be empty and may keep their one-line instruction.
const LATER_SECTIONS = new Set(["amendments", "review", "assumptions"]);
const ER_FIELDS = ["Front", "Behavior", "Edge and error cases", "Verify by"];
const VAGUE =
  /\b(fast|quickly|simple|easy|easily|intuitive|properly|correctly|user-friendly|robust|seamless(?:ly)?|etc|and so on|as needed|appropriate(?:ly)?)\b/i;
const LEFTOVERS = [
  [/How to use this template|Replace every placeholder/, "template instructions"],
  [/<Front>|<path>/, "task group placeholder"],
  [/path\/to\/file/, "placeholder path `path/to/file`"],
  [/\bskill-name\b/, "placeholder skill `skill-name`"],
  [/What to do, in /, "placeholder task text"],
  [/Given \.\.\., when \.\.\., then \.\.\./, "placeholder behavior"],
  [/^\s*- \.\.\.\s*$/, "placeholder bullet `- ...`"],
  [/^### ER-\d+ — Short name\s*$/, "placeholder Expected Result title"],
  [/^\s*- `command` — what it proves/, "placeholder Verification Plan command"],
  [/check-coverage\.mjs NNN/, "placeholder spec id in the coverage command"],
  [/<document>|<section>|<path-to-document>|<section-anchor>/, "placeholder requirement link"],
];
const TASK_LINE = /^- \[( |x|X)\] \*\*T-(\d+)\*\*\s*[—–-]?\s*(.*)$/;
const FINDING_LINE = /^- \[( |x|X)\] \*\*F-(\d+)\*\*\s*(.*)$/;
const ER_HEADING = /^###\s+ER-(\d+)\b\s*[—–-]?\s*(.*)$/;
const ER_FIELD = /^- \*\*([^*]+?):\*\*\s*(.*)$/;
const EVIDENCE = /^\s+>\s*(✅|⛔)/;
const pad = (n) => String(n).padStart(2, "0");

// ---------- locating ----------

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

const readText = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

function parseFrontMatter(text) {
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

const statusOf = (specFile) =>
  existsSync(specFile) ? (parseFrontMatter(readText(specFile)).fm?.status ?? "unknown") : "no spec.md";

function findById(specsDir, id) {
  const num = String(id).padStart(3, "0");
  for (const n of subdirs(join(specsDir, "changes"))) {
    if (n.startsWith(`${num}-`)) return { name: n, status: statusOf(join(specsDir, "changes", n, "spec.md")) };
  }
  for (const n of subdirs(join(specsDir, "finished"))) {
    if (new RegExp(`^\\d{14}-${num}-`).test(n)) return { name: n, status: "finished" };
  }
  return null;
}

function resolveSpec(specsDir, arg) {
  const asPath = resolve(arg);
  if (existsSync(asPath)) {
    if (statSync(asPath).isDirectory()) return existsSync(join(asPath, "spec.md")) ? join(asPath, "spec.md") : null;
    return asPath;
  }
  const num = /^\d+$/.test(arg) ? arg.padStart(3, "0") : null;
  for (const area of ["changes", "finished"]) {
    for (const n of subdirs(join(specsDir, area))) {
      const m = n.match(/^(?:\d{14}-)?(\d{3,})-(.+)$/);
      if (m && ((num && m[1] === num) || m[2] === arg || n === arg)) {
        const file = join(specsDir, area, n, "spec.md");
        return existsSync(file) ? file : null;
      }
    }
  }
  return null;
}

function listSpecs(specsDir) {
  const changes = join(specsDir, "changes");
  const names = subdirs(changes);
  console.log(`specs in .specs/changes/ (${names.length}):`);
  for (const n of names) {
    const file = join(changes, n, "spec.md");
    const fm = existsSync(file) ? parseFrontMatter(readText(file)).fm : null;
    const status = fm?.status ?? (existsSync(file) ? "unknown" : "no spec.md");
    console.log(`- ${n} [${status}]${EXECUTABLE.has(status) ? " ← executable" : ""}${fm?.title ? ` — ${fm.title}` : ""}`);
  }
  console.log(`finished specs: ${subdirs(join(specsDir, "finished")).length}`);
}

// ---------- main ----------

const arg = process.argv[2];
const startDir = arg && existsSync(resolve(arg)) ? dirname(resolve(arg)) : process.cwd();
const root = findRoot(startDir);
if (!root) {
  console.log("CHECK FAILED\n- no .specs folder found in this directory or any parent. Run /spec-init.");
  process.exit(2);
}
const specsDir = join(root, ".specs");

if (!arg) {
  listSpecs(specsDir);
  process.exit(0);
}

const specFile = resolveSpec(specsDir, arg);
if (!specFile) {
  console.log(`CHECK FAILED\n- no spec matches "${arg}" in .specs/changes/ or .specs/finished/.`);
  listSpecs(specsDir);
  process.exit(2);
}

const errors = [];
const warnings = [];
const text = readText(specFile);
const { fm, body, offset } = parseFrontMatter(text);

// Front matter
const folder = basename(dirname(specFile));
const folderMatch = folder.match(/^(?:(\d{14})-)?(\d{3,})-(.+)$/);
if (!fm) {
  errors.push("no front matter (--- id, slug, title, status, created, fronts, depends_on ---)");
} else {
  if (!fm.id || !/^\d{3,}$/.test(fm.id)) errors.push(`front matter: id "${fm.id ?? ""}" must be a zero-padded number (e.g. 003)`);
  else if (folderMatch && fm.id !== folderMatch[2]) errors.push(`front matter: id ${fm.id} doesn't match the folder ${folder}`);
  if (!fm.slug || fm.slug === "short-kebab-slug" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.slug)) {
    errors.push(`front matter: slug "${fm.slug ?? ""}" must be the kebab-case slug of the folder`);
  } else if (folderMatch && fm.slug !== folderMatch[3]) {
    errors.push(`front matter: slug ${fm.slug} doesn't match the folder ${folder}`);
  }
  if (!fm.title || fm.title === "Human readable title") errors.push("front matter: title is missing or still the placeholder");
  if (!STATUSES.includes(fm.status)) errors.push(`front matter: status "${fm.status ?? ""}" must be one of ${STATUSES.join(", ")}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.created ?? "")) errors.push(`front matter: created "${fm.created ?? ""}" must be YYYY-MM-DD`);
  if (!Array.isArray(fm.fronts) || !fm.fronts.length) errors.push("front matter: fronts is empty — list the fronts this spec touches");
  if (fm.depends_on !== undefined && !Array.isArray(fm.depends_on)) errors.push("front matter: depends_on must be a list, e.g. [002]");
}
const fronts = (Array.isArray(fm?.fronts) ? fm.fronts : []).map((f) => f.toLowerCase());
const status = fm?.status;

// Sections
const lines = body.split("\n");
const sections = [];
let current = null;
let inFence = false;
let h1 = null;
lines.forEach((line, i) => {
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
const section = (name) => sections.find((s) => s.name.toLowerCase() === name.toLowerCase());
const prose = (items) => items.filter((it) => !it.fenced);
const meaningful = (items) =>
  prose(items).filter((it) => it.text.trim() && !/^>/.test(it.text) && !/^#{2,}\s/.test(it.text));

if (!h1 || /\bNNN\b|— Title\s*$/.test(h1.text)) errors.push("title heading (# NNN — Title) is missing or still the placeholder");

for (const name of REQUIRED_SECTIONS) {
  const s = section(name);
  if (!s) errors.push(`missing section: ## ${name}`);
  else if (!meaningful(s.items).length) errors.push(`section ## ${name} is empty`);
}

for (const s of sections) {
  const isLater = LATER_SECTIONS.has(s.name.toLowerCase());
  let quoteReported = false;
  for (const it of prose(s.items)) {
    if (!isLater && !quoteReported && /^>/.test(it.text)) {
      errors.push(`instruction block left in ## ${s.name} (line ${it.n})`);
      quoteReported = true;
    }
    for (const [re, what] of LEFTOVERS) {
      if (re.test(it.text)) errors.push(`${what} in ## ${s.name} (line ${it.n})`);
    }
  }
}

// Context: the spec names the sections of the product's source documents it implements, or says "none".
const context = section("Context");
if (context && !prose(context.items).some((it) => /^\s*-\s*Requirements:/.test(it.text))) {
  errors.push('## Context needs a "- Requirements:" line linking the source-document sections this spec implements (or "none")');
}

// Scope
const scope = section("Scope");
if (scope) {
  const sub = { "in scope": [], "out of scope": [] };
  let key = null;
  for (const it of prose(scope.items)) {
    const h = it.text.match(/^###\s+(.+?)\s*$/);
    if (h) {
      key = h[1].toLowerCase();
      continue;
    }
    if (key in sub && it.text.trim() && !/^>/.test(it.text)) sub[key].push(it.text.trim());
  }
  if (!sub["in scope"].length) errors.push("## Scope needs a ### In scope list");
  if (!sub["out of scope"].length) errors.push("## Scope needs a ### Out of scope list (write what is deliberately excluded)");
  else if (sub["out of scope"].every((l) => /^(-\s*)?none\.?$/i.test(l))) warnings.push("Out of scope is \"None\" — is nothing excluded?");
}

// Decisions
const decisions = section("Decisions");
if (decisions) {
  const rows = prose(decisions.items)
    .map((it) => ({ it, m: it.text.match(/^\|\s*D-(\d+)\s*\|(.*)\|\s*$/) }))
    .filter((r) => r.m);
  if (!rows.length && !meaningful(decisions.items).some((it) => /\bnone\b/i.test(it.text))) {
    errors.push("## Decisions has no D-NN rows (write \"None.\" if no decision was needed)");
  }
  for (const { it, m } of rows) {
    const cells = m[2].split("|").map((c) => c.trim());
    if (cells.length < 2 || cells.some((c) => !c || c === "...")) errors.push(`D-${pad(m[1])} needs a decision and a reason (line ${it.n})`);
  }
  if (rows.length) checkIds("D", rows.map((r) => Number(r.m[1])));
}

// Expected Results
const ers = [];
const erSection = section("Expected Results");
if (erSection) {
  let er = null;
  let field = null;
  for (const it of prose(erSection.items)) {
    const h = it.text.match(ER_HEADING);
    if (h) {
      er = { id: Number(h[1]), title: h[2].trim(), line: it.n, fields: {} };
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
  if (!ers.length) errors.push("## Expected Results has no ### ER-NN entries");
  for (const er of ers) {
    const id = `ER-${pad(er.id)}`;
    if (!er.title) errors.push(`${id} has no title (line ${er.line})`);
    for (const name of ER_FIELDS) {
      const value = er.fields[name];
      if (!value || value === "..." || /^\.\.\.$/.test(value)) errors.push(`${id} has no "${name}" (line ${er.line})`);
    }
    const front = er.fields.Front?.replace(/[`"']/g, "").toLowerCase();
    if (front && fronts.length) {
      const named = front.split(/\s*(?:,|\+|\/|&|\band\b)\s*/).filter(Boolean);
      for (const f of named) if (!fronts.includes(f)) errors.push(`${id}: front "${f}" is not in the front matter fronts [${fronts.join(", ")}]`);
    }
    const vague = er.fields.Behavior?.match(VAGUE);
    if (vague) warnings.push(`${id}: vague word "${vague[0]}" in Behavior — make it observable`);
  }
  checkIds("ER", ers.map((e) => e.id));
}
const erIds = new Set(ers.map((e) => e.id));

// Tasks
const tasks = [];
const groups = [];
const taskSection = section("Tasks");
if (taskSection) {
  let group = null;
  let task = null;
  for (const it of prose(taskSection.items)) {
    if (/^###\s/.test(it.text)) {
      group = { name: it.text.replace(/^###\s+/, "").trim(), line: it.n, tasks: [] };
      groups.push(group);
      task = null;
      continue;
    }
    const t = it.text.match(TASK_LINE);
    if (t) {
      task = { id: Number(t[2]), checked: t[1].toLowerCase() === "x", line: it.n, group, body: [t[3]], evidence: [] };
      tasks.push(task);
      if (group) group.tasks.push(task);
      else errors.push(`T-${pad(task.id)} is outside any ### group (line ${it.n})`);
      continue;
    }
    if (task && (/^\s/.test(it.text) || !it.text.trim())) {
      if (EVIDENCE.test(it.text)) task.evidence.push(it.text.trim());
      else if (it.text.trim()) task.body.push(it.text.trim());
      continue;
    }
    if (it.text.trim()) task = null;
  }

  const verification = groups.filter((g) => /^verification\b/i.test(g.name));
  const work = groups.filter((g) => !/^verification\b/i.test(g.name));
  if (!work.some((g) => g.tasks.length)) errors.push("## Tasks has no task in a front group (e.g. ### Backend) — the work isn't broken into tasks");
  if (!verification.some((g) => g.tasks.length)) errors.push("## Tasks needs a ### Verification group with a task that runs the Verification Plan");
  for (const g of work) if (!g.tasks.length) errors.push(`task group "${g.name}" has no tasks (line ${g.line})`);

  for (const t of tasks) {
    const id = `T-${pad(t.id)}`;
    const bodyText = t.body.join(" ");
    const covers = bodyText.match(/Covers:\s*(.*?)(?=\s*(?:·|Done when:|$))/);
    const done = bodyText.match(/Done when:\s*(.*?)(?=\s*(?:·|Covers:|$))/);
    if (!t.body[0]?.trim()) errors.push(`${id} has no description (line ${t.line})`);
    if (!covers || !covers[1].trim()) {
      errors.push(`${id} has no "Covers:" (ER ids, or "enabling") (line ${t.line})`);
    } else {
      const tokens = [...covers[1].matchAll(/\bER-(\d+)\b|\b(enabling|all)\b/gi)];
      if (!tokens.length) errors.push(`${id}: "Covers: ${covers[1].trim()}" names no ER id, "enabling" or "all" (line ${t.line})`);
      t.covers = tokens.filter((m) => m[1]).map((m) => Number(m[1]));
      for (const er of t.covers) if (!erIds.has(er)) errors.push(`${id} covers ER-${pad(er)}, which doesn't exist (line ${t.line})`);
    }
    if (!done || !done[1].trim() || /^\.\.\.$|^(it )?works\.?$/i.test(done[1].trim())) {
      errors.push(`${id} has no observable "Done when:" check (line ${t.line})`);
    }
    t.state = t.checked ? "done" : t.evidence.some((e) => e.includes("⛔")) ? "blocked" : "pending";
    if (t.checked && !t.evidence.some((e) => e.includes("✅"))) errors.push(`${id} is checked but has no ✅ evidence (line ${t.line})`);
    if (!t.checked && t.evidence.some((e) => e.includes("✅"))) warnings.push(`${id} has ✅ evidence but its box is unchecked (line ${t.line})`);
  }
  checkIds("T", tasks.map((t) => t.id));

  for (const er of ers) {
    if (!tasks.some((t) => t.covers?.includes(er.id))) {
      errors.push(`ER-${pad(er.id)} is not covered by any task ("Covers: all" on the verification task doesn't count)`);
    }
  }
  for (const f of fronts) {
    if (!work.some((g) => g.name.toLowerCase().includes(f))) warnings.push(`front "${f}" has no task group named after it`);
  }
  for (const g of work) {
    if (fronts.length && !fronts.some((f) => g.name.toLowerCase().includes(f))) {
      warnings.push(`task group "${g.name}" doesn't match any front in [${fronts.join(", ")}]`);
    }
  }
}

// Verification Plan: the coverage gate is mandatory — every spec's code must end at 100% coverage.
const plan = section("Verification Plan");
if (plan && !prose(plan.items).some((it) => /check-coverage\.mjs/.test(it.text))) {
  errors.push("## Verification Plan must run check-coverage.mjs <id> (100% coverage on the files this spec changes)");
}

// Review findings
const review = section("Review");
const rounds = [];
if (review) {
  let round = null;
  for (const it of prose(review.items)) {
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
}
const latestRound = rounds.at(-1);
const openFindings = latestRound ? latestRound.findings.filter((f) => !f.done) : [];

// Status consistency
const pending = tasks.filter((t) => t.state !== "done");
if (status === "planned" && tasks.some((t) => t.checked)) warnings.push("status is planned but some tasks are already checked");
if (["in-review", "accepted", "finished"].includes(status) && pending.length) {
  errors.push(`status is ${status} but ${pending.length} task(s) are not done: ${pending.map((t) => `T-${pad(t.id)}`).join(", ")}`);
}
if (status && status !== "planned" && !fm?.base_commit) warnings.push(`status is ${status} but the front matter has no base_commit`);
if (["accepted", "finished"].includes(status) && !fm?.reviewed_commit) {
  warnings.push(`status is ${status} but the front matter has no reviewed_commit (spec-review records it on acceptance)`);
}
if (status === "changes-requested" && !openFindings.length) warnings.push("status is changes-requested but the latest review round has no open finding");
const inFinished = relative(specsDir, specFile).startsWith("finished");
if (inFinished && status !== "finished") warnings.push(`the spec is in .specs/finished/ but its status is ${status}`);
if (!inFinished && folderMatch?.[1]) warnings.push("the folder has a finished-style timestamp prefix but lives in .specs/changes/");

// Dependencies
const deps = (Array.isArray(fm?.depends_on) ? fm.depends_on : []).map((d) => {
  const num = String(d).match(/^(\d+)/)?.[1];
  const found = num ? findById(specsDir, num) : null;
  if (!found) errors.push(`depends_on: spec "${d}" not found`);
  return found ? `${found.name} (${found.status}${found.status === "finished" ? "" : " — not finished"})` : `${d} (not found)`;
});

function checkIds(kind, ids) {
  if (!ids.length) return;
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`duplicate id ${kind}-${pad(id)}`);
    seen.add(id);
  }
  for (let i = 1; i <= Math.max(...ids); i++) {
    if (!seen.has(i)) errors.push(`${kind}-${pad(i)} is missing — ids must be sequential from ${kind}-01`);
  }
  if (ids.some((id, i) => i > 0 && id < ids[i - 1])) {
    warnings.push(`${kind} ids are not in document order${kind === "T" ? " (fine for tasks added during execution)" : ""}`);
  }
}

// ---------- report ----------

const out = [];
out.push(`spec: ${relative(root, specFile)}`);
out.push(errors.length ? `CHECK FAILED (${errors.length} error${errors.length > 1 ? "s" : ""})` : "CHECK OK");
out.push(`title: ${fm?.title ?? "?"} · status: ${status ?? "?"} · fronts: ${fronts.join(", ") || "none"}`);
if (fm?.base_commit || fm?.started) out.push(`started: ${fm.started ?? "?"} · base_commit: ${fm.base_commit ?? "?"}`);
out.push(`depends_on: ${deps.length ? deps.join(", ") : "none"}`);
out.push(`expected results: ${ers.length}${ers.length ? ` (${ers.map((e) => `ER-${pad(e.id)}`).join(", ")})` : ""}`);
const count = (s) => tasks.filter((t) => t.state === s).length;
out.push(
  `tasks: ${tasks.length} in ${groups.length} groups (${groups.map((g) => `${g.name.replace(/\s*\(.*\)\s*$/, "")} ${g.tasks.length}`).join(", ")})` +
    ` — done ${count("done")} · blocked ${count("blocked")} · pending ${count("pending")}`,
);
if (ers.length) {
  out.push(
    `coverage: ${ers
      .map((e) => {
        const by = tasks.filter((t) => t.covers?.includes(e.id)).map((t) => `T-${pad(t.id)}`);
        return `ER-${pad(e.id)} ← ${by.length ? by.join(", ") : "nothing"}`;
      })
      .join(" · ")}`,
  );
}
const blocked = tasks.filter((t) => t.state === "blocked");
if (blocked.length) out.push(`blocked: ${blocked.map((t) => `T-${pad(t.id)}`).join(", ")}`);
const next = tasks.find((t) => t.state === "pending");
if (next) out.push(`next task: T-${pad(next.id)} — ${next.body[0].slice(0, 140)}`);
if (rounds.length) {
  out.push(
    `review: ${rounds.length} round(s); latest "${latestRound.name}" — ${openFindings.length} open, ` +
      `${latestRound.findings.length - openFindings.length} closed` +
      (openFindings.length ? ` (${openFindings.map((f) => `F-${pad(f.id)}`).join(", ")})` : ""),
  );
}
if (errors.length) out.push("errors:", ...errors.map((e) => `- ${e}`));
if (warnings.length) out.push("warnings:", ...warnings.map((w) => `- ${w}`));
console.log(out.join("\n"));
process.exit(errors.length ? 1 : 0);
