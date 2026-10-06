#!/usr/bin/env node
// Read-only inventory of a repository's technical stack, used by spec-init before the technical interview.
// Usage: node detect-stack.mjs [repo-root]   (defaults to the current directory)
//
// It prints facts and the files they come from; deciding what they mean is the agent's job. Versions are the
// installed ones (from node_modules) when available, otherwise the declared range. It never opens .env files,
// and from example env files it prints variable NAMES only, never values.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix, relative, resolve } from "node:path";

const root = resolve(process.argv[2] ?? process.cwd());

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "out", ".next", ".turbo", ".expo", ".vercel", "coverage",
  "generated", "Pods", ".gradle", "DerivedData", "target", "vendor", ".venv", "venv", "__pycache__",
]);

// Called out first in each workspace: frameworks, data, auth, validation, testing, tooling, integrations.
const KEY_PACKAGES = new Set([
  "next", "react", "react-dom", "vue", "nuxt", "svelte", "@sveltejs/kit", "@angular/core", "astro",
  "@remix-run/react", "solid-js", "vite", "electron",
  "expo", "react-native", "expo-router", "@react-navigation/native", "nativewind",
  "express", "fastify", "koa", "hono", "graphql", "@apollo/server", "socket.io",
  "prisma", "typeorm", "drizzle-orm", "mongoose", "sequelize", "knex", "pg", "mysql2", "mongodb",
  "redis", "ioredis", "bullmq", "firebase", "firebase-admin",
  "next-auth", "better-auth", "passport", "jsonwebtoken", "bcrypt", "argon2",
  "tailwindcss", "styled-components", "@emotion/react", "@mui/material",
  "zod", "yup", "joi", "class-validator", "react-hook-form", "zustand", "@reduxjs/toolkit", "swr", "axios",
  "vitest", "jest", "playwright", "@playwright/test", "cypress", "detox", "supertest", "msw",
  "typescript", "eslint", "prettier", "@biomejs/biome", "turbo", "nx",
  "stripe", "nodemailer", "resend", "@sendgrid/mail", "twilio", "openai", "@anthropic-ai/sdk",
  "expo-notifications",
]);
const KEY_PREFIXES = [
  "@nestjs/", "@prisma/", "@trpc/", "@tanstack/", "@testing-library/", "@sentry/", "@aws-sdk/",
  "@supabase/", "@clerk/", "@auth/", "@react-native-firebase/",
];

// First match wins, so a framework comes before the libraries it builds on.
const APP_KINDS = [
  ["next", "Next.js app"], ["nuxt", "Nuxt app"], ["@sveltejs/kit", "SvelteKit app"], ["astro", "Astro site"],
  ["@remix-run/react", "Remix app"], ["@angular/core", "Angular app"], ["expo", "Expo (React Native) app"],
  ["react-native", "React Native app"], ["electron", "Electron app"], ["@nestjs/core", "NestJS app"],
  ["fastify", "Fastify server"], ["hono", "Hono server"], ["express", "Express server"], ["koa", "Koa server"],
  ["vue", "Vue app"], ["svelte", "Svelte app"], ["vite", "Vite app"],
];

const ENV_EXAMPLES = new Set([
  ".env.example", ".env.sample", ".env.template", ".env.local.example", ".env.example.local", "example.env",
]);
const OTHER_MANIFESTS = new Set([
  "pyproject.toml", "requirements.txt", "Pipfile", "go.mod", "Cargo.toml", "Gemfile", "pom.xml",
  "build.gradle", "build.gradle.kts", "composer.json", "mix.exs", "pubspec.yaml", "Package.swift",
]);
const CI_FILES = new Set([
  ".gitlab-ci.yml", "bitbucket-pipelines.yml", "azure-pipelines.yml", "Jenkinsfile", ".circleci/config.yml",
]);
const DEPLOY_FILES = new Set([
  "vercel.json", "netlify.toml", "fly.toml", "render.yaml", "railway.json", "railway.toml", "app.yaml",
  "eas.json", "Procfile", "serverless.yml", "serverless.ts", "Chart.yaml", "skaffold.yaml", "wrangler.toml",
  "firebase.json", "amplify.yml",
]);
const TEST_CONFIG = /^(vitest|jest|playwright|cypress|karma)[\w.-]*\.(c|m)?[jt]s(on)?$|^\.detoxrc/;
const TEST_FILE = /\.((?:e2e-)?spec|test|e2e)\.([cm]?[jt]sx?)$/;
const LINT_FORMAT =
  /^(eslint\.config\.[cm]?[jt]s|\.eslintrc(\.\w+)?|\.prettierrc(\.\w+)?|prettier\.config\.[cm]?[jt]s|biome\.jsonc?|\.editorconfig|\.stylelintrc(\.\w+)?|\.lintstagedrc(\.\w+)?|commitlint\.config\.[cm]?[jt]s)$/;
