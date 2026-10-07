#!/usr/bin/env node
// Preflight for spec-plan: checks that the project memory is filled in and reports the next spec id.
// Usage: node preflight.mjs [repo-root]   (defaults to the nearest ancestor of cwd that has a .specs folder)
// Also checks the optional memory files (structure.md, modules.md, modules/*.md) for template leftovers, and that
// modules.md and modules/*.md link to each other, that every document in product.md → Source documents exists,
// and (as warnings) that the relative links of the memory files point to files and headings that exist. The next spec id accounts for spec branches (NNN-slug) too,
// so a spec that only exists on its branch doesn't get its number reused.
// Exit codes: 0 = ready, 1 = memory missing, not filled in or inconsistent, 2 = no .specs folder.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { checkLinks, findRoot, nextSpecId, sourceDocuments, specFolders, statusOf } from "./lib/spec.mjs";

// Sections that must exist with real content. Keep in sync with the "Required by spec-plan" notes in
// .specs/templates/product-model.md and .specs/templates/technical-context-model.md.
const REQUIRED = {
  "product.md": ["In one sentence", "For whom", "Domain concepts"],
  "technical-context.md": ["Applications", "Architecture", "Fixed conventions", "Automated validation"],
};

const TEMPLATE_MARKERS = [
  /\{\{[^}]+\}\}/, // unreplaced placeholder
  /Before using it, replace the placeholders/i, // template instructions left in
];

// A body line that carries no information.
const FILLER = /^(?:[-*]\s*)?(?:todo|tbd|tbc|to be defined|lorem ipsum.*|\.\.\.|…|n\/a|-)?\s*\.?$/i;

function sections(markdown) {
  const out = new Map();
  let current = null;
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const h2 = !inFence && line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      current = h2[1];
      out.set(current, []);
    } else if (current) {
      out.get(current).push(line);
    }
  }
  return out;
}

