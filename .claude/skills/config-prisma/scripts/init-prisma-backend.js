#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEFAULT_PRISMA_VERSION = '7.10.0';
const DEFAULT_PG_VERSION = '8.23.1';
const DEFAULT_TSX_VERSION = '4.23.15';
const DEFAULT_DOTENV_VERSION = '18.0.5';

// The backend reads its database credentials from these variables (see apps/backend/.env.example).
// Docker Compose overrides DATABASE_HOST to `postgres` inside the backend container.
const DATABASE_ENV_DEFAULTS = {
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_USER: 'rochas',
  DATABASE_PASSWORD: 'rochas',
  DATABASE_NAME: 'rochas_surf_school',
};

function printHelp() {
  console.log(`Prisma init (apps/backend)

Usage:
  node ${process.argv[1]} [options]

Options:
  --apply                      Apply file changes (default is dry-run)
  --dry-run                    Simulate changes without writing
  --install                    Run npm install for the backend workspace after file changes
  --start-db                   Run docker compose up -d postgres in apps/backend
  --module <name>              Create prisma/models/<name>.model.prisma (repeatable)
  --prisma-version <semver>    Version for prisma, @prisma/client and @prisma/adapter-pg (default: keep the backend's current one, fallback ${DEFAULT_PRISMA_VERSION})
  --help                       Show this help
`);
}

function parseArgs(argv) {
  const args = {
    apply: false,
    install: false,
    startDb: false,
    modules: [],
    prismaVersion: '',
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--apply') {
      args.apply = true;
    } else if (arg === '--dry-run') {
      args.apply = false;
    } else if (arg === '--install') {
      args.install = true;
    } else if (arg === '--start-db') {
      args.startDb = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--module') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --module');
      }
      args.modules.push(validateModuleName(value));
      i += 1;
    } else if (arg === '--prisma-version') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --prisma-version');
      }
      args.prismaVersion = value.trim();
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function validateModuleName(rawName) {
  const name = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(`Invalid module name "${rawName}". Use lowercase letters, numbers and hyphens.`);
  }

  return name;
}

function detectProjectRoot(startDir) {
  let currentDir = path.resolve(startDir);

  while (true) {
    if (fs.existsSync(path.join(currentDir, 'apps', 'backend', 'package.json'))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error('Could not find the project root containing apps/backend/package.json');
    }
    currentDir = parentDir;
  }
}

function toVersionRange(version) {
  const trimmed = String(version || '').trim();
  if (!trimmed) {
    return '';
  }

  return /^[~^]/.test(trimmed) || /[<>=*]/.test(trimmed) ? trimmed : `^${trimmed}`;
}

function sortObjectKeys(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

function createContext(rootDir, apply) {
  const changes = [];

  return {
    rootDir,
    apply,
    changes,
    relative(filePath) {
      return toPosix(path.relative(rootDir, filePath));
    },
    // Writes the file only when its content changes; records what happened.
    write(filePath, content) {
      const normalized = content.endsWith('\n') ? content : `${content}\n`;
      const previous = readText(filePath);
      if (previous === normalized) {
        return false;
      }

      changes.push(`${previous === null ? 'create' : 'update'} ${this.relative(filePath)}`);
      if (apply) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, normalized, 'utf8');
      }
      return true;
    },
    // Creates the file only when it does not exist yet, so later edits are never overwritten.
    create(filePath, content) {
      return fs.existsSync(filePath) ? false : this.write(filePath, content);
    },
    mkdir(dirPath) {
      if (fs.existsSync(dirPath)) {
        return;
      }

      changes.push(`mkdir ${this.relative(dirPath)}`);
      if (apply) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    },
  };
}

function run(command, args, cwd) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

// --- templates ---------------------------------------------------------------

// Shared by prisma.config.ts and src/db/database-url.ts: DATABASE_URL wins when set,
// otherwise the URL is built from the DATABASE_* variables the backend already uses.
const DATABASE_URL_FUNCTION = `export function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const user = encodeURIComponent(env.DATABASE_USER ?? '');
  const password = encodeURIComponent(env.DATABASE_PASSWORD ?? '');
  const host = env.DATABASE_HOST ?? 'localhost';
  const port = env.DATABASE_PORT ?? '5432';
  const database = env.DATABASE_NAME ?? '';

  return \`postgresql://\${user}:\${password}@\${host}:\${port}/\${database}?schema=public\`;
}`;

function renderDatabaseUrlModule() {
  return `// Builds the Postgres connection string from the backend's DATABASE_* variables.
// Keep in sync with the copy in prisma.config.ts, which the Prisma CLI loads on its own.
${DATABASE_URL_FUNCTION}`;
}

function renderPrismaConfig() {
  return `import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Keep in sync with src/db/database-url.ts.
${DATABASE_URL_FUNCTION.replace('export function', 'function')}

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed/main.ts',
  },
  datasource: {
    url: getDatabaseUrl(),
  },
});`;
}

