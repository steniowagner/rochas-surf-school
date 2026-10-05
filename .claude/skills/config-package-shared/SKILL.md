---
name: config-package-shared
description: Rebuild the monorepo's base shared package, `@rochas-surf-school/shared` in `packages/shared`, which holds the reusable contracts, base classes, domain errors, use cases and validations consumed by the backend (`apps/backend`), web (`apps/web`) and mobile (`apps/mobile`) apps and by the business modules in `modules/`. Use it to recreate `packages/shared` from this skill's canonical copy, wire it into the apps, or create a variant such as `packages/shared-v2`.
---

# Config Package Shared

Use the `scripts/rebuild-shared.js` script to deterministically rebuild `packages/shared`, or to create a variant such as `packages/shared-v2`.

## Flow

1. Run from the monorepo root:

```bash
SKILL_SCRIPT="$(find . -maxdepth 6 -path "*/config-package-shared/scripts/rebuild-shared.js" ! -path "*/node_modules/*" | head -1)"
node "$SKILL_SCRIPT"
node "$SKILL_SCRIPT" --package-name shared-v2
```

2. The script:
   - recreates `packages/<package-name>` from `assets/shared-template/`;
   - renames the template's `@temp/shared` to `@rochas-surf-school/<package-name>`;
   - when `package-name` is `shared`:
     - adds or normalizes `"@rochas-surf-school/shared": "*"` in `apps/backend`, `apps/web` and `apps/mobile`, unless skipped;
     - does the same for the `modules/*` workspaces that already depend on or import a `@<scope>/shared` package;
   - when `package-name` is not `shared`, does not touch any other workspace's dependencies;
   - runs `npm install`;
   - builds the package with `npx turbo run build --filter=@rochas-surf-school/<package-name>`;
   - runs the package's tests with `npm run test --workspace @rochas-surf-school/<package-name>`;
   - reports the recreated package and the updated workspaces.

## Flags

- `--package-name <name>`: create `packages/<name>` instead of `packages/shared`.
- `--force`: recreate `packages/<name>` when a variant with that name already exists.
- `--skip-backend`: do not add the dependency to `apps/backend`.
- `--skip-web`: do not add the dependency to `apps/web`.
- `--skip-mobile`: do not add the dependency to `apps/mobile`.

## Canonical base

The whole deterministic base lives inside this skill:

- `assets/shared-template/package.json`
- `assets/shared-template/tsconfig.json`
- `assets/shared-template/jest.config.ts`
- `assets/shared-template/src/**`
- `assets/shared-template/test/**`

Do not depend on external templates, scripts or folders to rebuild the package.

## How the apps consume it

The package compiles to CommonJS in `dist/` (it extends `packages/typescript-config/base.json`). Each app resolves it through the npm workspace link:

- `apps/backend` (NestJS, ESM): `import { Validator } from '@rochas-surf-school/shared';`. Node loads the CommonJS build and exposes its named exports.
- `apps/web` (Next.js) and `apps/mobile` (Expo/Metro): import it the same way; they bundle the built `dist/`.

Because the apps read `dist/`, build the package (`npx turbo run build --filter=@rochas-surf-school/shared`) before type-checking or running an app on a fresh checkout. `turbo run build` already does this through `dependsOn: ["^build"]`.

## Constraints

- Do not copy `dist`, `coverage`, `.turbo` or `node_modules`.
- Always use the `@rochas-surf-school` scope; do not hard-code any other scope in the skill's base files.
- Do not use `file:` or local links when normalizing the shared dependency; use `"*"` and let npm workspaces link it.
- Do not generate the package files ad hoc at runtime; always copy the faithful base from `assets/shared-template/`.
- Do not overwrite an existing variant package without explicit intent: for names other than `shared`, fail if `packages/<package-name>` already exists unless `--force` is passed.

## Maintenance

When `packages/shared` changes and the skill needs to follow the new canonical base, update the files in `assets/shared-template/` first, keeping `@temp/shared` as the name in the template's `package.json`.
