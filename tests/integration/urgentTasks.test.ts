// tests/integration/urgentTasks.test.ts
import request from 'supertest';
import app from '../../src/app';
import { clearDatabase, prisma } from '../setup/testDb';
import {
  createTestUser,
  createTestProject,
  createTestTask,
  createCollaborator,
} from '../setup/testHelpers';

// Mock the auth middleware
jest.mock('../../src/middleware/auth', () => ({
  checkJwt: (req: any, res: any, next: any) => next(),
  extractUserInfo: (req: any, res: any, next: any) => next(),
}));

describe('Urgent Tasks API Integration Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /api/tasks/urgent', () => {
    it('should return urgent tasks from projects user owns', async () => {
      const owner = await createTestUser();
      const project1 = await createTestProject(owner.id, { name: 'Project 1' });
      const project2 = await createTestProject(owner.id, { name: 'Project 2' });

      // Create urgent tasks in both projects
      const urgentTask1 = await createTestTask(project1.id, {
        title: 'Urgent Task 1',
        priority: 'urgent',
      });
      const urgentTask2 = await createTestTask(project2.id, {
        title: 'Urgent Task 2',
        priority: 'urgent',
      });

      // Create non-urgent task (should not be returned)
      await createTestTask(project1.id, {
        title: 'Normal Task',
        priority: 'medium',
      });

      app.use((req, _res, next) => {
        req.auth = { sub: owner.authProviderId };
        next();
      });

      const response = await request(app)
        .get('/api/tasks/urgent')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map((t: any) => t.id)).toContain(urgentTask1.id);
      expect(response.body.map((t: any) => t.id)).toContain(urgentTask2.id);

      // Verify project info is included
      expect(response.body[0].project).toBeDefined();
      expect(response.body[0].project.id).toBeDefined();
      expect(response.body[0].project.name).toBeDefined();
    });

    it('should return urgent tasks from collaborated projects', async () => {
      const owner = await createTestUser();
      const collaborator = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, collaborator.id, 'editor');

      // Create urgent task in owner's project
      const urgentTask = await createTestTask(project.id, {
        title: 'Urgent Task',
        priority: 'urgent',
      });

      // Collaborator should see the urgent task
      app.use((req, _res, next) => {
        req.auth = { sub: collaborator.authProviderId };
        next();
      });

      const response = await request(app)
        .get('/api/tasks/urgent')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(urgentTask.id);
      expect(response.body[0].priority).toBe('urgent');
    });

    it('should return urgent tasks from both owned and collaborated projects', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      // User1 owns project1
      const project1 = await createTestProject(user1.id, { name: 'Owned Project' });

      // User2 owns project2, user1 is a collaborator
      const project2 = await createTestProject(user2.id, { name: 'Collaborated Project' });
      await createCollaborator(project2.id, user1.id, 'editor');

      // Create urgent tasks in both projects
      const urgentTask1 = await createTestTask(project1.id, {
        title: 'Urgent in Owned',
        priority: 'urgent',
      });
      const urgentTask2 = await createTestTask(project2.id, {
        title: 'Urgent in Collaborated',
        priority: 'urgent',
      });

      app.use((req, _res, next) => {
        req.auth = { sub: user1.authProviderId };
        next();
      });

      const response = await request(app)
        .get('/api/tasks/urgent')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map((t: any) => t.id)).toContain(urgentTask1.id);
      expect(response.body.map((t: any) => t.id)).toContain(urgentTask2.id);
    });

    it('should not return urgent tasks from projects user has no access to', async () => {
      const owner = await createTestUser();
      const otherUser = await createTestUser();
      const project = await createTestProject(owner.id);

      // Create urgent task in owner's project
      await createTestTask(project.id, {
        title: 'Urgent Task',
        priority: 'urgent',
      });

      // Other user should not see it
      app.use((req, _res, next) => {
        req.auth = { sub: otherUser.authProviderId };
        next();
      });

      const response = await request(app)
        .get('/api/tasks/urgent')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should not return non-urgent priority tasks', async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id);

      // Create tasks with different priorities
      await createTestTask(project.id, { title: 'Low Task', priority: 'low' });
      await createTestTask(project.id, { title: 'Medium Task', priority: 'medium' });
      await createTestTask(project.id, { title: 'High Task', priority: 'high' });

      app.use((req, _res, next) => {
        req.auth = { sub: owner.authProviderId };
        next();
      });

      const response = await request(app)
        .get('/api/tasks/urgent')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should return empty array when user has no projects', async () => {
      const user = await createTestUser();

      app.use((req, _res, next) => {
        req.auth = { sub: user.authProviderId };
        next();
      });

      const response = await request(app)
        .get('/api/tasks/urgent')
        .expect(200);

      expect(response.body).toHaveLength(0);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array when user has projects but no urgent tasks', async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id);

      // Create only non-urgent tasks
      await createTestTask(project.id, { priority: 'low' });
      await createTestTask(project.id, { priority: 'medium' });

      app.use((req, _res, next) => {
        req.auth = { sub: owner.authProviderId };
        next();
      });

      const response = await request(app)
        .get('/api/tasks/urgent')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should return tasks ordered by most recently updated first', async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id);

      // Create urgent tasks at different times
      const task1 = await createTestTask(project.id, {
        title: 'Old Urgent',
        priority: 'urgent',
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const task2 = await createTestTask(project.id, {
        title: 'New Urgent',
        priority: 'urgent',
      });

      // Update task1 to make it newer
      await prisma().task.update({
        where: { id: task1.id },
        data: { title: 'Updated Urgent' },
      });

      app.use((req, _res, next) => {
        req.auth = { sub: owner.authProviderId };
        next();
      });

      const response = await request(app)
        .get('/api/tasks/urgent')
        .expect(200);

      expect(response.body).toHaveLength(2);
      // task1 should be first because it was updated most recently
      expect(response.body[0].id).toBe(task1.id);
      expect(response.body[1].id).toBe(task2.id);
    });

    it('should work for viewer collaborators (read-only access)', async () => {
      const owner = await createTestUser();
      const viewer = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, viewer.id, 'viewer');

      const urgentTask = await createTestTask(project.id, {
        title: 'Urgent Task',
        priority: 'urgent',
      });

      // Viewer should be able to see urgent tasks
      app.use((req, _res, next) => {
        req.auth = { sub: viewer.authProviderId };
        next();
      });

      const response = await request(app)
        .get('/api/tasks/urgent')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(urgentTask.id);
    });

    it('should include correct project information in response', async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id, {
        name: 'Important Project',
        description: 'Project description',
      });

      await createTestTask(project.id, {
        title: 'Urgent Task',
        priority: 'urgent',
      });

      app.use((req, _res, next) => {
        req.auth = { sub: owner.authProviderId };
        next();
      });

      const response = await request(app)
        .get('/api/tasks/urgent')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].project).toEqual({
        id: project.id,
        name: 'Important Project',
        description: 'Project description',
      });
    });

    it('should handle multiple urgent tasks across many projects', async () => {
      const owner = await createTestUser();

      // Create 5 projects each with 2 urgent tasks
      const expectedCount = 10;
      for (let i = 0; i < 5; i++) {
        const project = await createTestProject(owner.id, { name: `Project ${i}` });
        await createTestTask(project.id, {
          title: `Urgent Task ${i}-1`,
          priority: 'urgent',
        });
        await createTestTask(project.id, {
          title: `Urgent Task ${i}-2`,
          priority: 'urgent',
        });
      }

      app.use((req, _res, next) => {
        req.auth = { sub: owner.authProviderId };
        next();
      });

      const response = await request(app)
        .get('/api/tasks/urgent')
        .expect(200);

      expect(response.body).toHaveLength(expectedCount);
    });

    it('should return 401 when user is not authenticated', async () => {
      // Don't set up auth mock - simulate unauthenticated request
      await request(app)
        .get('/api/tasks/urgent')
        .expect(401);
    });
  });
});
