#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const FRONTEND_ENV = "NEXT_PUBLIC_API_URL=http://localhost:4000\n";
const BACKEND_ENV = "PORT=4000\n";
const MOBILE_ENV = "EXPO_PUBLIC_API_URL=http://localhost:4000\n";
const DEFAULT_GENERATED_TOP_LEVEL_ENTRIES = [
  ".gitignore",
  "README.md",
  "apps",
  "package-lock.json",
  "package.json",
  "packages",
  "turbo.json",
  "tsconfig.json",
];
const WORKSPACE_MARKERS = [
  "package.json",
  "turbo.json",
  path.join("apps", "frontend", "package.json"),
  path.join("apps", "backend", "package.json"),
  path.join("apps", "mobile", "package.json"),
];
// Nest CLI 12 scaffolds an ESM project (nodenext), so relative imports need the .js suffix.
const APP_MODULE_CONTENT = `import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`;
const MAIN_TS_CONTENT = `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
`;
const MOBILE_ESLINT_CONFIG_CONTENT = `// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
`;
const MOBILE_SCENE_PLUGIN_PATH = "./plugins/with-ios-scene-lifecycle";
const MOBILE_SCENE_PLUGIN_CONTENT = "// iOS 27 refuses to launch apps that have not adopted the UIScene life cycle. Expo SDK 57 ships\n// `ExpoAppSceneDelegate`, but its template still starts React Native from the app delegate, so this\n// plugin wires the scene delegate in during prebuild. It skips itself once the template adopts\n// scenes on its own (Expo SDK 58+), so it can be deleted after upgrading.\nconst { withAppDelegate, withInfoPlist } = require('expo/config-plugins');\n\nconst SCENE_DELEGATE_CLASS = 'SceneDelegate';\nconst WINDOW_START_BLOCK =\n  /#if os\\(iOS\\) \\|\\| os\\(tvOS\\)\\n\\s*window = UIWindow\\(frame: UIScreen\\.main\\.bounds\\)\\n\\s*factory\\.startReactNative\\([\\s\\S]*?\\)\\n#endif\\n/;\n\nfunction withSceneManifest(config) {\n  return withInfoPlist(config, (config) => {\n    if (!config.modResults.UIApplicationSceneManifest) {\n      config.modResults.UIApplicationSceneManifest = {\n        UIApplicationSupportsMultipleScenes: false,\n        UISceneConfigurations: {\n          UIWindowSceneSessionRoleApplication: [\n            {\n              UISceneConfigurationName: 'Default Configuration',\n              UISceneDelegateClassName: SCENE_DELEGATE_CLASS,\n            },\n          ],\n        },\n      };\n    }\n    return config;\n  });\n}\n\nfunction withSceneDelegate(config) {\n  return withAppDelegate(config, (config) => {\n    const { language, contents } = config.modResults;\n    if (language !== 'swift' || contents.includes('ExpoAppSceneDelegate')) {\n      return config;\n    }\n    if (!WINDOW_START_BLOCK.test(contents)) {\n      throw new Error(\n        'with-ios-scene-lifecycle: AppDelegate.swift no longer matches the Expo SDK 57 template. ' +\n          'Check whether the template adopts UIScene on its own and remove this plugin if so.'\n      );\n    }\n    config.modResults.contents = contents\n      .replace(\n        'class AppDelegate: ExpoAppDelegate {',\n        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {'\n      )\n      .replace(\n        WINDOW_START_BLOCK,\n        '    // The window is created and React Native is started by `SceneDelegate` (required by iOS 27).\\n'\n      )\n      .replace(\n        'class ReactNativeDelegate:',\n        `@objc(${SCENE_DELEGATE_CLASS})\\nclass ${SCENE_DELEGATE_CLASS}: ExpoAppSceneDelegate {}\\n\\nclass ReactNativeDelegate:`\n      );\n    return config;\n  });\n}\n\nmodule.exports = function withIosSceneLifecycle(config) {\n  return withSceneDelegate(withSceneManifest(config));\n};\n";
const CHECK_TYPES_SCRIPT = "tsc --noEmit";
// Next and Expo generate global types (LayoutProps, expo-env.d.ts) outside tsc, so generate them first.
const FRONTEND_CHECK_TYPES_SCRIPT = `next typegen && ${CHECK_TYPES_SCRIPT}`;
const MOBILE_CHECK_TYPES_SCRIPT = `expo customize tsconfig.json && ${CHECK_TYPES_SCRIPT}`;
// Versions Expo pins for its toolchain; every other workspace is aligned to them. typescript is
// included because create-turbo pins a root TypeScript that the hoisted typescript-eslint rejects.
const MOBILE_ALIGNED_PACKAGES = ["react", "react-dom", "@types/react", "typescript"];

