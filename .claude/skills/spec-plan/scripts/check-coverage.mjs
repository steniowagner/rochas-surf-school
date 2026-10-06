#!/usr/bin/env node
// Coverage gate of the spec workflow: every source file a spec creates or changes must be 100% covered —
// statements, branches, functions and lines. It reads the reports the test runners already wrote (istanbul
// coverage-final.json, or lcov.info), so run the tests with coverage first.
//
// Usage: node check-coverage.mjs <spec id | slug | path>   scope = changes since the spec's base_commit
//        node check-coverage.mjs --base <git ref>          scope = changes since that ref
// Exclusions: the ```coverage-exclude block in .specs/memory/technical-context.md (one glob per line, with a
// `# reason`). Test code, type declarations and tool configuration files are always excluded.
// Exit codes: 0 = every measured file at 100%, 1 = a file below 100% or not measured, 2 = setup problem.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";

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
const lines = (s) => (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

function subdirs(p) {
  try {
    return readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

function resolveSpec(root, arg) {
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

// A file's coverage as maps of key -> hits, so several reports for the same file can be merged.
const emptyRecord = () => ({ lines: new Map(), statements: null, branches: new Map(), functions: new Map(), mtime: 0 });
const bump = (map, key, hits, line) => {
  const prev = map.get(key);
  if (line === undefined) map.set(key, Math.max(prev ?? 0, hits));
  else map.set(key, { hits: Math.max(prev?.hits ?? 0, hits), line });
};

function parseIstanbul(file) {
  const out = [];
  const data = JSON.parse(readFileSync(file, "utf8"));
  for (const [key, fc] of Object.entries(data)) {
    const rec = emptyRecord();
    rec.statements = new Map();
    for (const [id, loc] of Object.entries(fc.statementMap ?? {})) {
      const hits = fc.s?.[id] ?? 0;
      bump(rec.statements, id, hits);
      bump(rec.lines, loc.start.line, hits);
    }
    for (const [id, br] of Object.entries(fc.branchMap ?? {})) {
      (fc.b?.[id] ?? []).forEach((hits, i) => {
        const line = br.locations?.[i]?.start?.line ?? br.loc?.start?.line ?? br.line;
        bump(rec.branches, `${id}:${i}`, hits, line);
      });
    }
    for (const [id, fn] of Object.entries(fc.fnMap ?? {})) {
      bump(rec.functions, id, fc.f?.[id] ?? 0, fn.decl?.start?.line ?? fn.loc?.start?.line ?? fn.line);
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
    const [tag, value = ""] = [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1)];
    if (line.startsWith("SF:")) {
      path = isAbsolute(value) ? value : resolve(workspace, value);
      rec = emptyRecord();
      fnLines.clear();
    } else if (!rec) {
      continue;
    } else if (tag === "DA") {
      const [l, hits] = value.split(",");
      bump(rec.lines, Number(l), Number(hits));
    } else if (tag === "BRDA") {
      const [l, block, branch, taken] = value.split(",");
      bump(rec.branches, `L${l}:${block}:${branch}`, taken === "-" ? 0 : Number(taken), Number(l));
    } else if (tag === "FN") {
      const [l, ...name] = value.split(",");
      fnLines.set(name.join(","), Number(l));
    } else if (tag === "FNDA") {
      const [hits, ...name] = value.split(",");
      const n = name.join(",");
      bump(rec.functions, n, Number(hits), fnLines.get(n) ?? 0);
    } else if (line.startsWith("end_of_record")) {
      out.push({ path, rec });
      rec = null;
    }
  }
  return out;
}

// Type-only files (interfaces, type aliases) compile to nothing, so test runners never list them. Uses the
// project's TypeScript to check that, falling back to a keyword heuristic.
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

function merge(into, from, mtime) {
  for (const [k, v] of from.lines) bump(into.lines, k, v);
  if (from.statements) {
    into.statements ??= new Map();
    for (const [k, v] of from.statements) bump(into.statements, k, v);
  }
  for (const [k, v] of from.branches) bump(into.branches, k, v.hits, v.line);
  for (const [k, v] of from.functions) bump(into.functions, k, v.hits, v.line);
  into.mtime = Math.max(into.mtime, mtime);
}

const pct = (covered, total) => (total === 0 ? 100 : Math.floor((covered / total) * 10000) / 100);
function metrics(rec) {
  const hit = (values) => [...values].filter((v) => (typeof v === "number" ? v : v.hits) > 0).length;
  const statements = rec.statements ?? rec.lines;
  const uncovered = new Set();
  for (const [l, h] of rec.lines) if (h === 0) uncovered.add(l);
  for (const v of rec.branches.values()) if (v.hits === 0 && v.line) uncovered.add(v.line);
  for (const v of rec.functions.values()) if (v.hits === 0 && v.line) uncovered.add(v.line);
  return {
    statements: pct(hit(statements.values()), statements.size),
    branches: pct(hit(rec.branches.values()), rec.branches.size),
    functions: pct(hit(rec.functions.values()), rec.functions.size),
    lines: pct(hit(rec.lines.values()), rec.lines.size),
    uncovered: [...uncovered].sort((a, b) => a - b),
  };
}

function ranges(nums) {
  const out = [];
  for (const n of nums) {
    const last = out.at(-1);
    if (last && n === last[1] + 1) last[1] = n;
    else out.push([n, n]);
  }
  return out.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(", ");
}

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
  const specFile = resolveSpec(root, args[0]);
  if (!specFile || !existsSync(specFile)) fail(`no spec matches "${args[0]}" in .specs/changes/ or .specs/finished/`);
  const fm = readFileSync(specFile, "utf8").match(/^---\n([\s\S]*?)\n---/);
  base = fm?.[1].match(/^base_commit:\s*["']?([0-9a-f]{4,40})/m)?.[1];
  if (!base) fail(`${relative(root, specFile)} has no base_commit (spec-execute adds it when execution starts)`);
  scope = `spec ${basename(dirname(specFile))}, changes since base_commit ${base}`;
} else {
  fail("usage: check-coverage.mjs <spec id | slug | path>  or  check-coverage.mjs --base <git ref>");
}
if (git(root, ["cat-file", "-e", `${base}^{commit}`]) === null) fail(`unknown commit "${base}"`);

const changed = [
  ...new Set([
    ...lines(git(root, ["diff", "--name-only", "--diff-filter=ACMR", base])),
    ...lines(git(root, ["ls-files", "--others", "--exclude-standard"])),
  ]),
]
  .map(toPosix)
  .filter((f) => SOURCE.test(f) && existsSync(join(root, f)))
  .sort();

const exclusions = projectExclusions(root);
const alwaysExcluded = [];
const projectExcluded = [];
const measured = [];
for (const f of changed) {
  const always = ALWAYS_EXCLUDED.find(([re]) => re.test(f));
  const project = exclusions.find((p) => p.re.test(f));
  if (always) alwaysExcluded.push(f);
  else if (project) projectExcluded.push(`${f} (${project.glob})`);
  else measured.push(f);
}

const coverage = new Map();
const reports = findReports(root);
for (const report of reports) {
  let entries = [];
  try {
    entries = report.endsWith(".json") ? parseIstanbul(report) : parseLcov(report);
  } catch {
    continue;
  }
  // Prefer the JSON report when a folder has both: lcov's branch numbering differs and would double count.
  if (report.endsWith("lcov.info") && existsSync(join(dirname(report), "coverage-final.json"))) continue;
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
const stale = [];
for (const f of measured) {
  const rec = lookup(f);
  if (!rec) {
    if (!hasRuntimeCode(root, f)) {
      typeOnly.push(f);
      continue;
    }
    const ws = workspaceOf(root, f);
    const wsHasReport = reportDirs.some((r) => ws === "." || r.startsWith(`${ws}/`));
    notMeasured.push({ f, why: wsHasReport ? "no test loads it" : `no coverage report in ${ws} — its tests didn't run with coverage, or it has no test runner yet` });
    continue;
  }
  const m = metrics(rec);
  const full = m.statements === 100 && m.branches === 100 && m.functions === 100 && m.lines === 100;
  rows.push({ f, m, full });
  if (statSync(join(root, f)).mtimeMs > rec.mtime) stale.push(f);
}

const below = rows.filter((r) => !r.full);
const failed = below.length + notMeasured.length;
const measuredCount = measured.length - typeOnly.length;
const out = [];
out.push(`scope: ${scope}`);
out.push(
  `source files changed: ${changed.length} — measured ${measuredCount}, type-only ${typeOnly.length}, ` +
    `excluded by technical-context ${projectExcluded.length}, always excluded (tests, declarations, tool config) ${alwaysExcluded.length}`,
);
out.push(`coverage reports found: ${reports.length ? reports.map((r) => toPosix(relative(root, r))).join(", ") : "none"}`);
if (!measuredCount) {
  out.push("COVERAGE OK — no source file to measure");
} else {
  out.push(failed ? `COVERAGE FAILED (${failed} file${failed > 1 ? "s" : ""} not at 100%)` : `COVERAGE OK — ${rows.length} file(s) at 100%`);
  for (const r of rows) {
    const { statements: s, branches: b, functions: fn, lines: l, uncovered } = r.m;
    out.push(
      `${r.full ? "✅" : "❌"} ${r.f} — stmts ${s}% · branches ${b}% · funcs ${fn}% · lines ${l}%` +
        (r.full ? "" : ` · uncovered lines: ${ranges(uncovered) || "?"}`),
    );
  }
  for (const { f, why } of notMeasured) out.push(`❌ ${f} — not measured: ${why}`);
}
if (projectExcluded.length) out.push(`excluded by technical-context: ${projectExcluded.join(", ")}`);
if (stale.length) {
  out.push(`warning: coverage reports are older than ${stale.join(", ")} — rerun the tests with coverage before trusting this`);
}
if (typeOnly.length) out.push(`type-only (no runtime code to cover): ${typeOnly.join(", ")}`);
if (!reports.length && measuredCount) out.push("hint: run each workspace's tests with coverage first (see technical-context → Automated validation)");
console.log(out.join("\n"));
process.exit(failed ? 1 : 0);
