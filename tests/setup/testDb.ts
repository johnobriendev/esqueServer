// tests/setup/testDb.ts
import { PrismaClient } from '@prisma/client';

// Allow import without error - check at runtime instead
let prismaInstance: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    // Runtime check when actually used
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error(
        'TEST_DATABASE_URL is not set. Tests require a separate test database. ' +
        'Never run tests against production!'
      );
    }

    // Safety: check not pointing to production
    if (process.env.TEST_DATABASE_URL.includes('neondb')) {
      throw new Error(
        'TEST_DATABASE_URL appears to point to production database. ' +
        'Tests require a separate test database!'
      );
    }

    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL,
        },
      },
    });
  }
  return prismaInstance;
}

/**
 * Clears all data from the test database
 * ONLY call this in test environment with TEST_DATABASE_URL set
 */
export async function clearDatabase() {
  const client = getPrisma();

  const tables = [
    'TaskComment',
    'Task',
    'ProjectInvitation',
    'ProjectCollaborator',
    'Project',
    'User',
  ];

  for (const table of tables) {
    await client.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
}

/**
 * Disconnects from the database
 */
export async function disconnectDatabase() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
  }
}

// Export prisma as getter function
export const prisma = getPrisma;
