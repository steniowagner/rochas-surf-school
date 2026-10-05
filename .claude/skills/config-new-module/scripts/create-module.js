#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REQUIRED_WORKSPACES = ["apps/*", "modules/*", "packages/*"];
const ROOT_TS_NODE_VERSION = "^10.9.2";
// Every module is published under the project scope: @rochas-surf-school/<module-name>.
const NAMESPACE = "@rochas-surf-school";
const TEMPLATE_FILES = [
  "jest.config.ts",
  "package.json",
  "tsconfig.json",
  "src/index.ts",
  "test/index.test.ts",
];
const NESTJS_TEMPLATE_FILES = [
  { template: "module.ts", output: "__MODULE_NAME__.module.ts" },
  { template: "controller.ts", output: "__MODULE_NAME__.controller.ts" },
];
const WEB_TEMPLATE_FILES = [
  {
    template: "route-page.tsx",
    output: path.join("app", "(private)", "__MODULE_NAME__", "page.tsx"),
  },
  {
    template: "page.tsx",
    output: path.join("modules", "__MODULE_NAME__", "pages", "__MODULE_NAME__.page.tsx"),
  },
  {
    template: "component.tsx",
    output: path.join(
      "modules",
      "__MODULE_NAME__",
      "components",
      "__MODULE_NAME__.component.tsx",
    ),
  },
];
const MOBILE_TEMPLATE_FILES = [
  {
    template: "route-screen.tsx",
    output: path.join("app", "(private)", "__MODULE_NAME__", "index.tsx"),
  },
  {
    template: "screen.tsx",
    output: path.join("modules", "__MODULE_NAME__", "screens", "__MODULE_NAME__.screen.tsx"),
  },
  {
    template: "component.tsx",
    output: path.join(
      "modules",
      "__MODULE_NAME__",
      "components",
      "__MODULE_NAME__.component.tsx",
    ),
  },
];

