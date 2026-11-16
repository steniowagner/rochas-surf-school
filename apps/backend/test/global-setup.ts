import { spawnSync } from 'node:child_process';
import pg from 'pg';

import { databaseName, getE2eDatabaseUrl, withDatabaseName } from './e2e-database.js';

// Before the e2e files run: creates the e2e database if it's missing and applies the migrations to it. Never
// touches the backend's own database; the maintenance database `postgres` is only used to run CREATE DATABASE.
export default async function setup(): Promise<void> {
  const url = new URL(getE2eDatabaseUrl());
  const name = databaseName(url);

  const admin = new pg.Client({ connectionString: withDatabaseName(url, 'postgres').href });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (!rowCount) {
      await admin.query(`CREATE DATABASE "${name.replaceAll('"', '""')}"`);
      console.log(`e2e: created the database ${name}`);
    }
  } finally {
    await admin.end();
  }

  const migrate = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url.href },
    encoding: 'utf8',
  });
  if (migrate.status !== 0) {
    throw new Error(`e2e: prisma migrate deploy failed on ${name}\n${migrate.stdout}${migrate.stderr}`);
  }
  console.log(`e2e: database ${name}, migrations applied`);
}
