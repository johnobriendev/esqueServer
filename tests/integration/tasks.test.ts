// tests/integration/tasks.test.ts
import request from 'supertest';
import app from '../../src/app';
import { clearDatabase, prisma } from '../setup/testDb';
import { createTestUser, createTestProject, createTestTask, createCollaborator } from '../setup/testHelpers';
import { setMockAuth, clearMockAuth, getMockAuth } from '../setup/authMock';

jest.mock('../../src/middleware/auth', () => {
  const { getMockAuth } = require('../setup/authMock');
  return {
    checkJwt: (req: any, _res: any, next: any) => {
      const mockAuth = getMockAuth();
      if (mockAuth) {
        req.auth = { payload: { sub: mockAuth.auth0Id } };
      }
      next();
    },
    extractUserInfo: async (req: any, res: any, next: any) => {
      const mockAuth = getMockAuth();
      if (mockAuth) {
        req.user = mockAuth;
        next();
      } else {
        res.status(401).json({ error: 'Unauthorized' });
      }
    },
  };
});

describe('Tasks API Integration Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
    clearMockAuth();
  });

  describe('GET /api/projects/:projectId/tasks', () => {
    it('should return all tasks for project', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      await createTestTask(project.id, { title: 'Task 1' });
      await createTestTask(project.id, { title: 'Task 2' });

      setMockAuth(user.authProviderId, user.email);

      const response = await request(app)
        .get(`/api/projects/${project.id}/tasks`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should return 403 when user has no access to project', async () => {
      const owner = await createTestUser();
      const otherUser = await createTestUser();
      const project = await createTestProject(owner.id);

      setMockAuth(otherUser.authProviderId, otherUser.email);

      await request(app).get(`/api/projects/${project.id}/tasks`).expect(403);
    });
  });

  describe('POST /api/projects/:projectId/tasks', () => {
    it('should create task when user is owner', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      setMockAuth(user.authProviderId, user.email);

      const response = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .send({ title: 'New Task', status: 'not started', priority: 'high' })
        .expect(201);

      expect(response.body.title).toBe('New Task');
      expect(response.body.priority).toBe('high');
    });

    it('should create task when user is editor', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');

      setMockAuth(editor.authProviderId, editor.email);

      const response = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .send({ title: 'Editor Task' })
        .expect(201);

      expect(response.body.title).toBe('Editor Task');
    });

    it('should return 403 when user is viewer', async () => {
      const owner = await createTestUser();
      const viewer = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, viewer.id, 'viewer');

      setMockAuth(viewer.authProviderId, viewer.email);

      await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .send({ title: 'Viewer Task' })
        .expect(403);
    });
  });

  describe('PATCH /api/projects/:projectId/tasks/:taskId', () => {
    it('should update task when user is editor', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');
      const task = await createTestTask(project.id);

      setMockAuth(editor.authProviderId, editor.email);

      const response = await request(app)
        .patch(`/api/projects/${project.id}/tasks/${task.id}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
    });

    it('should return 403 when user is viewer', async () => {
      const owner = await createTestUser();
      const viewer = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, viewer.id, 'viewer');
      const task = await createTestTask(project.id);

      setMockAuth(viewer.authProviderId, viewer.email);

      await request(app)
        .patch(`/api/projects/${project.id}/tasks/${task.id}`)
        .send({ title: 'Updated Title' })
        .expect(403);
    });
  });

  describe('DELETE /api/projects/:projectId/tasks/:taskId', () => {
    it('should delete task when user is editor', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');
      const task = await createTestTask(project.id);

      setMockAuth(editor.authProviderId, editor.email);

      await request(app)
        .delete(`/api/projects/${project.id}/tasks/${task.id}`)
        .expect(200);

      const deleted = await prisma().task.findUnique({ where: { id: task.id } });
      expect(deleted).toBeNull();
    });
  });

  describe('PUT /api/projects/:projectId/tasks/bulk', () => {
    it('should update multiple tasks', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task1 = await createTestTask(project.id);
      const task2 = await createTestTask(project.id);

      setMockAuth(user.authProviderId, user.email);

      const response = await request(app)
        .put(`/api/projects/${project.id}/tasks/bulk`)
        .send({
          taskIds: [task1.id, task2.id],
          updates: { status: 'completed' },
        })
        .expect(200);

      expect(response.body.count).toBe(2);
    });
  });

  describe('PUT /api/projects/:projectId/tasks/reorder', () => {
    it('should reorder tasks successfully', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task1 = await createTestTask(project.id);
      const task2 = await createTestTask(project.id);

      setMockAuth(user.authProviderId, user.email);

      const response = await request(app)
        .put(`/api/projects/${project.id}/tasks/reorder`)
        .send({
          tasks: [
            { id: task1.id, position: 2000 },
            { id: task2.id, position: 1000 },
          ],
        })
        .expect(200);

      expect(response.body.count).toBe(2);
    });
  });
});
