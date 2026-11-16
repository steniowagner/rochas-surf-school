import { getDatabaseUrl } from '../src/db/database-url.js';

// The e2e suite never runs against the database the backend uses (`DATABASE_URL` or `DATABASE_*`), only against
// its own: `E2E_DATABASE_URL` when set, otherwise the same server with `_e2e` added to the database name
// (`rochas_surf_school` → `rochas_surf_school_e2e`). The suites read every class of the database, so a dev
// database's own classes would break them.
export function getE2eDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const devUrl = new URL(getDatabaseUrl(env));
  const url = new URL(env.E2E_DATABASE_URL || withDatabaseName(devUrl, `${databaseName(devUrl)}_e2e`).href);

  if (!databaseName(url)) {
    throw new Error('The e2e database has no name: set DATABASE_NAME (or DATABASE_URL) or E2E_DATABASE_URL.');
  }
  if (sameDatabase(url, devUrl)) {
    throw new Error(
      `E2E_DATABASE_URL names the backend's own database (${databaseName(url)}); the e2e suite needs its own.`,
    );
  }

  return url.href;
}

export function databaseName(url: URL): string {
  return decodeURIComponent(url.pathname.replace(/^\//, ''));
}

export function withDatabaseName(url: URL, name: string): URL {
  const copy = new URL(url.href);
  copy.pathname = `/${encodeURIComponent(name)}`;
  return copy;
}

function sameDatabase(a: URL, b: URL): boolean {
  return a.hostname === b.hostname && (a.port || '5432') === (b.port || '5432') && databaseName(a) === databaseName(b);
}
