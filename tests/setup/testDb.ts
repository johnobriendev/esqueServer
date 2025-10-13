// tests/setup/testDb.ts
import { PrismaClient } from '@prisma/client';

// SAFETY CHECK: Ensure we ONLY run tests against a test database
if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL is not set. Tests require a separate test database. ' +
    'Never run tests against production!'
  );
}

// Additional safety: check that we're not accidentally pointing to production
if (process.env.TEST_DATABASE_URL.includes('neondb')) {
  throw new Error(
    'TEST_DATABASE_URL appears to point to production database. ' +
    'Tests require a separate test database!'
  );
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

/**
 * Clears all data from the test database
 * ONLY call this in test environment with TEST_DATABASE_URL set
 */
export async function clearDatabase() {
  // Double check we're in test mode
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('Cannot clear database: TEST_DATABASE_URL not set');
  }

  const tables = [
    'TaskComment',
    'Task',
    'ProjectInvitation',
    'ProjectCollaborator',
    'Project',
    'User',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
}

/**
 * Disconnects from the database
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}

export { prisma };
