import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { getDatabaseUrl } from '../../src/db/database-url.js';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { resetStagingSeed } from './reset-staging.seed.js';

// `npm run reset-staging -- <database host>`: wipes the database and seeds the test accounts. It erases everything, so
// it asks for the host it will run on. The deploy never runs it.
const url = getDatabaseUrl();
const host = new URL(url).hostname;

if (process.argv[2] !== host) {
  console.error(`This erases all the data on ${host}. To confirm, pass that host as the argument.`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

resetStagingSeed(prisma)
  .then(async () => {
    const users = await prisma.user.count();
    console.log(`Wiped ${host} and seeded ${users} accounts.`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
