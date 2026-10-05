import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { getDatabaseUrl } from '../../src/db/database-url.js';
import { PrismaClient } from '../../src/generated/prisma/client.js';

type SeedTask = (prisma: PrismaClient) => Promise<void>;

// Register module seed tasks here.
const seedTasks: SeedTask[] = [];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
});

async function main() {
  for (const task of seedTasks) {
    await task(prisma);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