function renderSchemaPrisma() {
  return `// Prisma schema root (multi-file mode).
// Add one file per module under prisma/models/<module-name>.model.prisma.

generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  // The backend is an ES module package compiled with "module": "nodenext",
  // so the generated client must be ESM and import its files with a .js suffix.
  moduleFormat        = "esm"
  importFileExtension = "js"
}

datasource db {
  provider = "postgresql"
}`;
}

function renderSeedMainTs() {
  return `import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { getDatabaseUrl } from '../../src/db/database-url.js';
import { PrismaClient } from '../../src/generated/prisma/client.js';

type SeedTask = (prisma: PrismaClient) => Promise<void>;

// Register module seed tasks here.
const seedTasks: SeedTask[] = [];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
});

async function main() {
  for (const task of seedTasks) {
    await task(prisma);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });`;
}

function renderPrismaService() {
  return `import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import { getDatabaseUrl } from './database-url.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}`;
}

function renderDbModule() {
  return `import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DbModule {}`;
}

function renderModulePrismaFile(moduleName) {
  return `// Prisma models for the ${moduleName} module.
// Keep one file per module in prisma/models, named <module-name>.model.prisma.
`;
}

function renderBootstrapModelPrismaFile() {
  return `// Temporary model so \`prisma generate\` has something to generate before the first real model exists.
// Delete this file once a module defines its own models, then create a new migration.
model PrismaBootstrap {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;
}

// --- steps -------------------------------------------------------------------

function ensureBackendPackageJson(backendDir, args, ctx) {
  const packageJsonPath = path.join(backendDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = packageJson.dependencies ?? {};
  const devDependencies = packageJson.devDependencies ?? {};
  const scripts = packageJson.scripts ?? {};

  const prismaRange =
    toVersionRange(args.prismaVersion) ||
    toVersionRange(dependencies['@prisma/client'] || devDependencies.prisma) ||
    `^${DEFAULT_PRISMA_VERSION}`;

  dependencies['@prisma/client'] = prismaRange;
  dependencies['@prisma/adapter-pg'] = prismaRange;
  dependencies.pg ??= `^${DEFAULT_PG_VERSION}`;
  devDependencies.prisma = prismaRange;
  devDependencies.tsx ??= `^${DEFAULT_TSX_VERSION}`;
  devDependencies.dotenv ??= `^${DEFAULT_DOTENV_VERSION}`;

  Object.assign(scripts, {
    // The generated client lives in src/generated (gitignored), so generate it before compiling or type-checking.
    prebuild: 'prisma generate',
    'precheck-types': 'prisma generate',
    'db:start': 'docker compose up -d postgres',
    'db:stop': 'docker compose stop postgres',
    'db:logs': 'docker compose logs -f postgres',
    'prisma:generate': 'prisma generate',
    'prisma:migrate:dev': 'prisma migrate dev',
    'prisma:migrate:deploy': 'prisma migrate deploy',
    'prisma:seed': 'prisma db seed',
    'prisma:studio': 'prisma studio',
  });

  packageJson.dependencies = sortObjectKeys(dependencies);
  packageJson.devDependencies = sortObjectKeys(devDependencies);
  packageJson.scripts = scripts;

  ctx.write(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

// Appends any missing DATABASE_* variable; existing values are never changed.
function ensureEnvFiles(backendDir, ctx) {
  for (const fileName of ['.env.example', '.env']) {
    const envPath = path.join(backendDir, fileName);
    const content = readText(envPath);
    if (content === null) {
      continue;
    }

    const missing = Object.entries(DATABASE_ENV_DEFAULTS).filter(
      ([key]) => !new RegExp(`^\\s*${key}\\s*=`, 'm').test(content),
    );
    if (missing.length === 0) {
      continue;
    }

    const block = missing.map(([key, value]) => `${key}=${value}`).join('\n');
    const separator = content.endsWith('\n') ? '' : '\n';
    ctx.write(envPath, `${content}${separator}\n# PostgreSQL\n${block}\n`);
  }
}

function ensureGitignore(backendDir, ctx) {
  const gitignorePath = path.join(backendDir, '.gitignore');
  const entry = '/src/generated/';
  const content = readText(gitignorePath) ?? '';

  if (content.split(/\r?\n/).includes(entry)) {
    return;
  }

  const separator = content === '' || content.endsWith('\n') ? '' : '\n';
  ctx.write(gitignorePath, `${content}${separator}# Prisma Client, generated by \`prisma generate\`\n${entry}\n`);
}

// The generated client is not ours to lint.
function ensureOxlintIgnore(backendDir, ctx) {
  const oxlintPath = path.join(backendDir, '.oxlintrc.json');
  const content = readText(oxlintPath);
  if (content === null) {
    return;
  }

  const config = JSON.parse(content);
  const ignorePatterns = config.ignorePatterns ?? [];
  if (ignorePatterns.includes('src/generated/**')) {
    return;
  }

  config.ignorePatterns = [...ignorePatterns, 'src/generated/**'];
  ctx.write(oxlintPath, `${JSON.stringify(config, null, 2)}\n`);
}

