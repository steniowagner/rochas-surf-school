import 'dotenv/config';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

import { getE2eDatabaseUrl } from './test/e2e-database.js';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // The suites share the single rules_versions row, so they can't run side by side.
    fileParallelism: false,
    // Their own database (`<DATABASE_NAME>_e2e`, or E2E_DATABASE_URL), created and migrated by the global setup.
    // DATABASE_URL wins over DATABASE_* in getDatabaseUrl, and @nestjs/config never overrides a set variable.
    env: { DATABASE_URL: getE2eDatabaseUrl() },
    globalSetup: ['./test/global-setup.ts'],
  },
});
