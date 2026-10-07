#!/usr/bin/env node
// Coverage gate of the spec workflow: every line a spec adds or changes in a source file must be covered — the
// statements, branches and functions on those lines, and the lines themselves. A new file counts in full; in an
// existing file, only the changed lines do. It reads the reports the test runners wrote (istanbul
// coverage-final.json, or lcov.info), so run the related tests with coverage first (run-related-tests.mjs).
//
// Usage: node .specs/scripts/check-coverage.mjs <spec id | slug | path>   scope = changes since the spec's base_commit
//        node .specs/scripts/check-coverage.mjs --base <git ref>          scope = changes since that ref
// Exclusions: the ```coverage-exclude block in .specs/memory/technical-context.md (one glob per line, with a
// `# reason`). Test code, type declarations, type-only files and tool configuration are always excluded.
// Exit codes: 0 = every changed line covered, 1 = a changed line not covered or not measured, 2 = setup problem.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { isDecoratorMetadataBranch } from "./lib/decorator-metadata.mjs";
import { parseFrontMatter, readText, resolveSpec } from "./lib/spec.mjs";

const SOURCE = /\.[cm]?[jt]sx?$/;
const ALWAYS_EXCLUDED = [
  [/(^|\/)(__tests__|__mocks__|tests?|e2e)\//, "test code"],
  [/\.(spec|test|e2e-spec|e2e)\.[cm]?[jt]sx?$/, "test code"],
  [/\.d\.[cm]?ts$/, "type declarations"],
  [/^(?!(.*\/)?src\/).*\.config\.[cm]?[jt]s$/, "tool configuration"],
  [/^\.(specs|claude|agents)\//, "spec and agent files"],
];
const REPORT_SKIP = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".turbo", ".expo", "ios", "android", "Pods", ".claude", ".specs",
]);

function fail(message) {
  console.log(`COVERAGE CHECK FAILED\n- ${message}`);
  process.exit(2);
}

function git(cwd, args) {
  try {
    return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 }).toString();
  } catch {
    return null;
  }
}

const toPosix = (p) => p.split("\\").join("/");
const nonEmpty = (s) => (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

function globToRegExp(glob) {
  const g = glob.replace(/^\.\//, "");
  const anchored = g.includes("/") && !g.startsWith("**/");
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*" && g[i + 1] === "*") {
      if (g[i + 2] === "/") {
        re += "(?:.*/)?";
        i += 2;
      } else {
        re += ".*";
        i += 1;
      }
    } else if (c === "*") {
      re += "[^/]*";
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  if (g.endsWith("/")) re += ".*";
  return new RegExp(anchored ? `^${re}$` : `(^|/)${re}$`);
}

function projectExclusions(root) {
  const file = join(root, ".specs", "memory", "technical-context.md");
  if (!existsSync(file)) return [];
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const patterns = [];
  for (const block of text.matchAll(/```coverage-exclude[^\n]*\n([\s\S]*?)```/g)) {
    for (const raw of block[1].split("\n")) {
      const glob = raw.replace(/(^|\s)#.*$/, "").trim();
      if (glob) patterns.push({ glob, re: globToRegExp(glob) });
    }
  }
  return patterns;
}

// Lines added or changed per file since `base`, from the hunks of `git diff -U0` (working tree vs base).
function changedLines(root, base) {
  const out = new Map();
  const diff = git(root, ["diff", "-U0", "--no-color", "--find-renames", "--diff-filter=ACMR", base]) ?? "";
  let file = null;
  for (const line of diff.split("\n")) {
    const target = line.match(/^\+\+\+ b\/(.+)$/);
    if (target) {
      file = target[1];
      if (!out.has(file)) out.set(file, new Set());
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk && file) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      for (let l = start; l < start + count; l++) out.get(file).add(l);
    }
  }
  return out;
}

function findReports(dir, depth = 0, found = []) {
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!REPORT_SKIP.has(e.name) && depth < 6) findReports(p, depth + 1, found);
    } else if (e.name === "coverage-final.json" || e.name === "lcov.info") {
      found.push(p);
    }
  }
  return found;
}

