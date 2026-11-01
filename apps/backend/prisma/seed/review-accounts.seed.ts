import { randomUUID } from 'node:crypto';

import { parseReviewAccounts } from '../../src/modules/auth/auth.config.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';

/**
 * Upserts the App Store / Google Play review accounts from `REVIEW_ACCOUNTS` (D-15): one user per entry, with that
 * name, role and status, and an `email` identity. Running it again changes nothing. The deploy runs it, so an existing
 * `pending` entry is left alone: testers approve those accounts and change their roles.
 */
export async function reviewAccountsSeed(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  for (const account of parseReviewAccounts(env.REVIEW_ACCOUNTS)) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      create: {
        id: randomUUID(),
        email: account.email,
        name: account.name,
        role: account.role,
        status: account.status,
      },
      update:
        account.status === 'approved'
          ? { name: account.name, role: account.role, status: account.status }
          : {},
    });
    await prisma.identity.upsert({
      where: {
        provider_providerUserId: { provider: 'email', providerUserId: account.email },
      },
      create: {
        id: randomUUID(),
        userId: user.id,
        provider: 'email',
        providerUserId: account.email,
        email: account.email,
      },
      update: {},
    });
  }
}
