// tests/setup/testHelpers.ts
import { User, Project, Task } from '@prisma/client';
import { prisma } from './testDb';

/**
 * Creates a test user
 */
export async function createTestUser(overrides?: Partial<User>): Promise<User> {
  const randomId = Math.random().toString(36).substring(7);
  return prisma.user.create({
    data: {
      email: overrides?.email || `test-${randomId}@example.com`,
      name: overrides?.name || `Test User ${randomId}`,
      authProviderId: overrides?.authProviderId || `auth0|${randomId}`,
    },
  });
}

/**
 * Creates a test project
 */
export async function createTestProject(
  userId: string,
  overrides?: Partial<Project>
): Promise<Project> {
  return prisma.project.create({
    data: {
      name: overrides?.name || 'Test Project',
      description: overrides?.description || 'Test Description',
      userId,
    },
  });
}

/**
 * Creates a test task
 */
export async function createTestTask(
  projectId: string,
  overrides?: Partial<Task>
): Promise<Task> {
  return prisma.task.create({
    data: {
      title: overrides?.title || 'Test Task',
      description: overrides?.description || 'Test Description',
      status: overrides?.status || 'not started',
      priority: overrides?.priority || 'medium',
      position: overrides?.position ?? 0,
      projectId,
    },
  });
}

/**
 * Creates a project collaborator
 */
export async function createCollaborator(
  projectId: string,
  userId: string,
  role: 'editor' | 'viewer' = 'editor'
) {
  return prisma.projectCollaborator.create({
    data: {
      projectId,
      userId,
      role,
    },
  });
}

/**
 * Creates a mock JWT token payload for testing
 * This simulates what Auth0 JWT would contain
 */
export function createMockAuthPayload(user: User) {
  return {
    sub: user.authProviderId,
    email: user.email,
    name: user.name,
  };
}

/**
 * Mock authentication middleware for testing
 * Bypasses Auth0 JWT validation and injects user directly
 */
export function mockAuth(user: User) {
  return (req: any, _res: any, next: any) => {
    req.auth = createMockAuthPayload(user);
    next();
  };
}