function main() {
  const args = parseArgs(process.argv.slice(2));
  const moduleName = args.module;
  const namespace = NAMESPACE;
  const workspaceRoot = args["workspace-root"] ?? "modules";
  const skipWeb = Boolean(args["skip-web"]);
  const skipMobile = Boolean(args["skip-mobile"]);
  const skipBackend = Boolean(args["skip-backend"]);
  // --skip-backend skips the whole backend; --skip-nestjs keeps the dependency but skips the NestJS module.
  const skipNestjs = skipBackend || Boolean(args["skip-nestjs"]);
  const addToModules = Boolean(args["add-to-modules"]);

  if (!moduleName) {
    fail("Provide --module <module-name>.");
  }

  if (!/^[a-z0-9-]+$/.test(moduleName)) {
    fail("The module name must use only lowercase letters, numbers and hyphens.");
  }

  if (!["modules", "packages"].includes(workspaceRoot)) {
    fail("Provide --workspace-root modules or --workspace-root packages.");
  }

  const projectRoot = process.cwd();
  const rootPackagePath = path.join(projectRoot, "package.json");
  const webPackagePath = path.join(projectRoot, "apps", "web", "package.json");
  const mobilePackagePath = path.join(projectRoot, "apps", "mobile", "package.json");
  const backendPackagePath = path.join(projectRoot, "apps", "backend", "package.json");
  const appModulePath = path.join(projectRoot, "apps", "backend", "src", "app.module.ts");
  const webSrcDir = path.join(projectRoot, "apps", "web", "src");
  const mobileSrcDir = path.join(projectRoot, "apps", "mobile", "src");
  const workspaceDir = path.join(projectRoot, workspaceRoot);
  const moduleDir = path.join(workspaceDir, moduleName);
  const templateDir = path.resolve(__dirname, "..", "assets", "module-template");
  const nestjsTemplateDir = path.resolve(__dirname, "..", "assets", "nestjs-module-template");
  const webTemplateDir = path.resolve(__dirname, "..", "assets", "web-module-template");
  const mobileTemplateDir = path.resolve(__dirname, "..", "assets", "mobile-module-template");
  const packageName = `${namespace}/${moduleName}`;
  const moduleClassName = toPascalCase(moduleName);
  const moduleDisplayName = toDisplayName(moduleName);
  const uiReplacements = {
    "__MODULE_NAME__": moduleName,
    "__MODULE_CLASS_NAME__": moduleClassName,
    "__MODULE_DISPLAY_NAME__": moduleDisplayName,
  };

  assertFileExists(rootPackagePath, "Root package.json not found.");
  if (!skipWeb) {
    assertFileExists(webPackagePath, "apps/web/package.json not found.");
    assertDirectoryExists(webSrcDir, "apps/web/src not found.");
  }
  if (!skipMobile) {
    assertFileExists(mobilePackagePath, "apps/mobile/package.json not found.");
    assertDirectoryExists(mobileSrcDir, "apps/mobile/src not found.");
  }
  if (!skipBackend) {
    assertFileExists(backendPackagePath, "apps/backend/package.json not found.");
  }
  if (!skipNestjs) {
    assertFileExists(appModulePath, "apps/backend/src/app.module.ts not found.");
  }

  if (!fs.existsSync(templateDir)) {
    fail(`Module template not found at ${templateDir}.`);
  }

  if (!skipNestjs && !fs.existsSync(nestjsTemplateDir)) {
    fail(`NestJS template not found at ${nestjsTemplateDir}.`);
  }

  if (!skipWeb && !fs.existsSync(webTemplateDir)) {
    fail(`Web template not found at ${webTemplateDir}.`);
  }

  if (!skipMobile && !fs.existsSync(mobileTemplateDir)) {
    fail(`Mobile template not found at ${mobileTemplateDir}.`);
  }

  if (fs.existsSync(moduleDir)) {
    fail(`Module ${moduleName} already exists at ${workspaceRoot}/${moduleName}.`);
  }

  const nestjsModuleDir = path.join(projectRoot, "apps", "backend", "src", "modules", moduleName);
  if (!skipNestjs && fs.existsSync(nestjsModuleDir)) {
    fail(`NestJS module ${moduleName} already exists at apps/backend/src/modules/${moduleName}.`);
  }

  const webModuleDir = path.join(webSrcDir, "modules", moduleName);
  const webPrivateRouteDir = path.join(webSrcDir, "app", "(private)", moduleName);

  if (!skipWeb && fs.existsSync(webModuleDir)) {
    fail(`Web module ${moduleName} already exists at apps/web/src/modules/${moduleName}.`);
  }

  if (!skipWeb && fs.existsSync(webPrivateRouteDir)) {
    fail(
      `Private route for module ${moduleName} already exists at apps/web/src/app/(private)/${moduleName}.`,
    );
  }

  const mobileModuleDir = path.join(mobileSrcDir, "modules", moduleName);
  const mobilePrivateRouteDir = path.join(mobileSrcDir, "app", "(private)", moduleName);

  if (!skipMobile && fs.existsSync(mobileModuleDir)) {
    fail(`Mobile module ${moduleName} already exists at apps/mobile/src/modules/${moduleName}.`);
  }

  if (!skipMobile && fs.existsSync(mobilePrivateRouteDir)) {
    fail(
      `Mobile private route for module ${moduleName} already exists at apps/mobile/src/app/(private)/${moduleName}.`,
    );
  }

  fs.mkdirSync(workspaceDir, { recursive: true });

  log(`Creating ${workspaceRoot}/${moduleName}`);
  fs.mkdirSync(moduleDir, { recursive: true });
  materializeTemplate(templateDir, moduleDir, {
    "__MODULE_NAME__": moduleName,
    "__NAMESPACE__": namespace,
    "__PACKAGE_NAME__": packageName,
  });

  log("Updating root package.json");
  const rootPackage = readJson(rootPackagePath);
  rootPackage.devDependencies = sortObjectKeys({
    ...(rootPackage.devDependencies ?? {}),
    "ts-node": ROOT_TS_NODE_VERSION,
  });
  rootPackage.workspaces = ensureWorkspaces(rootPackage.workspaces);
  writeJson(rootPackagePath, rootPackage);

  if (!skipWeb) {
    log("Adding the module dependency to the web app");
    updateWorkspaceDependency(webPackagePath, packageName);
  }

  if (!skipMobile) {
    log("Adding the module dependency to the mobile app");
    updateWorkspaceDependency(mobilePackagePath, packageName);
  }

  if (!skipBackend) {
    log("Adding the module dependency to the backend");
    updateWorkspaceDependency(backendPackagePath, packageName);
  }

  if (!skipWeb) {
    log(`Creating the web module structure for ${moduleName}`);
    materializeUiTemplate(
      webTemplateDir,
      webSrcDir,
      WEB_TEMPLATE_FILES,
      uiReplacements,
      "web",
    );
  }

  if (!skipMobile) {
    log(`Creating the mobile module structure for ${moduleName}`);
    materializeUiTemplate(
      mobileTemplateDir,
      mobileSrcDir,
      MOBILE_TEMPLATE_FILES,
      uiReplacements,
      "mobile",
    );
  }

  if (!skipNestjs) {
    log(`Creating apps/backend/src/modules/${moduleName}`);
    materializeNestjsTemplate(nestjsTemplateDir, nestjsModuleDir, moduleName, moduleClassName);
  }

  if (!skipNestjs) {
    log("Registering the module in the backend AppModule");
    registerNestjsModule(appModulePath, moduleName, moduleClassName);
  }

  if (addToModules) {
    log("Updating business module dependencies");
    updateModuleWorkspaceDependencies(projectRoot, packageName);
  }

  runCommand("npm", ["install"], projectRoot);
  runCommand("npm", ["run", "build"], projectRoot);
  runCommand("npm", ["run", "test", "--workspace", packageName], projectRoot);

  log(`Module ${packageName} created successfully.`);
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === "--module") {
      args.module = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === "--workspace-root") {
      args["workspace-root"] = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === "--skip-web") {
      args["skip-web"] = true;
      continue;
    }

    if (current === "--skip-mobile") {
      args["skip-mobile"] = true;
      continue;
    }

    if (current === "--skip-backend") {
      args["skip-backend"] = true;
      continue;
    }

    if (current === "--skip-nestjs") {
      args["skip-nestjs"] = true;
      continue;
    }

    if (current === "--add-to-modules") {
      args["add-to-modules"] = true;
      continue;
    }

    if (current === "--help" || current === "-h") {
      printHelp();
      process.exit(0);
    }

    fail(`Unknown argument: ${current}`);
  }

  return args;
}