main();

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      return;
    }
    if (options.selfTest) {
      runSelfTest();
      return;
    }

    const targetDir = path.resolve(process.cwd());
    const projectSlug = validateProjectSlug(slugify(path.basename(targetDir)) || "app");

    validateTargetDirectory(targetDir);
    validateNamespace(options.namespace);

    const log = createLogger(options.dryRun);
    log.step(`Current directory: ${targetDir}`);
    log.step(`Workspace slug: ${projectSlug}`);
    if (options.namespace) {
      log.step(`Namespace: ${options.namespace}`);
    }

    const existingWorkspace = detectManagedWorkspace(targetDir);
    if (existingWorkspace && !options.forceClean) {
      throw new Error(
        `Current directory already contains a fullstack workspace created by this skill: ${targetDir}`
      );
    }

    ensureCommand("node", ["--version"], targetDir, options.dryRun);
    ensureCommand("npm", ["--version"], targetDir, options.dryRun);
    ensureCommand("npx", ["--version"], targetDir, options.dryRun);

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "config-project-fullstack-"));
    const scaffoldDir = path.join(tempRoot, projectSlug);

    try {
      runCommand("npx", ["create-turbo@latest", projectSlug, "-m", "npm"], {
        cwd: tempRoot,
        dryRun: options.dryRun,
        label: "Creating Turbo workspace in a temporary directory",
      });

      const appsDir = path.join(scaffoldDir, "apps");
      ensureDirectoryExists(appsDir, "Turbo apps directory", options.dryRun);
      cleanDirectoryChildren(appsDir, options.dryRun);
      // Turbo's demo component library is unused by the generated apps, and its Babel 8 ESLint setup
      // cannot share the workspace root with the Babel 7 that Expo's Metro needs.
      removeDirectory(path.join(scaffoldDir, "packages", "ui"), options.dryRun);

      runCommand("npx", ["create-next-app@latest", "frontend", "--yes", "--src-dir", "--use-npm"], {
        cwd: appsDir,
        dryRun: options.dryRun,
        label: "Creating Next.js frontend",
      });

      if (!commandExists("nest")) {
        runCommand("npm", ["i", "-g", "@nestjs/cli"], {
          cwd: tempRoot,
          dryRun: options.dryRun,
          label: "Installing Nest CLI globally",
        });
      } else {
        log.step("Nest CLI already available globally");
      }

      runCommand("nest", ["new", "backend", "-g", "-p", "npm"], {
        cwd: appsDir,
        dryRun: options.dryRun,
        label: "Creating NestJS backend",
      });

      const backendDir = path.join(scaffoldDir, "apps", "backend");
      runCommand("npm", ["install", "@nestjs/config"], {
        cwd: backendDir,
        dryRun: options.dryRun,
        label: "Installing backend config module",
      });

      writeFile(path.join(backendDir, "src", "app.module.ts"), APP_MODULE_CONTENT, options.dryRun);
      writeFile(path.join(backendDir, "src", "main.ts"), MAIN_TS_CONTENT, options.dryRun);
      ensurePackageScripts(
        path.join(backendDir, "package.json"),
        { dev: "nest start --watch", "check-types": CHECK_TYPES_SCRIPT },
        options.dryRun
      );

      runCommand("npx", ["create-expo-app@latest", "mobile", "--yes", "--no-agents-md"], {
        cwd: appsDir,
        dryRun: options.dryRun,
        label: "Creating Expo mobile app",
      });

      const mobileDir = path.join(scaffoldDir, "apps", "mobile");
      runCommand("npx", ["expo", "install", "eslint", "eslint-config-expo", "--", "--save-dev"], {
        cwd: mobileDir,
        dryRun: options.dryRun,
        label: "Installing mobile ESLint config",
      });

      moveToDevDependencies(path.join(mobileDir, "package.json"), ["eslint-config-expo"], options.dryRun);
      writeFile(path.join(mobileDir, "eslint.config.js"), MOBILE_ESLINT_CONFIG_CONTENT, options.dryRun);
      writeFile(
        path.join(mobileDir, `${MOBILE_SCENE_PLUGIN_PATH}.js`),
        MOBILE_SCENE_PLUGIN_CONTENT,
        options.dryRun
      );
      ensureExpoPlugin(path.join(mobileDir, "app.json"), MOBILE_SCENE_PLUGIN_PATH, options.dryRun);
      ensurePackageScripts(
        path.join(mobileDir, "package.json"),
        { dev: "expo start", "check-types": MOBILE_CHECK_TYPES_SCRIPT },
        options.dryRun
      );
      ensureGitignoreEntries(path.join(mobileDir, ".gitignore"), [".env"], options.dryRun);

      const frontendDir = path.join(scaffoldDir, "apps", "frontend");
      ensurePackageScripts(
        path.join(frontendDir, "package.json"),
        { "check-types": FRONTEND_CHECK_TYPES_SCRIPT },
        options.dryRun
      );
      ensureGitignoreEntries(path.join(frontendDir, ".gitignore"), ["!.env.example"], options.dryRun);
      ensureEnvFiles(frontendDir, FRONTEND_ENV, options.dryRun);
      ensureEnvFiles(backendDir, BACKEND_ENV, options.dryRun);
      ensureEnvFiles(mobileDir, MOBILE_ENV, options.dryRun);

      alignVersionsWithMobile(scaffoldDir, mobileDir, options.dryRun);

      const generatedEntries = listCopyableTopLevelEntries(scaffoldDir, options.dryRun);
      if (options.forceClean) {
        if (!existingWorkspace) {
          throw new Error(
            "Refusing --force-clean because the current directory does not look like a workspace created by this skill"
          );
        }
        removeGeneratedEntries(targetDir, generatedEntries, options.dryRun);
      } else {
        ensureNoConflictingEntries(targetDir, generatedEntries);
      }

      copyGeneratedWorkspace(scaffoldDir, targetDir, options.dryRun);

      if (options.namespace) {
        rewriteWorkspaceNamespace(targetDir, options.namespace, options.dryRun);
      }

      // The scaffold lockfile still records the pre-alignment React hoisting, and npm keeps it even
      // with overrides, so resolve the final tree from scratch.
      removeFile(path.join(targetDir, "package-lock.json"), options.dryRun);

      runCommand("npm", ["install"], {
        cwd: targetDir,
        dryRun: options.dryRun,
        label: "Refreshing root workspace dependencies",
      });

      log.step(`Created workspace entries in current directory: ${generatedEntries.join(", ")}`);
      log.step("Project configured successfully");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(`\n[error] ${error.message}`);
    process.exit(1);
  }
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    forceClean: false,
    help: false,
    namespace: null,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--force-clean") {
      options.forceClean = true;
      continue;
    }
    if (arg === "--self-test") {
      options.selfTest = true;
      continue;
    }
    if (arg === "--namespace") {
      index += 1;
      options.namespace = requireValue(arg, argv[index]);
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node ${process.argv[1]} [--namespace @scope] [--force-clean] [--dry-run]

Options:
  --namespace   Rename workspace packages to an npm scope such as @acme
  --force-clean Remove only the generated project paths in the current directory before scaffolding again
  --dry-run     Print the planned operations without executing them
  --self-test   Run internal tests for namespace rewriting and argument parsing
  --help        Show this help message
`);
}

function createLogger(dryRun) {
  return {
    step(message) {
      const prefix = dryRun ? "[dry-run]" : "[step]";
      console.log(`${prefix} ${message}`);
    },
  };
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function validateProjectSlug(projectSlug) {
  if (!projectSlug) {
    throw new Error("Project slug could not be derived from the current directory name");
  }
  return projectSlug;
}

function validateNamespace(namespace) {
  if (!namespace) {
    return;
  }
  if (!/^@[a-z0-9][a-z0-9._-]*$/i.test(namespace)) {
    throw new Error(`Invalid namespace '${namespace}'. Expected npm scope format like @acme`);
  }
}

function validateTargetDirectory(targetDir) {
  if (!fs.existsSync(targetDir)) {
    throw new Error(`Current directory does not exist: ${targetDir}`);
  }
  if (!fs.statSync(targetDir).isDirectory()) {
    throw new Error(`Current path is not a directory: ${targetDir}`);
  }

  const normalizedTarget = path.resolve(targetDir);
  if (normalizedTarget === path.parse(normalizedTarget).root) {
    throw new Error("Refusing to use the filesystem root as the target directory");
  }
}

function ensureCommand(command, args, cwd, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Checking command: ${command} ${args.join(" ")}`);
    return;
  }
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error) {
    throw new Error(`Command not available: ${command}`);
  }
  if (result.status !== 0) {
    throw new Error(`Command check failed: ${command} ${args.join(" ")}`);
  }
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], { encoding: "utf8" });
  return !result.error && result.status === 0;
}