// A file's coverage: line -> hits, and items (statements, branches, functions) with the line range they span.
const emptyRecord = () => ({ lines: new Map(), statements: null, branches: new Map(), functions: new Map(), mtime: 0 });
const bumpLine = (map, line, hits) => map.set(line, Math.max(map.get(line) ?? 0, hits));
const bumpItem = (map, key, hits, start, end) => {
  const prev = map.get(key);
  map.set(key, { hits: Math.max(prev?.hits ?? 0, hits), start, end: end ?? start });
};

function parseIstanbul(file) {
  const out = [];
  const data = JSON.parse(readFileSync(file, "utf8"));
  for (const [key, fc] of Object.entries(data)) {
    const rec = emptyRecord();
    rec.statements = new Map();
    for (const [id, loc] of Object.entries(fc.statementMap ?? {})) {
      const hits = fc.s?.[id] ?? 0;
      bumpItem(rec.statements, id, hits, loc.start.line, loc.end?.line);
      bumpLine(rec.lines, loc.start.line, hits);
    }
    let source = null;
    const sourceOf = () => (source ??= existsSync(fc.path ?? key) ? readFileSync(fc.path ?? key, "utf8") : "");
    for (const [id, br] of Object.entries(fc.branchMap ?? {})) {
      // Project rule (technical-context.md → Coverage): decorator metadata emitted on a decorated class line.
      if (br.type === "cond-expr" && isDecoratorMetadataBranch(br, sourceOf())) continue;
      (fc.b?.[id] ?? []).forEach((hits, i) => {
        const loc = br.locations?.[i]?.start?.line ? br.locations[i] : br.loc;
        bumpItem(rec.branches, `${id}:${i}`, hits, loc?.start?.line ?? br.line, loc?.end?.line);
      });
    }
    for (const [id, fn] of Object.entries(fc.fnMap ?? {})) {
      const loc = fn.loc ?? fn.decl;
      bumpItem(rec.functions, id, fc.f?.[id] ?? 0, fn.decl?.start?.line ?? loc?.start?.line ?? fn.line, loc?.end?.line);
    }
    out.push({ path: fc.path ?? key, rec });
  }
  return out;
}

function parseLcov(file) {
  const out = [];
  const workspace = dirname(dirname(file));
  let path = null;
  let rec = null;
  const fnLines = new Map();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const tag = line.slice(0, line.indexOf(":"));
    const value = line.slice(line.indexOf(":") + 1);
    if (line.startsWith("SF:")) {
      path = isAbsolute(value) ? value : resolve(workspace, value);
      rec = emptyRecord();
      fnLines.clear();
    } else if (!rec) {
      continue;
    } else if (tag === "DA") {
      const [l, hits] = value.split(",");
      bumpLine(rec.lines, Number(l), Number(hits));
    } else if (tag === "BRDA") {
      const [l, block, branch, taken] = value.split(",");
      bumpItem(rec.branches, `L${l}:${block}:${branch}`, taken === "-" ? 0 : Number(taken), Number(l));
    } else if (tag === "FN") {
      const [l, ...name] = value.split(",");
      fnLines.set(name.join(","), Number(l));
    } else if (tag === "FNDA") {
      const [hits, ...name] = value.split(",");
      const n = name.join(",");
      bumpItem(rec.functions, n, Number(hits), fnLines.get(n) ?? 0);
    } else if (line.startsWith("end_of_record")) {
      out.push({ path, rec });
      rec = null;
    }
  }
  return out;
}

function merge(into, from, mtime) {
  for (const [k, v] of from.lines) bumpLine(into.lines, k, v);
  if (from.statements) {
    into.statements ??= new Map();
    for (const [k, v] of from.statements) bumpItem(into.statements, k, v.hits, v.start, v.end);
  }
  for (const [k, v] of from.branches) bumpItem(into.branches, k, v.hits, v.start, v.end);
  for (const [k, v] of from.functions) bumpItem(into.functions, k, v.hits, v.start, v.end);
  into.mtime = Math.max(into.mtime, mtime);
}

