# Script Contract

Use `scripts/create-project.js` for all project creation work.

## Command

```bash
node "$(find . -maxdepth 6 -path "*/config-project-fullstack/scripts/create-project.js" ! -path "*/node_modules/*" | head -1)" [--namespace @scope] [--force-clean] [--dry-run]
```

## Guarantees

- Create the workspace in the current directory as the final destination.
- Scaffold a Turbo workspace with npm using the exact sequence requested by the user.
- Remove Turbo's default `apps/*` and demo `packages/ui`.
- Produce `apps/frontend` on port `3000`.
- Produce `apps/backend` on port `4000` with `ConfigModule.forRoot({ isGlobal: true })` and `app.enableCors()`.
- Produce `apps/mobile` with Expo (`create-expo-app` default template), `eslint-config-expo` flat config in `eslint.config.js`, and `EXPO_PUBLIC_API_URL=http://localhost:4000`.
- Align `react`, `react-dom`, `@types/react`, and `typescript` across all workspaces to the exact version pinned by the Expo app, enforced with root `overrides`, and keep the Babel 7 required by Expo's Metro config at the workspace root.
- Register the `with-ios-scene-lifecycle` config plugin in mobile so native iOS builds launch on iOS 27.
- Add `dev` scripts to backend and mobile, and `check-types` to frontend, backend, and mobile; frontend and mobile generate framework types before running `tsc --noEmit`.
- Create both `.env.example` and `.env` in frontend, backend, and mobile.
- Refresh dependencies at the root after the workspace is patched.

## Safety

- Refuse to use the filesystem root as the target directory.
- Refuse to rerun in a directory that already contains the managed fullstack workspace unless `--force-clean` is present.
- Preserve existing files and directories that do not conflict with the generated project paths.
- Refuse to overwrite conflicting paths in the current directory unless `--force-clean` is present.
- Reject invalid namespaces that are not valid npm scopes such as `@acme`.

## Namespace Rules

- Rename the root package and every workspace package to the provided scope.
- Preserve the package slug when an existing package already has a scoped name.
- Rename local dependency keys across `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies`.