const OTHER_ORM_CONFIG =
  /^(drizzle\.config|ormconfig|knexfile|data-source|mikro-orm\.config)\.[cm]?[jt]s(on)?$|^alembic\.ini$/;
const COMPOSE = /^(docker-)?compose([.-][\w-]+)?\.ya?ml$/;
const DOCKERFILE = /^Dockerfile(\..+)?$|\.Dockerfile$/;
const ROOT_DOC = /^(readme|claude|agents|contributing|changelog|architecture|security)(\.[\w-]+)?$/i;

// ---------- helpers ----------

const read = (p) => {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
};
const readJson = (p) => {
  const text = read(p);
  if (text == null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};
const subdirs = (p) => {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
};
const toPosix = (p) => p.split("\\").join("/");
const base = (f) => posix.basename(f);
const cap = (items, n) => (items.length > n ? [...items.slice(0, n), `… +${items.length - n} more`] : items);
const list = (items) => (items.length ? items.join(", ") : "none");
const isKey = (name) => KEY_PACKAGES.has(name) || KEY_PREFIXES.some((pre) => name.startsWith(pre));
const scripts = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `${k}: ${v.length > 60 ? `${v.slice(0, 57)}...` : v}`)
    .join(" · ");

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 256 * 1024 * 1024,
    }).toString();
  } catch {
    return null;
  }
}

function listFiles() {
  const out = git(["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
  if (out !== null) {
    const files = out
      .split("\0")
      .filter((f) => f && !f.split("/").some((s) => SKIP_DIRS.has(s)) && existsSync(join(root, f)));
    return { how: "git ls-files (tracked + untracked, respecting .gitignore)", files };
  }
  const files = [];
  const walk = (dir, depth) => {
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (files.length >= 50000) return;
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name) && depth < 10) walk(join(dir, e.name), depth + 1);
      } else if (e.isFile()) {
        files.push(toPosix(relative(root, join(dir, e.name))));
      }
    }
  };
  walk(root, 0);
  return { how: "filesystem walk (not a git repository)", files };
}

function workspaceGlobs(rootPkg) {
  const globs = [];
  const ws = rootPkg?.workspaces;
  if (Array.isArray(ws)) globs.push(...ws);
  else if (ws && Array.isArray(ws.packages)) globs.push(...ws.packages);
  const pnpm = read(join(root, "pnpm-workspace.yaml"));
  if (pnpm) {
    let inPackages = false;
    for (const line of pnpm.split("\n")) {
      if (/^packages:\s*$/.test(line)) {
        inPackages = true;
        continue;
      }
      if (!inPackages) continue;
      const m = line.match(/^\s+-\s+["']?([^"'#]+?)["']?\s*$/);
      if (m) globs.push(m[1]);
      else if (/^\S/.test(line)) inPackages = false;
    }
  }
  return globs;
}

function expandGlob(glob) {
  if (glob.startsWith("!")) return [];
  const clean = glob.replace(/\/+$/, "");
  const m = clean.match(/^(.*?)\/\*\*?$/);
  if (!m) return [clean];
  return subdirs(join(root, m[1]))
    .filter((name) => !SKIP_DIRS.has(name))
    .map((name) => `${m[1]}/${name}`);
}

function installedVersion(dir, name) {
  for (const b of [dir, root]) {
    const pkg = readJson(join(b, "node_modules", name, "package.json"));
    if (pkg?.version) return pkg.version;
  }
  return null;
}

function describeDeps(dir, deps, wsNames) {
  return Object.entries(deps ?? {}).map(([name, declared]) => {
    if (wsNames.has(name)) return { name, text: `${name} (workspace)` };
    const v = installedVersion(dir, name);
    return { name, text: v ? `${name}@${v}` : `${name}@${declared} (not installed)` };
  });
}