// Coverage of the items that touch the changed lines (all items when `changed` is null: a new file).
function metrics(rec, changed) {
  const touches = (item) => {
    if (!changed) return true;
    for (let l = item.start; l <= item.end; l++) if (changed.has(l)) return true;
    return false;
  };
  const count = (items) => {
    const scoped = [...items].filter(touches);
    return { total: scoped.length, covered: scoped.filter((i) => i.hits > 0).length, missed: scoped.filter((i) => i.hits === 0) };
  };
  const lineItems = [...rec.lines].map(([line, hits]) => ({ start: line, end: line, hits }));
  const statements = count(rec.statements ? rec.statements.values() : lineItems);
  const branches = count(rec.branches.values());
  const functions = count(rec.functions.values());
  const lines = count(lineItems);
  const uncovered = new Set();
  for (const m of [statements, branches, functions, lines]) {
    for (const item of m.missed) {
      if (!changed) uncovered.add(item.start);
      else for (let l = item.start; l <= item.end; l++) if (changed.has(l)) uncovered.add(l);
    }
  }
  return { statements, branches, functions, lines, uncovered: [...uncovered].sort((a, b) => a - b) };
}

function hasRuntimeCode(root, file) {
  const src = readFileSync(join(root, file), "utf8");
  try {
    const ts = createRequire(join(root, "package.json"))("typescript");
    const js = ts.transpileModule(src, {
      fileName: file,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, removeComments: true },
    }).outputText;
    return js.replace(/^\s*export\s*\{\s*\}\s*;?\s*$/gm, "").replace(/^\s*import\s[^\n]*$/gm, "").trim().length > 0;
  } catch {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    return /\b(class|function|const|let|var|enum|new)\b|\bexport\s+default\b|\bexport\s*\*|\bexport\s*\{/.test(code);
  }
}

const workspaceOf = (root, file) => {
  let dir = dirname(file);
  while (dir !== "." && dir !== "/" && !existsSync(join(root, dir, "package.json"))) dir = dirname(dir);
  return dir === "/" ? "." : dir;
};

function ranges(nums) {
  const out = [];
  for (const n of nums) {
    const last = out.at(-1);
    if (last && n === last[1] + 1) last[1] = n;
    else out.push([n, n]);
  }
  return out.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(", ");
}

const pct = ({ covered, total }) => `${total === 0 ? 100 : Math.floor((covered / total) * 10000) / 100}% (${covered}/${total})`;

// ---------- main ----------

const args = process.argv.slice(2);
const root = git(process.cwd(), ["rev-parse", "--show-toplevel"])?.trim();
if (!root) fail("not inside a git repository");

let base;
let scope;
const baseFlag = args.indexOf("--base");
if (baseFlag !== -1) {
  base = args[baseFlag + 1];
  if (!base) fail("--base needs a git ref");
  scope = `changes since ${base}`;
} else if (args[0]) {
  const specFile = existsSync(join(root, ".specs")) ? resolveSpec(join(root, ".specs"), args[0]) : null;
  if (!specFile || !existsSync(specFile)) fail(`no spec matches "${args[0]}" in .specs/changes/ or .specs/finished/`);
  base = parseFrontMatter(readText(specFile)).fm?.base_commit?.match(/^[0-9a-f]{4,40}$/)?.[0];
  if (!base) fail(`${relative(root, specFile)} has no base_commit (spec-execute adds it when execution starts)`);
  scope = `spec ${basename(dirname(specFile))}, changes since base_commit ${base}`;
} else {
  fail("usage: check-coverage.mjs <spec id | slug | path>  or  check-coverage.mjs --base <git ref>");
}
if (git(root, ["cat-file", "-e", `${base}^{commit}`]) === null) fail(`unknown commit "${base}"`);

const linesByFile = changedLines(root, base);
const untracked = new Set(nonEmpty(git(root, ["ls-files", "--others", "--exclude-standard"])).map(toPosix));
const changed = [...new Set([...linesByFile.keys(), ...untracked])]
  .map(toPosix)
  .filter((f) => SOURCE.test(f) && existsSync(join(root, f)))
  .sort();

const exclusions = projectExclusions(root);
const alwaysExcluded = [];
const projectExcluded = [];
const candidates = [];
for (const f of changed) {
  const always = ALWAYS_EXCLUDED.find(([re]) => re.test(f));
  const project = exclusions.find((p) => p.re.test(f));
  if (always) alwaysExcluded.push(f);
  else if (project) projectExcluded.push(`${f} (${project.glob})`);
  else candidates.push(f);
}

