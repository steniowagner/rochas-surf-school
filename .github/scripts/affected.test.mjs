import assert from "node:assert/strict";
import { test } from "node:test";

import { computeJobs, formatOutput, parseTurboList, resolveBase } from "./affected.mjs";

const ws = (path, hasTest = true) => ({ path, hasTest });
const APPS = [ws("apps/backend"), ws("apps/web"), ws("apps/mobile")];
const NONE = { backend: false, web: false, mobile: false, domain: false, all: false };

test("only apps/mobile changes need the mobile job", () => {
  const jobs = computeJobs({ changedFiles: ["apps/mobile/src/app/index.tsx"], affected: [ws("apps/mobile")] });

  assert.deepEqual(jobs, { ...NONE, mobile: true });
});

test("only apps/web changes need the web job", () => {
  const jobs = computeJobs({ changedFiles: ["apps/web/src/proxy.ts"], affected: [ws("apps/web")] });

  assert.deepEqual(jobs, { ...NONE, web: true });
});

test("only apps/backend changes need the backend job", () => {
  const jobs = computeJobs({ changedFiles: ["apps/backend/src/main.ts"], affected: [ws("apps/backend")] });

  assert.deepEqual(jobs, { ...NONE, backend: true });
});

test("packages/shared changes need all four jobs", () => {
  const jobs = computeJobs({
    changedFiles: ["packages/shared/src/index.ts"],
    affected: [
      ws("packages/shared"),
      ws("modules/auth"),
      ws("modules/notifications"),
      ws("modules/school-rules"),
      ws("modules/school-settings"),
      ...APPS,
    ],
  });

  assert.deepEqual(jobs, { backend: true, web: true, mobile: true, domain: true, all: false });
});

test("modules/auth changes need backend, mobile and domain", () => {
  const jobs = computeJobs({
    changedFiles: ["modules/auth/src/identity/model/identity.entity.ts"],
    affected: [ws("modules/auth"), ws("modules/school-rules"), ws("apps/backend"), ws("apps/mobile")],
  });

  assert.deepEqual(jobs, { backend: true, web: false, mobile: true, domain: true, all: false });
});

test("packages/design-tokens changes need web and mobile only", () => {
  const jobs = computeJobs({
    changedFiles: ["packages/design-tokens/src/tokens.ts"],
    affected: [ws("packages/design-tokens", false), ws("apps/web"), ws("apps/mobile")],
  });

  assert.deepEqual(jobs, { ...NONE, web: true, mobile: true });
});

for (const file of [".github/workflows/ci.yml", ".github/scripts/affected.mjs", "package.json", "package-lock.json", "turbo.json"]) {
  test(`${file} needs every job, domain without --affected`, () => {
    const jobs = computeJobs({ changedFiles: [file], affected: [] });

    assert.deepEqual(jobs, { backend: true, web: true, mobile: true, domain: true, all: true });
  });
}

test("only .specs and .docs changes need no job, whatever Turbo reports", () => {
  const jobs = computeJobs({
    changedFiles: [".specs/changes/025-ci-tests/spec.md", ".docs/requirements.md"],
    affected: APPS,
  });

  assert.deepEqual(jobs, NONE);
});

test("documentation next to an app change does not hide the app", () => {
  const jobs = computeJobs({
    changedFiles: [".specs/memory/structure.md", "apps/web/src/proxy.ts"],
    affected: [ws("apps/web")],
  });

  assert.deepEqual(jobs, { ...NONE, web: true });
});

test("an empty change set needs no job", () => {
  assert.deepEqual(computeJobs({ changedFiles: [], affected: [] }), NONE);
});

test("a workspace without a test script does not need the domain job", () => {
  const jobs = computeJobs({ changedFiles: ["packages/eslint-config/index.js"], affected: [ws("packages/eslint-config", false)] });

  assert.deepEqual(jobs, NONE);
});

test("parseTurboList skips the banner and returns the workspace paths", () => {
  const stdout = '• turbo 2.11.7\n{"packages":{"count":1,"items":[{"name":"@x/web","path":"apps/web"}]}}';

  assert.deepEqual(parseTurboList(stdout), ["apps/web"]);
});

test("parseTurboList fails when turbo printed no JSON", () => {
  assert.throws(() => parseTurboList("turbo: command failed"), /no JSON/);
});

test("resolveBase prefers --base, then TURBO_SCM_BASE, then the pull request base, then the push's before", () => {
  const readEvent = () => ({ before: "abc123" });

  assert.equal(resolveBase({ args: ["--base", "HEAD~1"], env: { TURBO_SCM_BASE: "x" }, readEvent }), "HEAD~1");
  assert.equal(resolveBase({ args: [], env: { TURBO_SCM_BASE: "x", GITHUB_BASE_REF: "main" }, readEvent }), "x");
  assert.equal(resolveBase({ args: [], env: { GITHUB_BASE_REF: "main" }, readEvent }), "origin/main");
  assert.equal(resolveBase({ args: [], env: {}, readEvent }), "abc123");
});

test("resolveBase finds nothing for a new branch push or without an event", () => {
  assert.equal(resolveBase({ args: [], env: {}, readEvent: () => ({ before: "0000000000000000000000000000000000000000" }) }), undefined);
  assert.equal(resolveBase({ args: [], env: {}, readEvent: () => undefined }), undefined);
});

test("formatOutput carries the jobs, all and the base to stdout and $GITHUB_OUTPUT", () => {
  const { json, githubOutput } = formatOutput({ ...NONE, web: true }, "origin/main");

  assert.deepEqual(JSON.parse(json), { ...NONE, web: true, base: "origin/main" });
  assert.equal(
    githubOutput,
    "backend=false\nweb=true\nmobile=false\ndomain=false\nall=false\nbase=origin/main\n",
  );
});

test("formatOutput leaves the base empty when none was resolved", () => {
  assert.match(formatOutput({ ...NONE, all: true }, undefined).githubOutput, /base=\n$/);
});
