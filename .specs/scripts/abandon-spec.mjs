#!/usr/bin/env node
// Abandons a spec that is no longer wanted: sets `status: abandoned` and `abandoned: <date>`, records the reason
// and how far the work got under a new `## Outcome` section, and moves the folder from .specs/changes/ to
// .specs/finished/<YYYYMMDDHHMMSS>-<NNN-slug>/ like a finished spec — with `git mv` when it is tracked. The memory
// and the source documents are not touched: they describe what is built, and nothing was. The id is never reused.
// spec-plan --abandon runs it; the spec's branch is kept (deleting it is the user's call).
//
// Usage: node .specs/scripts/abandon-spec.mjs [--check] <spec id | slug | path> --reason "<why>"
//   --check   report what would happen, change nothing
// Exit codes: 0 = abandoned (or --check passed), 1 = refused (status, or no reason), 2 = not found.

import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { AMENDABLE, findRoot, git, pad, parseSpec, readText, resolveSpec } from "./lib/spec.mjs";

const args = process.argv.slice(2);
const check = args.includes("--check");
const reasonAt = args.indexOf("--reason");
const reason = reasonAt !== -1 ? (args[reasonAt + 1] ?? "").trim() : "";
const arg = args.find((a, i) => !a.startsWith("--") && (reasonAt === -1 || i !== reasonAt + 1));

function stop(code, message) {
  console.log(message);
  process.exit(code);
}

const root = findRoot(arg && existsSync(resolve(arg)) ? dirname(resolve(arg)) : process.cwd());
if (!root) stop(2, "ABANDON FAILED\n- no .specs folder found in this directory or any parent. Run /spec-init.");
if (!arg) stop(2, 'ABANDON FAILED\n- usage: abandon-spec.mjs [--check] <spec id | slug | path> --reason "<why>"');
const specsDir = join(root, ".specs");
const specFile = resolveSpec(specsDir, arg);
if (!specFile) {
  stop(2, `ABANDON FAILED\n- no spec matches "${arg}" here. A spec under execution lives on its branch: switch to it (or bring its folder over) first.`);
}
const folder = basename(dirname(specFile));
if (relative(specsDir, specFile).startsWith("finished")) stop(1, `ABANDON REFUSED\n- .specs/finished/${folder} is already archived`);

const text = readText(specFile);
const spec = parseSpec(text);
const status = spec.fm?.status;
if (!AMENDABLE.has(status)) {
  stop(
    1,
    `ABANDON REFUSED\n- status is "${status ?? "missing"}": only a planned, in-progress or changes-requested spec can be abandoned` +
      (status === "in-review" ? " (review it first, or ask the user to reopen it with /spec-execute)" : "") +
      (status === "accepted" ? " (it was accepted: finish it with /spec-finish)" : ""),
  );
}
if (!reason) stop(1, 'ABANDON REFUSED\n- give the reason: --reason "<why the spec is no longer wanted>"');

const now = new Date();
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const target = `${stamp}-${folder}`;
const from = dirname(specFile);
const to = join(specsDir, "finished", target);
if (existsSync(to)) stop(2, `ABANDON FAILED\n- .specs/finished/${target} already exists`);

const p = spec.progress;
const branch = `spec/${folder}`;
const hasBranch = git(root, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]) !== null;
const outcome = [
  "## Outcome",
  "",
  `Abandoned on ${date} while ${status}: ${reason}`,
  "",
  `- Tasks: ${p.done} of ${p.total} done${p.blocked ? `, ${p.blocked} blocked` : ""}${p.removed ? `, ${p.removed} removed by amendments` : ""}.`,
  hasBranch || spec.fm?.base_commit
    ? `- Branch: \`${branch}\` is kept with whatever was built; deleting it is the user's call. Nothing reached the default branch.`
    : "- Branch: none — execution never started.",
  "- Memory and source documents: unchanged — they describe what is built.",
  "",
].join("\n");

let movedWith = "nothing (--check)";
if (!check) {
  const fmBlock = text.match(/^---\n([\s\S]*?)\n---/);
  let fm = fmBlock[1].replace(/^status:.*$/m, "status: abandoned");
  fm = /^abandoned:.*$/m.test(fm) ? fm.replace(/^abandoned:.*$/m, `abandoned: ${date}`) : `${fm}\nabandoned: ${date}`;
  let body = text.replace(fmBlock[0], `---\n${fm}\n---`).replace(/\n*$/, "\n");
  body = /^## Outcome\s*$/m.test(body) ? body.replace(/^## Outcome\s*$/m, outcome.trimEnd()) : `${body}\n${outcome}`;
  writeFileSync(specFile, body);

  mkdirSync(join(specsDir, "finished"), { recursive: true });
  const tracked = git(root, ["ls-files", "--error-unmatch", relative(root, specFile)]) !== null;
  if (tracked && git(root, ["mv", relative(root, from), relative(root, to)]) !== null) {
    git(root, ["add", "--", relative(root, to)]); // the new front matter and Outcome, staged with the move
    movedWith = "git mv";
  } else {
    renameSync(from, to);
    movedWith = "rename (the folder wasn't tracked by git yet)";
  }
}

console.log(
  [
    `spec: .specs/changes/${folder} (${status}) — ${spec.fm?.title ?? "?"}`,
    `${check ? "would abandon" : "abandoned"} → .specs/finished/${target}`,
    `front matter: status: abandoned · abandoned: ${date}${check ? " (not written)" : ""}`,
    `outcome: ${reason}`,
    `tasks: ${p.done}/${p.total} done · branch ${hasBranch ? `${branch} kept` : "none"}`,
    `moved with: ${movedWith}`,
  ].join("\n"),
);