function meaningfulLines(lines) {
  return lines.filter((l) => {
    const t = l.trim();
    if (!t || t.startsWith(">") || t.startsWith("#") || /^```/.test(t)) return false;
    return !FILLER.test(t);
  });
}

function checkMemoryFile(memoryDir, file) {
  const path = join(memoryDir, file);
  const problems = [];
  if (!existsSync(path)) return [`missing: .specs/memory/${file} does not exist`];
  const text = readFileSync(path, "utf8");
  if (!text.trim()) return [`empty: .specs/memory/${file} has no content`];

  // Code may legitimately contain {{...}} (e.g. prompt markers), so only scan prose.
  const prose = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  for (const marker of TEMPLATE_MARKERS) {
    const m = prose.match(marker);
    if (m) problems.push(`template leftovers in .specs/memory/${file}: "${m[0].slice(0, 60)}"`);
  }

  const secs = sections(text);
  for (const name of REQUIRED[file]) {
    const key = [...secs.keys()].find((k) => k.toLowerCase().startsWith(name.toLowerCase()));
    if (!key) {
      problems.push(`missing section in .specs/memory/${file}: "## ${name}"`);
      continue;
    }
    const body = meaningfulLines(secs.get(key));
    const chars = body.join(" ").replace(/\s+/g, " ").length;
    if (body.length === 0 || chars < 40) {
      problems.push(`section "## ${key}" in .specs/memory/${file} is empty or too thin to plan from`);
    }
  }
  return problems;
}

// Optional memory files: when present, they must be free of template leftovers, and the module index and the
// module files must point to each other.
function checkOptionalMemory(memoryDir) {
  const problems = [];
  const moduleDir = join(memoryDir, "modules");
  const moduleFiles = existsSync(moduleDir)
    ? readdirSync(moduleDir).filter((n) => n.endsWith(".md")).sort()
    : [];
  const files = ["structure.md", "modules.md", ...moduleFiles.map((n) => `modules/${n}`)];
  for (const file of files) {
    const path = join(memoryDir, file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    const prose = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
    for (const marker of TEMPLATE_MARKERS) {
      const m = prose.match(marker);
      if (m) problems.push(`template leftovers in .specs/memory/${file}: "${m[0].slice(0, 60)}"`);
    }
    if (/^> Template for/m.test(text)) problems.push(`template instructions left in .specs/memory/${file}`);
  }
  const index = join(memoryDir, "modules.md");
  if (existsSync(index)) {
    const text = readFileSync(index, "utf8");
    const linked = new Set([...text.matchAll(/\]\((?:\.\.\/memory\/)?modules\/([\w.-]+\.md)\)/g)].map((m) => m[1]));
    for (const n of linked) {
      if (!moduleFiles.includes(n)) problems.push(`modules.md links modules/${n}, which doesn't exist`);
    }
    for (const n of moduleFiles) {
      if (!linked.has(n)) problems.push(`.specs/memory/modules/${n} isn't linked from modules.md`);
    }
  } else if (moduleFiles.length) {
    problems.push("there are files in .specs/memory/modules/ but no .specs/memory/modules.md indexing them");
  }
  return problems;
}

const root = findRoot(process.argv[2] ?? process.cwd());
if (!root) {
  console.log(
    "PREFLIGHT FAILED\n- no .specs folder found in this directory or any parent.\n" +
      "Fix: run /spec-init — it creates .specs/ and writes the project memory.",
  );
  process.exit(2);
}

const specs = join(root, ".specs");
const problems = [
  ...Object.keys(REQUIRED).flatMap((f) => checkMemoryFile(join(specs, "memory"), f)),
  ...checkOptionalMemory(join(specs, "memory")),
];

// Source documents: every spec links their sections, so a missing one breaks every spec that comes after it.
for (const doc of sourceDocuments(root)) {
  if (!existsSync(join(root, doc))) problems.push(`product.md → Source documents lists ${doc}, which doesn't exist`);
}

// Links in the memory files: a broken one is a warning — the memory still plans fine, but a reader loses detail.
const warnings = [];
const memoryDir = join(specs, "memory");
const moduleNotes = existsSync(join(memoryDir, "modules"))
  ? readdirSync(join(memoryDir, "modules")).filter((n) => n.endsWith(".md")).map((n) => `modules/${n}`)
  : [];
const memoryFiles = ["product.md", "technical-context.md", "structure.md", "modules.md", ...moduleNotes].filter((f) =>
  existsSync(join(memoryDir, f)),
);
for (const f of memoryFiles) {
  for (const link of checkLinks(join(memoryDir, f), readFileSync(join(memoryDir, f), "utf8").replace(/\r\n/g, "\n"))) {
    warnings.push(`broken link in .specs/memory/${f}:${link.line} "${link.target}": ${link.problem}`);
  }
}
const printWarnings = () => {
  if (warnings.length) console.log(["warnings:", ...warnings.map((w) => `- ${w}`)].join("\n"));
};

const folders = specFolders(specs);
const changes = folders.filter((f) => f.area === "changes");
const finished = folders.filter((f) => f.area === "finished");
const nextId = nextSpecId(root);

console.log(`repo root: ${root}`);
if (problems.length) {
  console.log("PREFLIGHT FAILED");
  for (const p of problems) console.log(`- ${p}`);
  printWarnings();
  console.log(
    "Fix: run /spec-init for product.md and technical-context.md (or fill them by hand from .specs/templates/); " +
      "fix the other memory files by hand or with /spec-finish.",
  );
  process.exit(1);
}

console.log("PREFLIGHT OK");
printWarnings();
console.log(`next spec id: ${nextId}`);
console.log(`active specs (${changes.length}):`);
for (const s of changes) console.log(`- ${s.name} [${statusOf(s.file)}]`);
console.log(`finished specs: ${finished.length}`);
console.log("specs under execution live on their branches: node .specs/scripts/status.mjs shows the whole board");
