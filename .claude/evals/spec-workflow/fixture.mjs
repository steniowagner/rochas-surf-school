// Builds the fixture repositories the spec skills' evals run in: a tiny npm-workspaces monorepo (a calculator
// library tested with Vitest), the spec framework installed from spec-init's bundle, filled-in memory, a source
// document, a local bare `origin`, and the spec skills of this repository. Each stage adds a spec at a point of
// its lifecycle.
//
//   base             memory and docs only — for spec-plan and spec-status
//   planned          + a planned three-task spec 001-arithmetic (uncommitted, as spec-plan leaves it)
//   in-review-buggy  + spec 001-subtract executed on its branch, in-review, with a planted bug (subtract(3, 5)
//                      returns 2, which ER-01 forbids) and an untested branch (the type check)
//   accepted         + spec 001-subtract executed correctly, reviewed and accepted
//   board            + spec 001 accepted on its branch, spec 002 planned, and a spec/009-orphan branch

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const STAGES = ["base", "planned", "in-review-buggy", "accepted", "board"];
const SPEC_SKILLS = ["spec-init", "spec-plan", "spec-execute", "spec-review", "spec-finish", "spec-status"];

const write = (dir, path, text) => {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), text);
};
const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const commitAll = (dir, message) => {
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", message);
  return git(dir, "rev-parse", "HEAD");
};
const setFm = (text, key, value) =>
  new RegExp(`^${key}:.*$`, "m").test(text)
    ? text.replace(new RegExp(`^${key}:.*$`, "m"), `${key}: ${value}`)
    : text.replace(/\n---\n/, `\n${key}: ${value}\n---\n`);

const PRODUCT = `# Product — "Calc"

## In one sentence

**"Calc"** is a tiny calculator library that developers import to do arithmetic on two numbers without writing the helpers themselves.

## For whom

Developers who need arithmetic helpers in their scripts. There is no user data: the library is stateless.

## Domain concepts

- **Operation** (\`operation\`): a pure function that takes two numbers and returns one. Key fields: the two operands. No limits beyond JavaScript numbers.

## Current state

Only addition exists (\`add\`). There are no specs yet.

## Out of scope (future evolution, recorded in the specs)

Division and operations on more than two numbers.

## Source documents

- \`.docs/requirements.md\` — the detailed requirements, one section per operation.
`;

const TECH = `# Global Technical Context

## Repository

npm workspaces (\`packages/*\`), Node 24, ESM JavaScript, no build step.

## Applications

- **\`packages/calc\`** — plain ESM JavaScript library (\`@fx/calc\`), no build step. Tests with Vitest (\`*.test.js\` next to the source).

## Architecture

Single library package: every operation lives in its own file in \`packages/calc/src\`, exported by name, with no dependency on other operations. \`packages/calc/src/index.js\` doesn't exist: consumers import each file.

## Fixed conventions

- **ESM only**: every package has \`"type": "module"\`, because the consumers are ESM scripts.
- **Naming**: one file per operation, kebab-case, named after the operation (\`add.js\`, \`add.test.js\`).
- **Inputs are numbers**: an operation throws \`TypeError("operands must be numbers")\` when an operand isn't a number, because silent coercion hid bugs in the past.

## Automated validation

Unit tests with Vitest in \`packages/calc\`, run on the change with \`node .specs/scripts/run-related-tests.mjs <id>\`. There is no UI, so nothing is validated manually, and there are no e2e suites.

### Coverage

Every changed line covered. No exclusions.

\`\`\`coverage-exclude
\`\`\`
`;

const REQUIREMENTS = `# Requirements

## Operations

### Adding numbers

\`add(a, b)\` returns the sum of two numbers.

### Subtracting numbers

\`subtract(a, b)\` returns \`a - b\`: the second number subtracted from the first. Negative results are allowed.

### Multiplying numbers

\`multiply(a, b)\` returns the product of two numbers. Multiplying by zero returns \`0\`.

## Errors

Every operation throws \`TypeError("operands must be numbers")\` when an operand isn't a number.
`;

function spec({ id, slug, title, tasks, ers, extra = "" }) {
  return `---
id: "${id}"
slug: ${slug}
title: ${title}
status: planned
created: 2026-10-06
fronts: [calc]
depends_on: []
---

# ${id} — ${title}

## Goal

${extra || `Developers can ${title.toLowerCase()} with the calc library, as the requirements describe.`}

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: Operation.
- Requirements: ${ers.map((e) => `[requirements.md → ${e.section}](../../../.docs/requirements.md#${e.anchor})`).join(", ")}.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Architecture, Fixed conventions.

## Scope

### In scope

${ers.map((e) => `- ${e.scope}`).join("\n")}

### Out of scope

- Division.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Each operation lives in its own file and throws \`TypeError("operands must be numbers")\` for non-numbers. | The fixed conventions in technical-context.md. |

## Expected Results

${ers
  .map(
    (e, i) => `### ER-0${i + 1} — ${e.title}

- **Front:** calc
- **Behavior:** ${e.behavior}
- **Edge and error cases:** ${e.edges}
- **Verify by:** \`npx vitest run src/${e.file}.test.js\` (from \`packages/calc\`).
`,
  )
  .join("\n")}
