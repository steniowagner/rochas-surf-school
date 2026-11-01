import { randomUUID } from 'node:crypto';

import { parseReviewAccounts } from '../../src/modules/auth/auth.config.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { reviewAccountsSeed } from './review-accounts.seed.js';

/**
 * Empties every table, then seeds the accounts of `REVIEW_ACCOUNTS`. `_prisma_migrations` stays, and `rules_versions`
 * gets back the row its migration inserted, which the API needs. Refuses an empty `REVIEW_ACCOUNTS` before touching
 * anything, so it can't leave the database without accounts.
 */
export async function resetStagingSeed(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (parseReviewAccounts(env.REVIEW_ACCOUNTS).length === 0) {
    throw new Error('REVIEW_ACCOUNTS has no accounts to seed');
  }

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  const names = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ');

  await prisma.$transaction([
    prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} CASCADE`),
    prisma.rulesVersion.create({ data: { id: randomUUID(), version: 0 } }),
  ]);
  await reviewAccountsSeed(prisma, env);
}
