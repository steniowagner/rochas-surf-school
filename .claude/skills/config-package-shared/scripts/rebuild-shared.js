#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = process.cwd();
const TEMPLATE_DIR = path.resolve(__dirname, '..', 'assets', 'shared-template');
// Every workspace package in this monorepo lives under the project scope.
const SCOPE = '@rochas-surf-school';
const TEMPLATE_PACKAGE_NAME = '@temp/shared';
const DEFAULT_PACKAGE_NAME = 'shared';
const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
// The apps that consume the shared package, keyed by the flag that skips them.
const APPS = [
  { name: 'backend', skipFlag: 'skipBackend' },
  { name: 'web', skipFlag: 'skipWeb' },
  { name: 'mobile', skipFlag: 'skipMobile' },
];

function parseArgs(argv) {
  const options = {
    packageName: DEFAULT_PACKAGE_NAME,
    force: false,
    skipBackend: false,
    skipWeb: false,
    skipMobile: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--package-name') {
      const value = argv[index + 1];
      if (!value) {
        fail('Provide a value for --package-name.');
      }

      options.packageName = value;
      index += 1;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--skip-backend') {
      options.skipBackend = true;
      continue;
    }

    if (arg === '--skip-web') {
      options.skipWeb = true;
      continue;
    }

    if (arg === '--skip-mobile') {
      options.skipMobile = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: node rebuild-shared.js [--package-name <name>] [--force] [--skip-backend] [--skip-web] [--skip-mobile]',
      );
      process.exit(0);
    }

    fail(`Unsupported argument: ${arg}`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.packageName)) {
    fail(
      'The package name must use only lowercase letters, numbers and hyphens, for example: shared or shared-v2.',
    );
  }

  return options;
}

function fail(message) {
  console.error(`[config-package-shared] ${message}`);
  process.exit(1);
}

