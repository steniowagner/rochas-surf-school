// Builds the Postgres connection string from the backend's DATABASE_* variables.
// Keep in sync with the copy in prisma.config.ts, which the Prisma CLI loads on its own.
export function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
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