function ensureDbModuleImportedInAppModule(backendDir, ctx) {
  const appModulePath = path.join(backendDir, 'src', 'app.module.ts');
  const content = readText(appModulePath);
  if (content === null) {
    return;
  }

  let updated = content;

  if (!/from ['"]\.\/db\/db\.module(\.js)?['"]/.test(updated)) {
    const lines = updated.split('\n');
    const lastImportIndex = lines.reduce((last, line, index) => (line.startsWith('import ') ? index : last), -1);
    lines.splice(lastImportIndex + 1, 0, "import { DbModule } from './db/db.module.js';");
    updated = lines.join('\n');
  }

  const importsStart = updated.indexOf('imports: [');
  if (importsStart !== -1 && !/\bDbModule,/.test(updated.slice(importsStart))) {
    // Find the bracket that closes the imports array.
    let depth = 0;
    let closingIndex = -1;
    for (let i = importsStart + 'imports: '.length; i < updated.length; i += 1) {
      if (updated[i] === '[') depth += 1;
      if (updated[i] === ']') {
        depth -= 1;
        if (depth === 0) {
          closingIndex = i;
          break;
        }
      }
    }

    if (closingIndex !== -1) {
      const lineStart = updated.lastIndexOf('\n', closingIndex) + 1;
      const indent = updated.slice(lineStart, closingIndex);
      updated = `${updated.slice(0, lineStart)}${indent}  DbModule,\n${updated.slice(lineStart)}`;
    }
  }

  ctx.write(appModulePath, updated);
}

// True when a module file defines at least one model; empty module placeholders do not count.
function hasDomainModels(prismaModelsDir) {
  if (!fs.existsSync(prismaModelsDir)) {
    return false;
  }

  return fs
    .readdirSync(prismaModelsDir)
    .filter((fileName) => fileName.endsWith('.model.prisma') && fileName !== 'bootstrap.model.prisma')
    .some((fileName) => /^\s*model\s+\w+/m.test(fs.readFileSync(path.join(prismaModelsDir, fileName), 'utf8')));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const rootDir = detectProjectRoot(process.cwd());
  const backendDir = path.join(rootDir, 'apps', 'backend');
  const backendPackageJson = JSON.parse(fs.readFileSync(path.join(backendDir, 'package.json'), 'utf8'));
  const backendWorkspace = backendPackageJson.name || 'apps/backend';
  const ctx = createContext(rootDir, args.apply);

  const prismaDir = path.join(backendDir, 'prisma');
  const prismaModelsDir = path.join(prismaDir, 'models');
  const dbDir = path.join(backendDir, 'src', 'db');

  ctx.mkdir(prismaModelsDir);
  ctx.mkdir(path.join(prismaDir, 'migrations'));
  ctx.mkdir(path.join(prismaDir, 'seed'));
  ctx.mkdir(dbDir);

  ensureBackendPackageJson(backendDir, args, ctx);
  ensureEnvFiles(backendDir, ctx);
  ensureGitignore(backendDir, ctx);
  ensureOxlintIgnore(backendDir, ctx);

  // Root config files converge to the template on every run.
  ctx.write(path.join(backendDir, 'prisma.config.ts'), renderPrismaConfig());
  ctx.write(path.join(prismaDir, 'schema.prisma'), renderSchemaPrisma());

  // Code files are only created once, so later edits are kept.
  ctx.create(path.join(prismaDir, 'seed', 'main.ts'), renderSeedMainTs());
  ctx.create(path.join(dbDir, 'database-url.ts'), renderDatabaseUrlModule());
  ctx.create(path.join(dbDir, 'prisma.service.ts'), renderPrismaService());
  ctx.create(path.join(dbDir, 'db.module.ts'), renderDbModule());

  for (const moduleName of new Set(args.modules)) {
    ctx.create(path.join(prismaModelsDir, `${moduleName}.model.prisma`), renderModulePrismaFile(moduleName));
  }

  if (!hasDomainModels(prismaModelsDir)) {
    ctx.create(path.join(prismaModelsDir, 'bootstrap.model.prisma'), renderBootstrapModelPrismaFile());
  }

  ensureDbModuleImportedInAppModule(backendDir, ctx);

  if (ctx.changes.length === 0) {
    console.log('No changes required. The Prisma setup is already up to date.');
  } else {
    console.log(`${args.apply ? 'Applied changes' : 'Dry-run changes'}:`);
    for (const change of ctx.changes) {
      console.log(`- ${change}`);
    }
  }

  if (!args.apply) {
    if (args.install || args.startDb) {
      console.log('\nDry-run: skipped npm install and docker compose.');
    }
    console.log('\nRun again with --apply to write these changes.');
    return;
  }

  if (args.install) {
    run('npm', ['install', '--workspace', backendWorkspace], rootDir);
  }

  if (args.startDb) {
    run('docker', ['compose', 'up', '-d', 'postgres'], backendDir);
  }
}

try {
  main();
} catch (error) {
  console.error(`[config-prisma] ${error.message}`);
  process.exit(1);
}
