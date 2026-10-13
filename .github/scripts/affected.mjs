#!/usr/bin/env node
// Decides which CI test jobs a change needs, from Turbo's dependency graph (`turbo ls --affected`)
// and the files the change touched. Prints the jobs as JSON and, inside GitHub Actions, appends them
// to $GITHUB_OUTPUT.
//
//   node .github/scripts/affected.mjs [--base <ref>]
//
// The base is `--base`, else $TURBO_SCM_BASE, else the event's: the pull request's base branch, or the
// commit a push started from. When none can be resolved every job runs.

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const JOBS = ["backend", "web", "mobile", "domain"];
const DOCUMENTATION = [".specs/", ".docs/"];
const ROOT_FILES = ["package.json", "package-lock.json", "turbo.json"];
const NULL_SHA = /^0+$/;

const everything = () => ({ backend: true, web: true, mobile: true, domain: true, all: true });

/**
 * @param {{ changedFiles: string[], affected: { path: string, hasTest: boolean }[] }} change
 *   `affected` holds the workspaces Turbo reports (a changed workspace and every one that depends on it).
 * @returns {{ backend: boolean, web: boolean, mobile: boolean, domain: boolean, all: boolean }}
 *   `all` is true when a root-level change makes every suite run, `domain` ones included.
 */
export function computeJobs({ changedFiles, affected }) {
  const relevant = changedFiles.filter((file) => !DOCUMENTATION.some((prefix) => file.startsWith(prefix)));

  if (relevant.length === 0) {
    return { backend: false, web: false, mobile: false, domain: false, all: false };
  }

  if (relevant.some((file) => file.startsWith(".github/") || ROOT_FILES.includes(file))) {
    return everything();
  }

  const paths = affected.map((workspace) => workspace.path);

  return {
    backend: paths.includes("apps/backend"),
    web: paths.includes("apps/web"),
    mobile: paths.includes("apps/mobile"),
    domain: affected.some(
      (workspace) =>
        (workspace.path.startsWith("modules/") || workspace.path.startsWith("packages/")) && workspace.hasTest,
    ),
    all: false,
  };
}

/** Turbo prints a banner line before its JSON. */
export function parseTurboList(stdout) {
  const start = stdout.indexOf("{");

  if (start === -1) {
    throw new Error(`turbo ls printed no JSON: ${stdout}`);
  }

  return JSON.parse(stdout.slice(start)).packages.items.map((item) => item.path);
}

/** The commit or ref the change is compared with, or undefined when nothing says. */
export function resolveBase({ args, env, readEvent }) {
  const flag = args.indexOf("--base");

  if (flag !== -1 && args[flag + 1]) {
    return args[flag + 1];
  }

  if (env.TURBO_SCM_BASE) {
    return env.TURBO_SCM_BASE;
  }

  if (env.GITHUB_BASE_REF) {
    return `origin/${env.GITHUB_BASE_REF}`;
  }

  const before = readEvent()?.before;

  return before && !NULL_SHA.test(before) ? before : undefined;
}

const run = (command, args, env = process.env) =>
  execFileSync(command, args, { encoding: "utf8", env, stdio: ["ignore", "pipe", "inherit"] });

const hasTestScript = (path) => {
  const file = `${path}/package.json`;

  return existsSync(file) && Boolean(JSON.parse(readFileSync(file, "utf8")).scripts?.test);
};

function main() {
  const base = resolveBase({
    args: process.argv.slice(2),
    env: process.env,
    readEvent: () => (process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")) : undefined),
  });

  let jobs;

  if (base === undefined) {
    jobs = everything();
  } else {
    const changedFiles = run("git", ["diff", "--name-only", `${base}...HEAD`]).split("\n").filter(Boolean);
    const paths = parseTurboList(
      run("npx", ["turbo", "ls", "--affected", "--output=json"], { ...process.env, TURBO_SCM_BASE: base, TURBO_SCM_HEAD: "HEAD" }),
    );

    jobs = computeJobs({
      changedFiles,
      affected: paths.map((path) => ({ path, hasTest: hasTestScript(path) })),
    });
  }

  console.log(JSON.stringify(jobs));

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, [...JOBS, "all"].map((key) => `${key}=${jobs[key]}\n`).join(""));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
