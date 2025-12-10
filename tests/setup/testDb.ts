// tests/setup/testDb.ts
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../../src/services/encryptionService';

// Allow import without error - check at runtime instead
let prismaInstance: any = null;

function getPrisma() {
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

    // Use same extended client as production
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL,
        },
      },
    })
      .$extends({
        result: {
          project: {
            name: {
              needs: { name: true },
              compute(project) {
                return decrypt(project.name) || project.name;
              },
            },
            description: {
              needs: { description: true },
              compute(project) {
                return decrypt(project.description) || project.description;
              },
            },
          },
          task: {
            title: {
              needs: { title: true },
              compute(task) {
                return decrypt(task.title) || task.title;
              },
            },
            description: {
              needs: { description: true },
              compute(task) {
                return decrypt(task.description) || task.description;
              },
            },
          },
          taskComment: {
            content: {
              needs: { content: true },
              compute(taskComment) {
                return decrypt(taskComment.content) || taskComment.content;
              },
            },
          },
        },
      })
      .$extends({
        query: {
          project: {
            create({ args, query }) {
              if (args.data.name) {
                args.data.name = encrypt(args.data.name) || args.data.name;
              }
              if (args.data.description) {
                args.data.description = encrypt(args.data.description) || args.data.description;
              }
              return query(args);
            },
            update({ args, query }) {
              if (args.data.name) {
                args.data.name = encrypt(args.data.name as string) || args.data.name;
              }
              if (args.data.description) {
                args.data.description = encrypt(args.data.description as string) || args.data.description;
              }
              return query(args);
            },
            upsert({ args, query }) {
              if (args.create.name) {
                args.create.name = encrypt(args.create.name) || args.create.name;
              }
              if (args.create.description) {
                args.create.description = encrypt(args.create.description) || args.create.description;
              }
              if (args.update.name) {
                args.update.name = encrypt(args.update.name as string) || args.update.name;
              }
              if (args.update.description) {
                args.update.description = encrypt(args.update.description as string) || args.update.description;
              }
              return query(args);
            },
          },
          task: {
            create({ args, query }) {
              if (args.data.title) {
                args.data.title = encrypt(args.data.title) || args.data.title;
              }
              if (args.data.description) {
                args.data.description = encrypt(args.data.description) || args.data.description;
              }
              return query(args);
            },
            update({ args, query }) {
              if (args.data.title) {
                args.data.title = encrypt(args.data.title as string) || args.data.title;
              }
              if (args.data.description) {
                args.data.description = encrypt(args.data.description as string) || args.data.description;
              }
              return query(args);
            },
            upsert({ args, query }) {
              if (args.create.title) {
                args.create.title = encrypt(args.create.title) || args.create.title;
              }
              if (args.create.description) {
                args.create.description = encrypt(args.create.description) || args.create.description;
              }
              if (args.update.title) {
                args.update.title = encrypt(args.update.title as string) || args.update.title;
              }
              if (args.update.description) {
                args.update.description = encrypt(args.update.description as string) || args.update.description;
              }
              return query(args);
            },
          },
          taskComment: {
            create({ args, query }: any) {
              if (args.data.content) {
                args.data.content = encrypt(args.data.content) || args.data.content;
              }
              return query(args);
            },
            update({ args, query }: any) {
              if (args.data.content) {
                args.data.content = encrypt(args.data.content as string) || args.data.content;
              }
              return query(args);
            },
            upsert({ args, query }: any) {
              if (args.create.content) {
                args.create.content = encrypt(args.create.content) || args.create.content;
              }
              if (args.update.content) {
                args.update.content = encrypt(args.update.content as string) || args.update.content;
              }
              return query(args);
            },
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

  // Use a single transaction to avoid deadlocks
  await client.$executeRawUnsafe(`
    TRUNCATE TABLE "TaskComment", "Task", "ProjectInvitation", "ProjectCollaborator", "Project", "User" CASCADE;
  `);
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