function runCommand(command, args, options) {
  const { cwd, dryRun, label } = options;
  const pretty = `${command} ${args.join(" ")}`;

  if (dryRun) {
    console.log(`[dry-run] ${label}: ${pretty}`);
    return;
  }

  console.log(`[run] ${label}: ${pretty}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    throw new Error(`Failed to run '${pretty}': ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Command exited with status ${result.status}: ${pretty}`);
  }
}

function removeDirectory(targetDir, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Removing existing target: ${targetDir}`);
    return;
  }
  fs.rmSync(targetDir, { recursive: true, force: true });
}

function removeFile(filePath, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Removing ${filePath}`);
    return;
  }
  fs.rmSync(filePath, { force: true });
}

function ensureDirectoryExists(dirPath, label, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Validating directory: ${dirPath}`);
    return;
  }
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    throw new Error(`${label} not found: ${dirPath}`);
  }
}

function cleanDirectoryChildren(dirPath, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Cleaning contents of ${dirPath}`);
    return;
  }
  const children = fs.readdirSync(dirPath);
  for (const child of children) {
    const childPath = path.join(dirPath, child);
    fs.rmSync(childPath, { recursive: true, force: true });
  }
}

function detectManagedWorkspace(targetDir) {
  if (!WORKSPACE_MARKERS.every((relativePath) => fs.existsSync(path.join(targetDir, relativePath)))) {
    return false;
  }

  try {
    const packageJson = readJson(path.join(targetDir, "package.json"));
    return workspaceConfigIncludes(packageJson.workspaces, "apps/*") &&
      workspaceConfigIncludes(packageJson.workspaces, "packages/*");
  } catch (error) {
    return false;
  }
}

function workspaceConfigIncludes(workspaces, entry) {
  if (Array.isArray(workspaces)) {
    return workspaces.includes(entry);
  }
  if (workspaces && Array.isArray(workspaces.packages)) {
    return workspaces.packages.includes(entry);
  }
  return false;
}

function listCopyableTopLevelEntries(scaffoldDir, dryRun) {
  if (dryRun || !fs.existsSync(scaffoldDir)) {
    return [...DEFAULT_GENERATED_TOP_LEVEL_ENTRIES];
  }

  return fs
    .readdirSync(scaffoldDir)
    .filter((entry) => !shouldSkipCopy(path.join(scaffoldDir, entry)))
    .sort();
}

function ensureNoConflictingEntries(targetDir, entries) {
  const conflicts = entries.filter((entry) => fs.existsSync(path.join(targetDir, entry)));
  if (conflicts.length > 0) {
    throw new Error(
      `Current directory already contains conflicting entries: ${conflicts.join(
        ", "
      )}. Move them away or use --force-clean to replace only the generated project paths`
    );
  }
}

function removeGeneratedEntries(targetDir, entries, dryRun) {
  for (const entry of entries) {
    const targetPath = path.join(targetDir, entry);
    if (!fs.existsSync(targetPath)) {
      continue;
    }
    removeDirectory(targetPath, dryRun);
  }
}

function copyGeneratedWorkspace(scaffoldDir, targetDir, dryRun) {
  const entries = listCopyableTopLevelEntries(scaffoldDir, dryRun);
  for (const entry of entries) {
    const sourcePath = path.join(scaffoldDir, entry);
    const targetPath = path.join(targetDir, entry);
    copyPath(sourcePath, targetPath, dryRun);
  }
}

function copyPath(sourcePath, targetPath, dryRun) {
  if (shouldSkipCopy(sourcePath)) {
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] Copying ${sourcePath} -> ${targetPath}`);
    return;
  }

  const stat = fs.lstatSync(sourcePath);
  if (stat.isDirectory()) {
    fs.mkdirSync(targetPath, { recursive: true });
    for (const child of fs.readdirSync(sourcePath)) {
      copyPath(path.join(sourcePath, child), path.join(targetPath, child), dryRun);
    }
    return;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function shouldSkipCopy(entryPath) {
  const name = path.basename(entryPath);
  return shouldSkipDirectory(name) || name === ".git";
}

function writeFile(filePath, content, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Writing ${filePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function ensureEnvFiles(dirPath, content, dryRun) {
  writeFile(path.join(dirPath, ".env.example"), content, dryRun);
  writeFile(path.join(dirPath, ".env"), content, dryRun);
}

function ensurePackageScripts(packageJsonPath, scripts, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Patching ${packageJsonPath} with scripts: ${Object.keys(scripts).join(", ")}`);
    return;
  }
  const packageJson = readJson(packageJsonPath);
  packageJson.scripts = { ...(packageJson.scripts || {}), ...scripts };
  writeJson(packageJsonPath, packageJson);
}

function ensureGitignoreEntries(gitignorePath, entries, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Adding ${entries.join(", ")} to ${gitignorePath}`);
    return;
  }
  const current = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
  const lines = current.split(/\r?\n/);
  const missing = entries.filter((entry) => !lines.includes(entry));
  if (missing.length === 0) {
    return;
  }
  const separator = current === "" || current.endsWith("\n") ? "" : "\n";
  fs.writeFileSync(gitignorePath, `${current}${separator}${missing.join("\n")}\n`, "utf8");
}

function ensureExpoPlugin(appJsonPath, plugin, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Registering ${plugin} in ${appJsonPath}`);
    return;
  }
  const appJson = readJson(appJsonPath);
  appJson.expo = appJson.expo || {};
  appJson.expo.plugins = appJson.expo.plugins || [];
  const registered = appJson.expo.plugins.some((entry) => (Array.isArray(entry) ? entry[0] : entry) === plugin);
  if (!registered) {
    appJson.expo.plugins.push(plugin);
  }
  writeJson(appJsonPath, appJson);
}

function moveToDevDependencies(packageJsonPath, names, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Moving ${names.join(", ")} to devDependencies in ${packageJsonPath}`);
    return;
  }
  const packageJson = readJson(packageJsonPath);
  for (const name of names) {
    if (!packageJson.dependencies || !packageJson.dependencies[name]) {
      continue;
    }
    packageJson.devDependencies = { ...(packageJson.devDependencies || {}), [name]: packageJson.dependencies[name] };
    delete packageJson.dependencies[name];
  }
  writeJson(packageJsonPath, packageJson);
}

