#!/usr/bin/env node
// Validates a spec's structure and reports its progress. spec-plan runs it before handing a spec over;
// spec-execute runs it before and after executing; spec-review runs it before reviewing.
// The parsing lives in lib/spec.mjs, shared with status.mjs; this script judges what was parsed.
//
// Usage: node check-spec.mjs [id | slug | folder | path/to/spec.md]
//   Without an argument, lists the specs in .specs/changes/ with their status.
// Exit codes: 0 = valid (warnings allowed) or listing, 1 = errors found, 2 = .specs or the spec not found.

import { existsSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import {
  ARCHIVED, EXECUTABLE, FOLDER, STATUSES, findById, findRoot, pad, parseFrontMatter, parseSpec, prose, readText,
  resolveSpec, subdirs,
} from "./lib/spec.mjs";

const REQUIRED_SECTIONS = [
  "Goal", "Context", "Scope", "Decisions", "Expected Results", "Tasks", "Verification Plan", "Memory Impact",
  "References",
];
// The quick spec (template: quick) for small changes: Scope, Decisions and References are optional.
const QUICK_SECTIONS = ["Goal", "Context", "Expected Results", "Tasks", "Verification Plan", "Memory Impact"];
const QUICK_MAX_ERS = 3;
const QUICK_MAX_TASKS = 6;
// Sections filled after planning (or optional): they may be empty and may keep their one-line instruction.
const LATER_SECTIONS = new Set(["amendments", "review", "assumptions", "outcome"]);
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
  console.log("specs that live only on their branch (spec/NNN-slug) aren't listed: node .specs/scripts/status.mjs shows them all");
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
const spec = parseSpec(readText(specFile));
const { fm, sections, section, ers, groups, tasks, rounds, latestRound, openFindings } = spec;
const meaningful = (items) =>
  prose(items).filter((it) => it.text.trim() && !/^>/.test(it.text) && !/^#{2,}\s/.test(it.text));

// Front matter
const folder = basename(dirname(specFile));
const folderMatch = folder.match(FOLDER) ?? folder.match(/^(?:(\d{14})-)?(\d{3,})-(.+)$/);
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
const quick = fm?.template === "quick";
if (fm?.template !== undefined && !quick) errors.push(`front matter: template "${fm.template}" is unknown — "quick", or leave it out for a full spec`);

// Sections
if (!spec.h1 || /\bNNN\b|— Title\s*$/.test(spec.h1.text)) errors.push("title heading (# NNN — Title) is missing or still the placeholder");

for (const name of quick ? QUICK_SECTIONS : REQUIRED_SECTIONS) {
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

// Scope (optional in a quick spec, but complete when present)
if (section("Scope")) {
  if (!spec.scope["in scope"].length && !quick) errors.push("## Scope needs a ### In scope list");
  if (!spec.scope["out of scope"].length) {
    if (!quick) errors.push("## Scope needs a ### Out of scope list (write what is deliberately excluded)");
  } else if (spec.scope["out of scope"].every((l) => /^(-\s*)?none\.?$/i.test(l))) {
    warnings.push("Out of scope is \"None\" — is nothing excluded?");
  }
}

// Decisions
const decisionSection = section("Decisions");
if (decisionSection) {
  if (!spec.decisions.length && !meaningful(decisionSection.items).some((it) => /\bnone\b/i.test(it.text))) {
    errors.push("## Decisions has no D-NN rows (write \"None.\" if no decision was needed)");
  }
  for (const d of spec.decisions) {
    if (d.removed === "") errors.push(`D-${pad(d.id)} is removed without a reason — write (removed: <reason>) (line ${d.line})`);
    if (d.removed !== null) continue;
    if (d.cells.length < 2 || d.cells.some((c) => !c || c === "...")) errors.push(`D-${pad(d.id)} needs a decision and a reason (line ${d.line})`);
  }
  checkIds("D", spec.decisions.map((d) => d.id));
}

// Expected Results
if (section("Expected Results")) {
  if (!ers.some((e) => e.removed === null)) errors.push("## Expected Results has no ### ER-NN entries (other than removed ones)");
  for (const er of ers) {
    const id = `ER-${pad(er.id)}`;
    if (er.removed === "") errors.push(`${id} is removed without a reason — write (removed: <reason>) (line ${er.line})`);
    if (er.removed !== null) continue;
    if (!er.title) errors.push(`${id} has no title (line ${er.line})`);
    for (const name of ER_FIELDS) {
      const value = er.fields[name];
      if (!value || value === "...") errors.push(`${id} has no "${name}" (line ${er.line})`);
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
const liveErs = ers.filter((e) => e.removed === null);
const removedErIds = new Set(ers.filter((e) => e.removed !== null).map((e) => e.id));
if (quick && liveErs.length > QUICK_MAX_ERS) {
  errors.push(`a quick spec has at most ${QUICK_MAX_ERS} Expected Results (this one has ${liveErs.length}) — plan a full spec instead`);
}
if (quick && spec.tasks.filter((t) => t.removed === null).length > QUICK_MAX_TASKS) {
  warnings.push(`a quick spec with more than ${QUICK_MAX_TASKS} tasks is probably not a small change — consider a full spec`);
}

// Tasks
if (section("Tasks")) {
  const verification = groups.filter((g) => g.verification);
  const work = groups.filter((g) => !g.verification);
  if (!work.some((g) => g.tasks.length)) errors.push("## Tasks has no task in a front group (e.g. ### Backend) — the work isn't broken into tasks");
  if (!verification.some((g) => g.tasks.length)) errors.push("## Tasks needs a ### Verification group with a task that runs the Verification Plan");
  for (const g of work) if (!g.tasks.length) errors.push(`task group "${g.name}" has no tasks (line ${g.line})`);

  for (const t of tasks) {
    const id = `T-${pad(t.id)}`;
    if (!t.group) errors.push(`${id} is outside any ### group (line ${t.line})`);
    if (t.removed !== null) {
      if (!t.removed) errors.push(`${id} is removed without a reason — write (removed: <reason>) (line ${t.line})`);
      if (t.checked) {
        warnings.push(`${id} was done before it was removed: a task must undo its changes, or the reason must say why they stay (line ${t.line})`);
      }
      continue;
    }
    if (!t.body[0]?.trim()) errors.push(`${id} has no description (line ${t.line})`);
    if (!t.coversText) {
      errors.push(`${id} has no "Covers:" (ER ids, or "enabling") (line ${t.line})`);
    } else {
      if (!t.coverTokens) errors.push(`${id}: "Covers: ${t.coversText}" names no ER id, "enabling" or "all" (line ${t.line})`);
      for (const er of t.covers) if (!erIds.has(er)) errors.push(`${id} covers ER-${pad(er)}, which doesn't exist (line ${t.line})`);
      const stale = t.covers.filter((er) => removedErIds.has(er));
      const enabling = /\b(enabling|all)\b/i.test(t.coversText);
      if (stale.length && stale.length === t.covers.length && !enabling) {
        errors.push(`${id} only covers removed Expected Results (${stale.map((e) => `ER-${pad(e)}`).join(", ")}): remove the task too, or point it at a live one (line ${t.line})`);
      } else if (stale.length) {
        warnings.push(`${id} still covers removed ${stale.map((e) => `ER-${pad(e)}`).join(", ")} (line ${t.line})`);
      }
    }
    if (!t.doneWhen || /^\.\.\.$|^(it )?works\.?$/i.test(t.doneWhen)) {
      errors.push(`${id} has no observable "Done when:" check (line ${t.line})`);
    }
    if (t.checked && !t.evidence.some((e) => e.includes("✅"))) errors.push(`${id} is checked but has no ✅ evidence (line ${t.line})`);
    if (!t.checked && t.evidence.some((e) => e.includes("✅"))) warnings.push(`${id} has ✅ evidence but its box is unchecked (line ${t.line})`);
  }
  checkIds("T", tasks.map((t) => t.id));

  for (const er of liveErs) {
    if (!tasks.some((t) => t.removed === null && t.covers.includes(er.id))) {
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

// Status consistency
const pending = tasks.filter((t) => t.state !== "done" && t.state !== "removed");
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
if (inFinished && !ARCHIVED.has(status)) warnings.push(`the spec is in .specs/finished/ but its status is ${status}`);
if (!inFinished && ARCHIVED.has(status)) warnings.push(`status is ${status} but the spec is still in .specs/changes/`);
if (status === "abandoned") {
  const outcome = section("Outcome");
  if (!outcome || !meaningful(outcome.items).length) errors.push("status is abandoned but ## Outcome doesn't say why");
  if (!fm?.abandoned) warnings.push("status is abandoned but the front matter has no abandoned date");
}
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
out.push(`title: ${fm?.title ?? "?"} · status: ${status ?? "?"} · fronts: ${fronts.join(", ") || "none"}${quick ? " · template: quick" : ""}`);
if (fm?.base_commit || fm?.started) out.push(`started: ${fm.started ?? "?"} · base_commit: ${fm.base_commit ?? "?"}`);
out.push(`depends_on: ${deps.length ? deps.join(", ") : "none"}`);
out.push(
  `expected results: ${liveErs.length}${liveErs.length ? ` (${liveErs.map((e) => `ER-${pad(e.id)}`).join(", ")})` : ""}` +
    (removedErIds.size ? ` · removed: ${[...removedErIds].map((e) => `ER-${pad(e)}`).join(", ")}` : ""),
);
const { done, blocked: blockedCount, pending: pendingCount } = spec.progress;
out.push(
  `tasks: ${tasks.length} in ${groups.length} groups (${groups.map((g) => `${g.name.replace(/\s*\(.*\)\s*$/, "")} ${g.tasks.length}`).join(", ")})` +
    ` — done ${done} · blocked ${blockedCount} · pending ${pendingCount}` +
    (spec.progress.removed ? ` · removed ${spec.progress.removed}` : ""),
);
if (liveErs.length) {
  out.push(
    `coverage: ${liveErs
      .map((e) => {
        const by = tasks.filter((t) => t.removed === null && t.covers.includes(e.id)).map((t) => `T-${pad(t.id)}`);
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