## Tasks

### Calc (\`packages/calc\`)

${tasks}

### Verification

- [ ] **T-0${ers.length + 1}** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.

## Verification Plan

- Automated:
  - \`node .specs/scripts/run-related-tests.mjs ${id}\` — the related tests pass, with coverage.
  - \`node .specs/scripts/check-coverage.mjs ${id}\` — every changed line is covered.

## Memory Impact

- \`memory/product.md\` — Current state: ${ers.map((e) => `\`${e.file}\``).join(" and ")} exist.

## References

- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
`;
}

const SUBTRACT = {
  section: "Subtracting numbers",
  anchor: "subtracting-numbers",
  scope: "A `subtract` operation in `packages/calc/src/subtract.js`.",
  title: "Subtracts the second number from the first",
  behavior: "Given `a = 5` and `b = 3`, when a developer calls `subtract(5, 3)`, then it returns `2`.",
  edges: '`subtract(3, 5)` returns `-2`; `subtract("5", 3)` throws `TypeError("operands must be numbers")`.',
  file: "subtract",
};
const MULTIPLY = {
  section: "Multiplying numbers",
  anchor: "multiplying-numbers",
  scope: "A `multiply` operation in `packages/calc/src/multiply.js`.",
  title: "Multiplies two numbers",
  behavior: "Given `a = 4` and `b = 3`, when a developer calls `multiply(4, 3)`, then it returns `12`.",
  edges: '`multiply(7, 0)` returns `0`; `multiply(2, null)` throws `TypeError("operands must be numbers")`.',
  file: "multiply",
};
const task = (n, e) => `- [ ] **T-0${n}** — Add \`packages/calc/src/${e.file}.js\` and its test \`${e.file}.test.js\`, covering the behavior,
  the edge cases and the TypeError of ER-0${n}. Covers: ER-0${n} · Done when: \`npx vitest run src/${e.file}.test.js\` passes.`;

export const SUBTRACT_SPEC = spec({ id: "001", slug: "subtract", title: "Subtract two numbers", ers: [SUBTRACT], tasks: task(1, SUBTRACT) });
export const ARITHMETIC_SPEC = spec({
  id: "001",
  slug: "arithmetic",
  title: "Subtract and multiply two numbers",
  ers: [SUBTRACT, MULTIPLY],
  tasks: `${task(1, SUBTRACT)}\n\n${task(2, MULTIPLY)}`,
});

const GOOD_SUBTRACT = `export function subtract(a, b) {
  if (typeof a !== "number" || typeof b !== "number") throw new TypeError("operands must be numbers");
  return a - b;
}
`;
const GOOD_SUBTRACT_TEST = `import { expect, test } from "vitest";
import { subtract } from "./subtract.js";

test("subtracts the second number from the first", () => {
  expect(subtract(5, 3)).toBe(2);
  expect(subtract(3, 5)).toBe(-2);
});

test("rejects operands that aren't numbers", () => {
  expect(() => subtract("5", 3)).toThrow(new TypeError("operands must be numbers"));
});
`;
// The planted bug: Math.abs makes subtract(3, 5) return 2 instead of -2. The type check is never tested.
const BUGGY_SUBTRACT = `export function subtract(a, b) {
  if (typeof a !== "number" || typeof b !== "number") throw new TypeError("operands must be numbers");
  return Math.abs(a - b);
}
`;
const BUGGY_SUBTRACT_TEST = `import { expect, test } from "vitest";
import { subtract } from "./subtract.js";

test("subtracts the second number from the first", () => {
  expect(subtract(5, 3)).toBe(2);
});
`;