// Expo pins react/react-dom to the exact version its React Native renderer expects. Any other
// workspace pinning a different version gets hoisted to the root, where react-native resolves it,
// leaving two Reacts inside the mobile bundle. Align every other workspace (root included) to the
// Expo versions and add root overrides so peer ranges such as react@"*" resolve the same way.
function alignVersionsWithMobile(rootDir, mobileDir, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Aligning ${MOBILE_ALIGNED_PACKAGES.join(", ")} versions under ${rootDir} with ${mobileDir}`);
    return;
  }
  const mobilePackageJsonPath = path.join(mobileDir, "package.json");
  const mobilePackage = readJson(mobilePackageJsonPath);
  const pinnedVersions = {};
  for (const name of MOBILE_ALIGNED_PACKAGES) {
    const pinned =
      (mobilePackage.dependencies && mobilePackage.dependencies[name]) ||
      (mobilePackage.devDependencies && mobilePackage.devDependencies[name]);
    if (pinned) {
      pinnedVersions[name] = pinned;
    }
  }

  for (const packageJsonPath of findPackageJsonFiles(rootDir)) {
    if (packageJsonPath === mobilePackageJsonPath) {
      continue;
    }
    const packageJson = readJson(packageJsonPath);
    let changed = false;
    for (const field of ["dependencies", "devDependencies"]) {
      for (const [name, pinned] of Object.entries(pinnedVersions)) {
        if (packageJson[field] && packageJson[field][name] && packageJson[field][name] !== pinned) {
          packageJson[field][name] = pinned;
          changed = true;
        }
      }
    }
    if (changed) {
      writeJson(packageJsonPath, packageJson);
    }
  }

  const rootPackageJsonPath = path.join(rootDir, "package.json");
  const rootPackage = readJson(rootPackageJsonPath);
  rootPackage.overrides = { ...(rootPackage.overrides || {}), ...pinnedVersions };

  // react-native-worklets peers on @babel/core@"*", so it takes whatever sits at the root. Turbo's
  // eslint-config brings Babel 8 there, which breaks Metro. A root devDependency on the Babel range
  // Expo's Metro config declares keeps Babel 7 at the root and nests Babel 8 under eslint-config.
  const metroBabelCore = readMobileMetroBabelCore(mobileDir);
  if (metroBabelCore) {
    rootPackage.devDependencies = { ...(rootPackage.devDependencies || {}), "@babel/core": metroBabelCore };
  } else {
    console.warn("[warn] Could not read @babel/core from @expo/metro-config; Metro may load the wrong Babel");
  }
  writeJson(rootPackageJsonPath, rootPackage);
}

function readMobileMetroBabelCore(mobileDir) {
  try {
    const metroConfigPackage = readJson(require.resolve("@expo/metro-config/package.json", { paths: [mobileDir] }));
    return (metroConfigPackage.dependencies && metroConfigPackage.dependencies["@babel/core"]) || null;
  } catch (error) {
    return null;
  }
}

function rewriteWorkspaceNamespace(rootDir, namespace, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Rewriting workspace package names under ${rootDir} to ${namespace}`);
    return;
  }

  const packageJsonFiles = findPackageJsonFiles(rootDir);
  const renameMap = new Map();

  for (const packageJsonPath of packageJsonFiles) {
    const packageJson = readJson(packageJsonPath);
    const nextName = computeScopedPackageName(packageJsonPath, packageJson.name, rootDir, namespace);
    if (packageJson.name && nextName && packageJson.name !== nextName) {
      renameMap.set(packageJson.name, nextName);
    }
  }

  for (const packageJsonPath of packageJsonFiles) {
    const packageJson = readJson(packageJsonPath);
    const nextName = computeScopedPackageName(packageJsonPath, packageJson.name, rootDir, namespace);
    if (nextName) {
      packageJson.name = nextName;
    }
    renameDependencyBlock(packageJson, "dependencies", renameMap);
    renameDependencyBlock(packageJson, "devDependencies", renameMap);
    renameDependencyBlock(packageJson, "peerDependencies", renameMap);
    renameDependencyBlock(packageJson, "optionalDependencies", renameMap);
    writeJson(packageJsonPath, packageJson);
  }
}