function envNames(path) {
  const names = [];
  for (const line of (read(path) ?? "").split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (m) names.push(m[1]);
  }
  return names;
}

function composeServices(text) {
  const services = [];
  let inServices = false;
  let current = null;
  for (const line of text.split("\n")) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    if (/^services:\s*$/.test(line)) {
      inServices = true;
      continue;
    }
    if (/^\S/.test(line)) {
      inServices = false;
      current = null;
      continue;
    }
    if (!inServices) continue;
    const svc = line.match(/^(?: {2}|\t)([A-Za-z0-9._-]+):\s*$/);
    if (svc) {
      current = { name: svc[1], image: null, build: false };
      services.push(current);
      continue;
    }
    if (!current) continue;
    const img = line.match(/^\s+image:\s*["']?([^"'\s#]+)/);
    if (img && !current.image) current.image = img[1];
    if (/^\s+build:/.test(line)) current.build = true;
  }
  return services;
}

// ---------- scan ----------

const { how, files } = listFiles();
const lines = [];
const p = (s = "") => lines.push(s);
const filesUnder = (dir) => (dir === "." ? files : files.filter((f) => f.startsWith(`${dir}/`)));
const relTo = (dir, f) => (dir === "." ? f : f.slice(dir.length + 1));

p(`# Stack inventory — ${root}`);
p(
  `Read-only scan. Files from ${how}. Versions: installed (node_modules) when available, else declared. ` +
    "Env files: variable names only.",
);

// Repository
const rootPkg = readJson(join(root, "package.json"));
const globs = workspaceGlobs(rootPkg);
const wsDirs = [...new Set(globs.flatMap(expandGlob))]
  .filter((d) => existsSync(join(root, d, "package.json")))
  .sort();
const workspaces = wsDirs.length ? wsDirs : rootPkg ? ["."] : [];
const wsPkgs = new Map(workspaces.map((d) => [d, readJson(join(root, d, "package.json")) ?? {}]));
const wsNames = new Set([...wsPkgs.values()].map((pkg) => pkg.name).filter(Boolean));

p("\n## Repository");
const lockfiles = [
  ["package-lock.json", "npm"], ["yarn.lock", "yarn"], ["pnpm-lock.yaml", "pnpm"], ["bun.lockb", "bun"], ["bun.lock", "bun"],
].filter(([f]) => existsSync(join(root, f)));
p(
  `- package manager: ${lockfiles.length ? lockfiles.map(([f, m]) => `${m} (${f})`).join(", ") : "no lockfile at the root"}` +
    (rootPkg?.packageManager ? ` · packageManager: ${rootPkg.packageManager}` : ""),
);
const runtime = [];
if (rootPkg?.engines) runtime.push(`engines ${JSON.stringify(rootPkg.engines)}`);
for (const f of [".nvmrc", ".node-version", ".tool-versions"]) {
  const text = read(join(root, f));
  if (text) runtime.push(`${f}: ${text.trim().split("\n").slice(0, 3).join("; ")}`);
}
p(`- runtime: ${runtime.length ? runtime.join(" · ") : "not pinned"}`);
const monoTools = ["turbo.json", "nx.json", "lerna.json", "rush.json", "pnpm-workspace.yaml"].filter((f) =>
  existsSync(join(root, f)),
);
if (monoTools.length) p(`- monorepo config: ${list(monoTools)}`);
p(
  `- workspaces: ${
    globs.length
      ? `${globs.join(", ")} → ${wsDirs.length} packages`
      : rootPkg
        ? "single package (no workspaces)"
        : "no package.json at the root"
  }`,
);
if (rootPkg?.name) p(`- root package name: ${rootPkg.name}`);
if (wsDirs.length && rootPkg) {
  if (rootPkg.scripts) p(`- root scripts: ${scripts(rootPkg.scripts)}`);
  const rootDeps = describeDeps(root, { ...rootPkg.dependencies, ...rootPkg.devDependencies }, wsNames);
  p(`- root dependencies: ${list(rootDeps.map((d) => d.text))}`);
}
const overrides = rootPkg?.overrides ?? rootPkg?.resolutions ?? rootPkg?.pnpm?.overrides;
if (overrides) p(`- version overrides: ${list(Object.keys(overrides))}`);
p(
  `- TypeScript: ${installedVersion(root, "typescript") ?? "not installed at the root"} · tsconfig files: ${
    files.filter((f) => /^tsconfig[\w.-]*\.json$/.test(base(f))).length
  }`,
);
p(`- lint/format config: ${list(cap(files.filter((f) => LINT_FORMAT.test(base(f))), 15))}`);
if (isDir(join(root, ".husky"))) p("- git hooks: .husky/");
if (wsDirs.length) {
  for (const f of files.filter((f) => !f.includes("/") && ENV_EXAMPLES.has(f))) {
    p(`- env names (${f}): ${list(envNames(join(root, f)))}`);
  }
}

// Workspaces
p("\n## Workspaces");
if (!workspaces.length) p("- none (no package.json found)");
for (const dir of workspaces) {
  const pkg = wsPkgs.get(dir);
  const abs = join(root, dir);
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  const kind = APP_KINDS.find(([dep]) => dep in allDeps)?.[1] ?? "library / package";
  p(`\n### ${dir === "." ? "(root)" : dir} — ${pkg.name ?? "unnamed"} · ${kind}`);
  if (pkg.scripts) p(`- scripts: ${scripts(pkg.scripts)}`);
  const deps = describeDeps(abs, { ...pkg.dependencies, ...pkg.peerDependencies }, wsNames);
  const dev = describeDeps(abs, pkg.devDependencies, wsNames);
  p(`- key packages: ${list([...deps, ...dev].filter((d) => isKey(d.name)).map((d) => d.text))}`);
  p(`- other dependencies: ${list(deps.filter((d) => !isKey(d.name)).map((d) => d.text))}`);
  p(`- other devDependencies: ${list(dev.filter((d) => !isKey(d.name)).map((d) => d.text))}`);

  const mine = filesUnder(dir);
  const topFiles = new Set();
  const topDirs = new Set();
  for (const f of mine) {
    const r = relTo(dir, f);
    const i = r.indexOf("/");
    if (i === -1) topFiles.add(r);
    else topDirs.add(`${r.slice(0, i)}/`);
  }
  p(`- top level: ${list([...topDirs].sort())} · ${list([...topFiles].sort())}`);
  for (const f of [...topFiles].filter((n) => ENV_EXAMPLES.has(n))) {
    p(`- env names (${f}): ${list(envNames(join(abs, f)))}`);
  }

  const testFiles = mine.filter(
    (f) => (TEST_FILE.test(f) || f.includes("/__tests__/")) && !TEST_CONFIG.test(base(f)),
  );
  const bySuffix = {};
  for (const f of testFiles) {
    const m = base(f).match(TEST_FILE);
    const k = m ? `*.${m[1]}.${m[2]}` : "__tests__/*";
    bySuffix[k] = (bySuffix[k] ?? 0) + 1;
  }
  const suffixes = Object.entries(bySuffix).map(([k, n]) => `${k} ×${n}`);
  const http = mine.filter((f) => f.endsWith(".http")).length;
  const testConfig = mine.filter((f) => TEST_CONFIG.test(base(f))).map((f) => relTo(dir, f));
  if (pkg.jest) testConfig.push("jest (in package.json)");
  p(
    `- tests: ${testFiles.length} test files${suffixes.length ? ` (${suffixes.join(", ")})` : ""}` +
      `${http ? `, ${http} .http files` : ""} · test config: ${list(testConfig)}`,
  );
}

// Persistence
p("\n## Persistence");
const prismaFiles = files.filter((f) => f.endsWith(".prisma"));
if (prismaFiles.length) {
  const providers = new Set();
  const models = [];
  for (const f of prismaFiles) {
    const text = read(join(root, f)) ?? "";
    for (const m of text.matchAll(/datasource\s+\w+\s*\{[^}]*?provider\s*=\s*"([^"]+)"/g)) providers.add(m[1]);
    for (const m of text.matchAll(/^\s*model\s+(\w+)\s*\{/gm)) models.push(m[1]);
  }
  const migrations = [
    ...new Set(
      files.filter((f) => /(^|\/)migrations\/[^/]+\/migration\.sql$/.test(f)).map((f) => posix.dirname(f)),
    ),
  ].sort();
  p(`- Prisma schema files: ${list(cap(prismaFiles, 12))}`);
  p(`- datasource provider: ${list([...providers])} · models (${models.length}): ${list(cap(models, 40))}`);
  p(
    `- migrations: ${migrations.length}` +
      (migrations.length ? ` (latest: ${migrations.slice(-3).map((m) => base(m)).join(", ")})` : ""),
  );
  const prismaConfig = files.filter((f) => /^prisma\.config\.[cm]?[jt]s$/.test(base(f)));
  if (prismaConfig.length) p(`- Prisma config: ${list(prismaConfig)}`);
}
const ormConfig = files.filter((f) => OTHER_ORM_CONFIG.test(base(f)));
if (ormConfig.length) p(`- other ORM / migration config: ${list(ormConfig)}`);
if (!prismaFiles.length && !ormConfig.length) p("- no ORM schema or migration config found");

// Infrastructure
p("\n## Infrastructure");
p(`- Dockerfiles: ${list(files.filter((f) => DOCKERFILE.test(base(f))))}`);
const composeFiles = files.filter((f) => COMPOSE.test(base(f)));
if (!composeFiles.length) p("- compose files: none");
for (const f of composeFiles) {
  const services = composeServices(read(join(root, f)) ?? "");
  p(`- compose ${f}: ${list(services.map((s) => `${s.name} (${s.image ?? (s.build ? "built locally" : "no image")})`))}`);
}
p(`- CI: ${list(files.filter((f) => f.startsWith(".github/workflows/") || CI_FILES.has(f)))}`);
p(`- deploy/hosting config: ${list(cap(files.filter((f) => DEPLOY_FILES.has(base(f)) || f.endsWith(".tf")), 15))}`);

// Other ecosystems
const otherManifests = files.filter((f) => OTHER_MANIFESTS.has(base(f)) || /\.(csproj|sln)$/.test(f));
if (otherManifests.length) {
  p("\n## Other ecosystems");
  p(`- manifests (read them directly): ${list(cap(otherManifests, 20))}`);
}

// Docs and agent context
p("\n## Docs and agent context");
p(`- root docs: ${list(files.filter((f) => !f.includes("/") && ROOT_DOC.test(f)))}`);
p(`- doc folders: ${list(cap(files.filter((f) => /^\.?docs\//.test(f)), 30))}`);
const nestedAgentDocs = files.filter(
  (f) => f.includes("/") && /^(CLAUDE|AGENTS)\.md$/.test(base(f)) && !f.includes("/skills/"),
);
if (nestedAgentDocs.length) p(`- nested agent instructions: ${list(cap(nestedAgentDocs, 15))}`);
const otherAgentRules = files.filter(
  (f) =>
    f.startsWith(".cursor/rules/") || [".cursorrules", ".windsurfrules", ".github/copilot-instructions.md"].includes(f),
);
if (otherAgentRules.length) p(`- other agent rules: ${list(otherAgentRules)}`);
for (const d of [".claude/skills", ".agents/skills"]) {
  const names = subdirs(join(root, d)).filter((n) => existsSync(join(root, d, n, "SKILL.md")));
  if (names.length) p(`- project skills (${d}): ${list(names)}`);
}
const specsDir = join(root, ".specs");
if (isDir(specsDir)) {
  let memory = [];
  try {
    memory = readdirSync(join(specsDir, "memory")).filter((n) => !n.startsWith("."));
  } catch {}
  p(
    `- .specs/: memory [${list(memory)}] · ${subdirs(join(specsDir, "changes")).length} active specs · ` +
      `${subdirs(join(specsDir, "finished")).length} finished`,
  );
}

// Git
p("\n## Git");
if (git(["rev-parse", "--is-inside-work-tree"])?.trim() !== "true") {
  p("- not a git repository");
} else {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"])?.trim();
  const count = git(["rev-list", "--count", "HEAD"])?.trim();
  if (!count) {
    p("- no commits yet");
  } else {
    p(`- branch: ${branch} · commits: ${count} · latest:`);
    for (const l of (git(["log", "--oneline", "-n", "15"]) ?? "").trim().split("\n")) p(`  - ${l}`);
  }
}

console.log(lines.join("\n"));