// Runs spec 001-subtract through execution (and review, when accepted) on its branch.
function execute(dir, { buggy, accept }) {
  const file = ".specs/changes/001-subtract/spec.md";
  write(dir, file, SUBTRACT_SPEC);
  git(dir, "switch", "-qc", "spec/001-subtract");
  const base = git(dir, "rev-parse", "HEAD");
  let text = setFm(setFm(setFm(SUBTRACT_SPEC, "status", "in-progress"), "started", "2026-10-06"), "base_commit", base);
  write(dir, file, text);
  commitAll(dir, "docs(spec-001): start subtract");

  write(dir, "packages/calc/src/subtract.js", buggy ? BUGGY_SUBTRACT : GOOD_SUBTRACT);
  write(dir, "packages/calc/src/subtract.test.js", buggy ? BUGGY_SUBTRACT_TEST : GOOD_SUBTRACT_TEST);
  text = text
    .replace("- [ ] **T-01**", "- [x] **T-01**")
    .replace(
      "passes.\n\n### Verification",
      "passes.\n  > ✅ 2026-10-06 10:00 — added subtract with its test; files: `packages/calc/src/subtract.js`,\n  > `packages/calc/src/subtract.test.js`; verified: `npx vitest run src/subtract.test.js` (passed); deviations: none\n\n### Verification",
    );
  write(dir, file, text);
  commitAll(dir, "feat(spec-001): add subtract (T-01)");

  text = text
    .replace("- [ ] **T-02**", "- [x] **T-02**")
    .replace("every command exits 0.\n", "every command exits 0.\n  > ✅ 2026-10-06 10:10 — related tests passed; coverage OK; deviations: none\n");
  text = setFm(text, "status", "in-review");
  write(dir, file, text);
  const reviewed = commitAll(dir, "docs(spec-001): ready for review");

  if (accept) {
    text = setFm(setFm(text, "status", "accepted"), "reviewed_commit", reviewed);
    text = `${text.trimEnd()}\n\n### Round 1 — 2026-10-06 — accepted\n\n**Checks**\n\n- related tests ✅ 2 passed (packages/calc)\n- coverage of the changed lines ✅\n\n**Expected Results**\n\n- ER-01 ✅ — \`subtract(5, 3)\` is 2, \`subtract(3, 5)\` is -2, a string operand throws the TypeError\n`;
    write(dir, file, text);
    commitAll(dir, "docs(spec-001): review round 1 — accepted");
  }
}

// Builds a fixture at `stage` and returns its directory.
export function buildFixture(stage, dir = mkdtempSync(join(tmpdir(), `spec-eval-${stage}-`))) {
  if (!STAGES.includes(stage)) throw new Error(`unknown stage "${stage}" (${STAGES.join(", ")})`);
  mkdirSync(dir, { recursive: true });
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "user.email", "eval@example.com");
  git(dir, "config", "user.name", "eval");
  write(dir, "package.json", '{ "name": "fx", "private": true, "type": "module", "workspaces": ["packages/*"] }\n');
  write(dir, "packages/calc/package.json", '{ "name": "@fx/calc", "private": true, "type": "module", "scripts": { "test": "vitest run" }, "devDependencies": { "vitest": "*" } }\n');
  write(dir, "packages/calc/src/add.js", 'export function add(a, b) {\n  if (typeof a !== "number" || typeof b !== "number") throw new TypeError("operands must be numbers");\n  return a + b;\n}\n');
  write(dir, "packages/calc/src/add.test.js", 'import { expect, test } from "vitest";\nimport { add } from "./add.js";\n\ntest("adds", () => expect(add(2, 3)).toBe(5));\ntest("rejects non-numbers", () => expect(() => add("2", 3)).toThrow(TypeError));\n');
  write(dir, ".docs/requirements.md", REQUIREMENTS);
  write(dir, ".gitignore", "node_modules\ncoverage\n");
  write(dir, "CLAUDE.md", "# CLAUDE.md\n\nA calculator library in an npm-workspaces monorepo. Specs live in `.specs/`; see `.specs/shared/spec-lifecycle.md`.\n");
  // The repository's node_modules provide Vitest and its coverage provider.
  symlinkSync(join(REPO, "node_modules"), join(dir, "node_modules"));
  for (const skill of SPEC_SKILLS) cpSync(join(REPO, ".claude/skills", skill), join(dir, ".claude/skills", skill), { recursive: true });
  commitAll(dir, "chore: calculator library");

  execFileSync(process.execPath, [join(REPO, ".claude/skills/spec-init/scripts/scaffold-specs.mjs"), dir], { stdio: "ignore" });
  write(dir, ".specs/memory/product.md", PRODUCT);
  write(dir, ".specs/memory/technical-context.md", TECH);
  commitAll(dir, "docs: spec framework and project memory");

  const remote = `${dir}.origin.git`;
  if (!existsSync(remote)) execFileSync("git", ["init", "-q", "--bare", remote]);
  git(dir, "remote", "add", "origin", remote);
  git(dir, "push", "-q", "origin", "main");

  if (stage === "planned") write(dir, ".specs/changes/001-arithmetic/spec.md", ARITHMETIC_SPEC);
  if (stage === "in-review-buggy") execute(dir, { buggy: true, accept: false });
  if (stage === "accepted") execute(dir, { buggy: false, accept: true });
  if (stage === "board") {
    execute(dir, { buggy: false, accept: true });
    git(dir, "switch", "-q", "main");
    git(dir, "branch", "spec/009-orphan");
    write(
      dir,
      ".specs/changes/002-multiply/spec.md",
      spec({ id: "002", slug: "multiply", title: "Multiply two numbers", ers: [MULTIPLY], tasks: task(1, MULTIPLY) }),
    );
  }
  return dir;
}

export const read = (dir, path) => (existsSync(join(dir, path)) ? readFileSync(join(dir, path), "utf8") : null);
export { git };

// node fixture.mjs <stage> [dir] — build one by hand, to look around or debug a check.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(buildFixture(process.argv[2] ?? "base", process.argv[3]));
}