function findPackageJsonFiles(rootDir) {
  const results = [];
  walk(rootDir, (entryPath, dirent) => {
    if (dirent.isDirectory()) {
      if (shouldSkipDirectory(dirent.name)) {
        return "skip";
      }
      return;
    }
    if (dirent.isFile() && dirent.name === "package.json") {
      results.push(entryPath);
    }
  });
  return results.sort();
}

function walk(currentDir, visitor) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);
    const result = visitor(entryPath, entry);
    if (result === "skip") {
      continue;
    }
    if (entry.isDirectory()) {
      walk(entryPath, visitor);
    }
  }
}

function shouldSkipDirectory(name) {
  return name === "node_modules" || name === ".git" || name === ".next" || name === "dist" || name === ".turbo" || name === ".expo";
}

function computeScopedPackageName(packageJsonPath, currentName, rootDir, namespace) {
  const relativeDir = path.relative(rootDir, path.dirname(packageJsonPath));
  const defaultSlug = slugify(path.basename(path.dirname(packageJsonPath)));

  if (relativeDir === "") {
    return `${namespace}/${slugify(path.basename(rootDir))}`;
  }

  if (typeof currentName === "string" && currentName.startsWith("@") && currentName.includes("/")) {
    return `${namespace}/${currentName.split("/")[1]}`;
  }

  if (typeof currentName === "string" && currentName.trim()) {
    return `${namespace}/${slugify(currentName.replace(/^@/, "").split("/").pop())}`;
  }

  return `${namespace}/${defaultSlug}`;
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function renameDependencyBlock(packageJson, field, renameMap) {
  if (!packageJson[field]) {
    return;
  }
  const nextBlock = {};
  for (const [dependencyName, version] of Object.entries(packageJson[field])) {
    const nextName = renameMap.get(dependencyName) || dependencyName;
    nextBlock[nextName] = version;
  }
  packageJson[field] = nextBlock;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runSelfTest() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "config-project-fullstack-"));
  try {
    const appDir = path.join(tempRoot, "apps", "frontend");
    const pkgDir = path.join(tempRoot, "packages", "shared");
    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(pkgDir, { recursive: true });

    writeJson(path.join(tempRoot, "package.json"), {
      name: "demo-root",
      private: true,
      devDependencies: { typescript: "7.0.2" },
      workspaces: ["apps/*", "packages/*"],
    });
    writeJson(path.join(tempRoot, "turbo.json"), {
      $schema: "https://turbo.build/schema.json",
    });
    writeJson(path.join(appDir, "package.json"), {
      name: "frontend",
      dependencies: {
        "@repo/shared": "workspace:*",
        react: "19.2.8",
        "react-dom": "19.2.8",
      },
      devDependencies: {
        "@repo/typescript-config": "*",
      },
    });
    const backendDir = path.join(tempRoot, "apps", "backend");
    fs.mkdirSync(backendDir, { recursive: true });
    writeJson(path.join(backendDir, "package.json"), {
      name: "backend",
    });
    const mobileDir = path.join(tempRoot, "apps", "mobile");
    fs.mkdirSync(mobileDir, { recursive: true });
    writeJson(path.join(mobileDir, "package.json"), {
      name: "mobile",
      scripts: { start: "expo start" },
      dependencies: { react: "19.2.3", "react-dom": "19.2.3", "eslint-config-expo": "~57.0.2" },
      devDependencies: { typescript: "~6.0.3" },
    });
    writeJson(path.join(pkgDir, "package.json"), {
      name: "@repo/shared",
    });
    const tsConfigDir = path.join(tempRoot, "packages", "typescript-config");
    fs.mkdirSync(tsConfigDir, { recursive: true });
    writeJson(path.join(tsConfigDir, "package.json"), {
      name: "@repo/typescript-config",
    });

    alignVersionsWithMobile(tempRoot, mobileDir, false);
    const alignedFrontend = readJson(path.join(appDir, "package.json"));
    assert(alignedFrontend.dependencies.react === "19.2.3", "Frontend react should match mobile");
    assert(alignedFrontend.dependencies["react-dom"] === "19.2.3", "Frontend react-dom should match mobile");
    const overriddenRoot = readJson(path.join(tempRoot, "package.json"));
    assert(overriddenRoot.overrides.react === "19.2.3", "Root should override react to the mobile version");
    assert(overriddenRoot.overrides["react-dom"] === "19.2.3", "Root should override react-dom to the mobile version");
    assert(overriddenRoot.devDependencies.typescript === "~6.0.3", "Root typescript should match mobile");
    assert(overriddenRoot.overrides.typescript === "~6.0.3", "Root should override typescript to the mobile version");

    moveToDevDependencies(path.join(mobileDir, "package.json"), ["eslint-config-expo"], false);
    const movedMobile = readJson(path.join(mobileDir, "package.json"));
    assert(!movedMobile.dependencies["eslint-config-expo"], "eslint-config-expo should leave dependencies");
    assert(movedMobile.devDependencies["eslint-config-expo"] === "~57.0.2", "eslint-config-expo should be a devDependency");

    rewriteWorkspaceNamespace(tempRoot, "@acme", false);

    const rootPackage = readJson(path.join(tempRoot, "package.json"));
    const frontendPackage = readJson(path.join(appDir, "package.json"));
    const sharedPackage = readJson(path.join(pkgDir, "package.json"));
    const mobilePackage = readJson(path.join(mobileDir, "package.json"));

    assert(
      rootPackage.name === "@acme/" + slugify(path.basename(tempRoot)),
      "Root package should be scoped"
    );
    assert(frontendPackage.name === "@acme/frontend", "Frontend package should be scoped");
    assert(frontendPackage.dependencies["@acme/shared"] === "workspace:*", "Dependency key should be renamed");
    assert(frontendPackage.devDependencies["@acme/typescript-config"] === "*", "Dev dependency key should be renamed");
    assert(sharedPackage.name === "@acme/shared", "Scoped package should preserve slug");
    assert(mobilePackage.name === "@acme/mobile", "Mobile package should be scoped");

    ensurePackageScripts(path.join(mobileDir, "package.json"), { dev: "expo start" }, false);
    const patchedMobile = readJson(path.join(mobileDir, "package.json"));
    assert(patchedMobile.scripts.dev === "expo start", "Mobile dev script should be added");
    assert(patchedMobile.scripts.start === "expo start", "Existing scripts should be preserved");

    writeJson(path.join(mobileDir, "app.json"), { expo: { plugins: ["expo-router"] } });
    ensureExpoPlugin(path.join(mobileDir, "app.json"), MOBILE_SCENE_PLUGIN_PATH, false);
    ensureExpoPlugin(path.join(mobileDir, "app.json"), MOBILE_SCENE_PLUGIN_PATH, false);
    const appJson = readJson(path.join(mobileDir, "app.json"));
    assert(
      JSON.stringify(appJson.expo.plugins) === JSON.stringify(["expo-router", MOBILE_SCENE_PLUGIN_PATH]),
      "Scene plugin should be registered once"
    );

    const gitignorePath = path.join(mobileDir, ".gitignore");
    fs.writeFileSync(gitignorePath, "node_modules/", "utf8");
    ensureGitignoreEntries(gitignorePath, [".env"], false);
    ensureGitignoreEntries(gitignorePath, [".env"], false);
    assert(
      fs.readFileSync(gitignorePath, "utf8") === "node_modules/\n.env\n",
      "Gitignore entries should be appended once"
    );

    const args = parseArgs(["--namespace", "@acme", "--dry-run"]);
    assert(args.namespace === "@acme", "Namespace parsing failed");
    assert(args.dryRun === true, "Dry-run parsing failed");
    assertThrows(() => parseArgs(["demo"]), "Unexpected argument should be rejected");
    assert(detectManagedWorkspace(tempRoot) === true, "Managed workspace detection failed");

    console.log("[ok] Self-test passed");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(fn, message) {
  let threw = false;
  try {
    fn();
  } catch (error) {
    threw = true;
  }
  if (!threw) {
    throw new Error(message);
  }
}
