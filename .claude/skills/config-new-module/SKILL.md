---
name: config-new-module
description: Deterministically create a new business module inside `modules/` in this monorepo from a module name, always published as `@rochas-surf-school/<module-name>`; scaffold the matching NestJS module in `apps/backend/src/modules/<module-name>` with a controller and automatic registration in AppModule; create the base web structure at `apps/web/src/app/(private)/<module-name>/page.tsx`, `apps/web/src/modules/<module-name>/pages/<module-name>.page.tsx` and `apps/web/src/modules/<module-name>/components/<module-name>.component.tsx`; and create the base mobile structure at `apps/mobile/src/app/(private)/<module-name>/index.tsx`, `apps/mobile/src/modules/<module-name>/screens/<module-name>.screen.tsx` and `apps/mobile/src/modules/<module-name>/components/<module-name>.component.tsx`. Use when you need to scaffold a workspace such as `modules/auth`, copy this skill's fixed templates, register the module dependency in `apps/web`, `apps/mobile` and `apps/backend`, ensure `ts-node` and `modules/*` in the root `package.json`, install dependencies, run the project build and run the new module's tests.
---

# Config New Module

Use the `scripts/create-module.js` script instead of recreating the structure by hand.

## Flow

1. Confirm the request explicitly provides a `module name`. The npm namespace is always `@rochas-surf-school`; it is not an argument.
2. Run from the project root:

```bash
node "$(find . -maxdepth 6 -path "*/config-new-module/scripts/create-module.js" ! -path "*/node_modules/*" | head -1)" --module auth
```

3. Verify at the end:
   - `modules/<module-name>` created.
   - `apps/backend/src/modules/<module-name>/<module-name>.module.ts` created.
   - `apps/backend/src/modules/<module-name>/<module-name>.controller.ts` created.
   - `apps/web/src/app/(private)/<module-name>/page.tsx` created.
   - `apps/web/src/modules/<module-name>/pages/<module-name>.page.tsx` created.
   - `apps/web/src/modules/<module-name>/components/<module-name>.component.tsx` created.
   - `apps/mobile/src/app/(private)/<module-name>/index.tsx` created.
   - `apps/mobile/src/modules/<module-name>/screens/<module-name>.screen.tsx` created.
   - `apps/mobile/src/modules/<module-name>/components/<module-name>.component.tsx` created.
   - `apps/backend/src/app.module.ts` importing and registering `<ModuleName>Module`.
   - `apps/web/package.json`, `apps/mobile/package.json` and `apps/backend/package.json` containing `@rochas-surf-school/<module-name>`.
   - Root `package.json` containing `ts-node` in `devDependencies`.
   - Root `package.json` containing `modules/*` in `workspaces`.
   - `npm install`, `npm run build` and `npm run test --workspace @rochas-surf-school/<module-name>` completed successfully.

## Behavior

- Create `modules/` if it does not exist yet.
- Refuse to run when `modules/<module-name>` already exists.
- Refuse to run when `apps/backend/src/modules/<module-name>` already exists.
- Refuse to run when `apps/web/src/modules/<module-name>` or `apps/web/src/app/(private)/<module-name>` already exists.
- Refuse to run when `apps/mobile/src/modules/<module-name>` or `apps/mobile/src/app/(private)/<module-name>` already exists.
- Copy the files from `assets/module-template/` and replace the placeholders with the given module name and the `@rochas-surf-school` namespace.
- Copy the files from `assets/nestjs-module-template/` to `apps/backend/src/modules/<module-name>/`, replacing `__MODULE_NAME__` and `__MODULE_CLASS_NAME__` (PascalCase of the name).
- Copy the files from `assets/web-module-template/` to `apps/web/src/`, replacing `__MODULE_NAME__`, `__MODULE_CLASS_NAME__` (PascalCase) and `__MODULE_DISPLAY_NAME__` (Title Case).
- Copy the files from `assets/mobile-module-template/` to `apps/mobile/src/`, with the same placeholders as the web app.
- Add the import and registration of `<ModuleName>Module` to `apps/backend/src/app.module.ts`.
- Ensure the module dependency in `apps/web/package.json`, `apps/mobile/package.json` and `apps/backend/package.json`.
- Ensure `ts-node@^10.9.2` in the root `package.json`.
- Ensure `apps/*`, `modules/*` and `packages/*` in `workspaces`, preserving any existing extra entries.
- Leave unrelated files untouched.
- Skip an app with these flags (they can be combined):
  - `--skip-web`: skip the web app (`apps/web`): no dependency, no route, page or component.
  - `--skip-mobile`: skip the mobile app (`apps/mobile`): no dependency, no route, screen or component.
  - `--skip-backend`: skip the backend (`apps/backend`): no dependency, no NestJS module, no AppModule registration.
  - `--skip-nestjs`: keep the backend dependency but skip the NestJS module and AppModule registration.

## Templates

The workspace base files live in `assets/module-template/`:

- `jest.config.ts`
- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `test/index.test.ts`

The NestJS module base files live in `assets/nestjs-module-template/`:

- `module.ts` → copied as `<module-name>.module.ts`
- `controller.ts` → copied as `<module-name>.controller.ts`

The web base files live in `assets/web-module-template/`:

- `route-page.tsx` → copied as `app/(private)/<module-name>/page.tsx`
- `page.tsx` → copied as `modules/<module-name>/pages/<module-name>.page.tsx`
- `component.tsx` → copied as `modules/<module-name>/components/<module-name>.component.tsx`

The mobile base files live in `assets/mobile-module-template/`:

- `route-screen.tsx` → copied as `app/(private)/<module-name>/index.tsx` (Expo Router route)
- `screen.tsx` → copied as `modules/<module-name>/screens/<module-name>.screen.tsx`
- `component.tsx` → copied as `modules/<module-name>/components/<module-name>.component.tsx`

Placeholders replaced in the NestJS templates: `__MODULE_NAME__` (kebab-case) and `__MODULE_CLASS_NAME__` (PascalCase).
Placeholders replaced in the web and mobile templates: `__MODULE_NAME__` (kebab-case), `__MODULE_CLASS_NAME__` (PascalCase) and `__MODULE_DISPLAY_NAME__` (Title Case).

Edit these files before running the script only when the default template needs to change.

## Constraints

- Always use the `@rochas-surf-school` namespace; do not ask for or pass a different one.
- Do not skip `npm install`, `npm run build` or the test of the created workspace.
- Do not create extra documentation outside the skill's own resources.