function printHelp() {
  console.log(
    `Usage: node ${process.argv[1]} --module <name> [--workspace-root modules|packages] [--skip-web] [--skip-mobile] [--skip-backend] [--skip-nestjs] [--add-to-modules]`,
  );
}

function assertFileExists(filePath, message) {
  if (!fs.existsSync(filePath)) {
    fail(message);
  }
}

function assertDirectoryExists(directoryPath, message) {
  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
    fail(message);
  }
}

function materializeTemplate(templateDir, targetDir, replacements) {
  for (const relativeFile of TEMPLATE_FILES) {
    const sourcePath = path.join(templateDir, relativeFile);
    const targetPath = path.join(targetDir, relativeFile);
    const targetParent = path.dirname(targetPath);

    assertFileExists(sourcePath, `Missing template file: ${relativeFile}`);
    fs.mkdirSync(targetParent, { recursive: true });

    let content = fs.readFileSync(sourcePath, "utf8");
    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.split(placeholder).join(value);
    }

    fs.writeFileSync(targetPath, content, "utf8");
  }
}

function materializeUiTemplate(templateDir, srcDir, templateFiles, replacements, appName) {
  for (const { template, output } of templateFiles) {
    const sourcePath = path.join(templateDir, template);
    const outputPath = replacePlaceholders(output, replacements);
    const targetPath = path.join(srcDir, outputPath);
    const targetParent = path.dirname(targetPath);

    assertFileExists(sourcePath, `Missing ${appName} template file: ${template}`);
    fs.mkdirSync(targetParent, { recursive: true });

    let content = fs.readFileSync(sourcePath, "utf8");
    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.split(placeholder).join(value);
    }

    fs.writeFileSync(targetPath, content, "utf8");
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function ensureWorkspaces(currentValue) {
  const current = Array.isArray(currentValue) ? currentValue : [];
  const extras = current.filter((entry) => !REQUIRED_WORKSPACES.includes(entry));
  return [...new Set([...REQUIRED_WORKSPACES, ...extras])];
}

function updateWorkspaceDependency(packagePath, packageName) {
  const packageJson = readJson(packagePath);
  packageJson.dependencies = sortObjectKeys({
    ...(packageJson.dependencies ?? {}),
    [packageName]: "*",
  });
  writeJson(packagePath, packageJson);
}

function updateModuleWorkspaceDependencies(projectRoot, packageName) {
  const modulesDir = path.join(projectRoot, "modules");

  if (!fs.existsSync(modulesDir)) {
    return;
  }

  const entries = fs.readdirSync(modulesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packagePath = path.join(modulesDir, entry.name, "package.json");
    if (!fs.existsSync(packagePath)) {
      continue;
    }

    const packageJson = readJson(packagePath);
    if (packageJson.name === packageName) {
      continue;
    }

    packageJson.dependencies = sortObjectKeys({
      ...(packageJson.dependencies ?? {}),
      [packageName]: "*",
    });
    writeJson(packagePath, packageJson);
  }
}

function sortObjectKeys(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function runCommand(command, args, cwd) {
  log(`Running: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    fail(`Failed to start the command: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function toPascalCase(name) {
  return name.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
}

function toDisplayName(name) {
  return name.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function replacePlaceholders(value, replacements) {
  let result = value;

  for (const [placeholder, replacement] of Object.entries(replacements)) {
    result = result.split(placeholder).join(replacement);
  }

  return result;
}

function materializeNestjsTemplate(templateDir, targetDir, moduleName, moduleClassName) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const { template, output } of NESTJS_TEMPLATE_FILES) {
    const sourcePath = path.join(templateDir, template);
    const outputFileName = output.replace("__MODULE_NAME__", moduleName);
    const targetPath = path.join(targetDir, outputFileName);

    assertFileExists(sourcePath, `Missing NestJS template file: ${template}`);

    let content = fs.readFileSync(sourcePath, "utf8");
    content = content.split("__MODULE_NAME__").join(moduleName);
    content = content.split("__MODULE_CLASS_NAME__").join(moduleClassName);

    fs.writeFileSync(targetPath, content, "utf8");
  }
}

function registerNestjsModule(appModulePath, moduleName, moduleClassName) {
  let content = fs.readFileSync(appModulePath, "utf8");

  if (content.includes(`${moduleClassName}Module`)) {
    log(`${moduleClassName}Module is already registered in AppModule. Skipping.`);
    return;
  }

  // 1. Add the import after the last existing import
  const importStatement = `import { ${moduleClassName}Module } from './modules/${moduleName}/${moduleName}.module.js';`;
  const lines = content.split("\n");
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith("import ")) lastImportIndex = i;
  }

  if (lastImportIndex === -1) {
    fail("Could not find any imports in app.module.ts.");
  }

  lines.splice(lastImportIndex + 1, 0, importStatement);
  content = lines.join("\n");

  // 2. Add the module to the imports array by counting brackets
  const importsArrayStart = content.indexOf("imports: [");
  if (importsArrayStart === -1) {
    fail("Could not find imports: [ in app.module.ts.");
  }

  let depth = 0;
  let closingBracketPos = -1;

  for (let i = importsArrayStart + "imports: ".length; i < content.length; i += 1) {
    if (content[i] === "[") depth += 1;
    else if (content[i] === "]") {
      depth -= 1;
      if (depth === 0) {
        closingBracketPos = i;
        break;
      }
    }
  }

  if (closingBracketPos === -1) {
    fail("Could not find the end of the imports array in app.module.ts.");
  }

  const lineStart = content.lastIndexOf("\n", closingBracketPos) + 1;
  const indent = content.slice(lineStart, closingBracketPos);
  content = content.slice(0, lineStart) + indent + "  " + `${moduleClassName}Module,\n` + content.slice(lineStart);

  fs.writeFileSync(appModulePath, content, "utf8");
}

function log(message) {
  console.log(`[config-new-module] ${message}`);
}

function fail(message) {
  console.error(`[config-new-module] ${message}`);
  process.exit(1);
}

main();