const coverage = new Map();
const reports = findReports(root);
for (const report of reports) {
  // Prefer the JSON report when a folder has both: lcov's branch numbering differs and would double count.
  if (report.endsWith("lcov.info") && existsSync(join(dirname(report), "coverage-final.json"))) continue;
  let entries = [];
  try {
    entries = report.endsWith(".json") ? parseIstanbul(report) : parseLcov(report);
  } catch {
    continue;
  }
  const mtime = statSync(report).mtimeMs;
  for (const { path, rec } of entries) {
    const rel = toPosix(relative(root, path));
    if (!coverage.has(rel)) coverage.set(rel, emptyRecord());
    merge(coverage.get(rel), rec, mtime);
  }
}
const lookup = (file) => {
  if (coverage.has(file)) return coverage.get(file);
  for (const [path, rec] of coverage) if (path.endsWith(`/${file}`)) return rec;
  return null;
};

const reportDirs = reports.map((r) => toPosix(relative(root, r)));
const rows = [];
const notMeasured = [];
const typeOnly = [];
const noCode = [];
const stale = [];
for (const f of candidates) {
  const isNew = untracked.has(f) || git(root, ["cat-file", "-e", `${base}:${f}`]) === null;
  const changedSet = isNew ? null : linesByFile.get(f) ?? new Set();
  if (changedSet && !changedSet.size) continue; // only deletions or a rename without edits
  const rec = lookup(f);
  if (!rec) {
    if (!hasRuntimeCode(root, f)) {
      typeOnly.push(f);
      continue;
    }
    const ws = workspaceOf(root, f);
    const wsHasReport = reportDirs.some((r) => ws === "." || r.startsWith(`${ws}/`));
    notMeasured.push({
      f,
      why: wsHasReport
        ? "no test loads it"
        : `no coverage report in ${ws} — run its related tests with coverage, or it has no test runner yet`,
    });
    continue;
  }
  const m = metrics(rec, changedSet);
  const measured = m.statements.total + m.branches.total + m.functions.total + m.lines.total;
  if (!measured) {
    noCode.push(f);
    continue;
  }
  const full = [m.statements, m.branches, m.functions, m.lines].every((x) => x.covered === x.total);
  rows.push({ f, m, full, scope: changedSet ? `${changedSet.size} changed line(s)` : "new file" });
  if (statSync(join(root, f)).mtimeMs > rec.mtime) stale.push(f);
}

const failed = rows.filter((r) => !r.full).length + notMeasured.length;
const out = [];
out.push(`scope: ${scope}`);
out.push(
  `source files changed: ${changed.length} — measured ${rows.length}, no executable changed lines ${noCode.length}, ` +
    `type-only ${typeOnly.length}, excluded by technical-context ${projectExcluded.length}, ` +
    `always excluded (tests, declarations, tool config) ${alwaysExcluded.length}`,
);
out.push(`coverage reports found: ${reportDirs.length ? reportDirs.join(", ") : "none"}`);
if (!rows.length && !notMeasured.length) {
  out.push("COVERAGE OK — no changed line to measure");
} else {
  out.push(
    failed
      ? `COVERAGE FAILED (${failed} file${failed > 1 ? "s" : ""} with uncovered or unmeasured changed lines)`
      : `COVERAGE OK — every changed line covered in ${rows.length} file(s)`,
  );
  for (const r of rows) {
    const { statements, branches, functions, lines } = r.m;
    out.push(
      `${r.full ? "✅" : "❌"} ${r.f} (${r.scope}) — stmts ${pct(statements)} · branches ${pct(branches)} · ` +
        `funcs ${pct(functions)} · lines ${pct(lines)}` +
        (r.full ? "" : ` · uncovered changed lines: ${ranges(r.m.uncovered) || "?"}`),
    );
  }
  for (const { f, why } of notMeasured) out.push(`❌ ${f} — not measured: ${why}`);
}
if (noCode.length) out.push(`no executable changed lines (comments, types, imports): ${noCode.join(", ")}`);
if (typeOnly.length) out.push(`type-only (no runtime code to cover): ${typeOnly.join(", ")}`);
if (projectExcluded.length) out.push(`excluded by technical-context: ${projectExcluded.join(", ")}`);
if (stale.length) {
  out.push(`warning: coverage reports are older than ${stale.join(", ")} — rerun the related tests with coverage`);
}
if (!reports.length && candidates.length) {
  out.push("hint: run the related tests with coverage first: node .specs/scripts/run-related-tests.mjs <spec id>");
}
console.log(out.join("\n"));
process.exit(failed ? 1 : 0);