function exists(targetPath) {
  return fs.existsSync(targetPath);
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function removeDir(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function copyDir(sourceDir, targetDir) {
  ensureDir(targetDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'coverage', '.turbo'].includes(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sortObjectKeys(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function isSharedDependency(dependencyName) {
  return /^@[^/]+\/shared$/.test(dependencyName);
}

function packageJsonHasSharedDependency(packageJson) {
  return DEPENDENCY_SECTIONS.some((section) => {
    const deps = packageJson[section];
    return Boolean(deps) && typeof deps === 'object' && Object.keys(deps).some(isSharedDependency);
  });
}

function listFilesRecursively(dirPath) {
  const files = [];

  if (!exists(dirPath)) {
    return files;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'coverage', '.turbo', '.next', '.expo', 'ios', 'android'].includes(entry.name)) {
        continue;
      }

      files.push(...listFilesRecursively(absolutePath));
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

function workspaceImportsShared(workspaceDir) {
  const sharedImportPattern =
    /(?:from\s+['"](@[^/'"]+\/shared)['"])|(?:require\(\s*['"](@[^/'"]+\/shared)['"]\s*\))/;

  return listFilesRecursively(workspaceDir).some(
    (filePath) =>
      /\.(cjs|cts|js|jsx|mjs|mts|ts|tsx)$/.test(filePath) &&
      sharedImportPattern.test(fs.readFileSync(filePath, 'utf8')),
  );
}

// Replaces any `@<scope>/shared` dependency with `<sharedPackageName>: "*"` in `dependencies`.
function setSharedDependency(packageJsonPath, sharedPackageName) {
  const packageJson = readJson(packageJsonPath);

  for (const section of DEPENDENCY_SECTIONS) {
    const deps = packageJson[section];
    if (!deps || typeof deps !== 'object') {
      continue;
    }

    for (const dependencyName of Object.keys(deps)) {
      if (isSharedDependency(dependencyName)) {
        delete deps[dependencyName];
      }
    }

    if (Object.keys(deps).length === 0) {
      delete packageJson[section];
    }
  }

  packageJson.dependencies = sortObjectKeys({
    ...(packageJson.dependencies ?? {}),
    [sharedPackageName]: '*',
  });

  writeJson(packageJsonPath, packageJson);
}

function runCommand(command, args) {
  console.log(`[config-package-shared] Running: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const targetDir = path.join(ROOT_DIR, 'packages', options.packageName);
  const sharedPackageName = `${SCOPE}/${options.packageName}`;

  if (!exists(path.join(ROOT_DIR, 'package.json')) || !exists(path.join(ROOT_DIR, 'apps'))) {
    fail('Run this script from the monorepo root.');
  }

  if (!exists(TEMPLATE_DIR)) {
    fail(`Template not found at ${TEMPLATE_DIR}`);
  }

  ensureDir(path.join(ROOT_DIR, 'packages'));
  if (options.packageName === DEFAULT_PACKAGE_NAME) {
    removeDir(targetDir);
  } else if (exists(targetDir) && !options.force) {
    fail(
      `${path.relative(ROOT_DIR, targetDir)} already exists. Use another name, or run again with --force to recreate it.`,
    );
  } else if (exists(targetDir) && options.force) {
    removeDir(targetDir);
  }

  copyDir(TEMPLATE_DIR, targetDir);

  const targetPackageJsonPath = path.join(targetDir, 'package.json');
  const targetPackageJson = readJson(targetPackageJsonPath);

  if (targetPackageJson.name !== TEMPLATE_PACKAGE_NAME) {
    fail(
      `The template must be named ${TEMPLATE_PACKAGE_NAME}, but found ${targetPackageJson.name ?? '<no name>'}.`,
    );
  }

  targetPackageJson.name = sharedPackageName;
  for (const section of DEPENDENCY_SECTIONS) {
    if (targetPackageJson[section]) {
      targetPackageJson[section] = sortObjectKeys(targetPackageJson[section]);
    }
  }
  writeJson(targetPackageJsonPath, targetPackageJson);

  const updatedWorkspaces = [];
  if (options.packageName === DEFAULT_PACKAGE_NAME) {
    // The apps always consume the shared package, unless skipped.
    for (const app of APPS) {
      const packageJsonPath = path.join(ROOT_DIR, 'apps', app.name, 'package.json');
      if (options[app.skipFlag] || !exists(packageJsonPath)) {
        continue;
      }

      setSharedDependency(packageJsonPath, sharedPackageName);
      updatedWorkspaces.push(path.relative(ROOT_DIR, packageJsonPath));
    }

    // Business modules only get the dependency when they already use the shared package.
    const modulesDir = path.join(ROOT_DIR, 'modules');
    if (exists(modulesDir)) {
      for (const child of fs.readdirSync(modulesDir, { withFileTypes: true })) {
        const packageJsonPath = path.join(modulesDir, child.name, 'package.json');
        if (!child.isDirectory() || !exists(packageJsonPath)) {
          continue;
        }

        const usesShared =
          packageJsonHasSharedDependency(readJson(packageJsonPath)) ||
          workspaceImportsShared(path.dirname(packageJsonPath));

        if (usesShared) {
          setSharedDependency(packageJsonPath, sharedPackageName);
          updatedWorkspaces.push(path.relative(ROOT_DIR, packageJsonPath));
        }
      }
    }
  }

  runCommand('npm', ['install']);
  runCommand('npx', ['turbo', 'run', 'build', '--filter', sharedPackageName]);
  runCommand('npm', ['run', 'test', '--workspace', sharedPackageName]);

  console.log('');
  console.log(`Recreated package: ${path.relative(ROOT_DIR, targetDir)}`);
  console.log(`Package name: ${sharedPackageName}`);
  console.log('Workspaces with the shared dependency:');

  if (updatedWorkspaces.length === 0) {
    console.log('- none');
  } else {
    for (const workspace of updatedWorkspaces) {
      console.log(`- ${workspace}`);
    }
  }
}

main();
