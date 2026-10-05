import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Keep in sync with src/db/database-url.ts.
function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const user = encodeURIComponent(env.DATABASE_USER ?? '');
  const password = encodeURIComponent(env.DATABASE_PASSWORD ?? '');
  const host = env.DATABASE_HOST ?? 'localhost';
  const port = env.DATABASE_PORT ?? '5432';
  const database = env.DATABASE_NAME ?? '';

  return `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`;
}

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed/main.ts',
  },
  datasource: {
    url: getDatabaseUrl(),
  },
});
