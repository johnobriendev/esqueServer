// tests/integration/comments.test.ts
import request from 'supertest';
import app from '../../src/app';
import { clearDatabase, prisma } from '../setup/testDb';
import {
  createTestUser,
  createTestProject,
  createTestTask,
  createCollaborator,
  mockAuth,
} from '../setup/testHelpers';

// Mock the auth middleware
jest.mock('../../src/middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
}));

describe('Comment API Integration Tests', () => {
  beforeEach(async () => {
    // Manually clear database before each test
    await clearDatabase();
  });

  describe('GET /api/tasks/:taskId/comments', () => {
    it('should return comments for a task when user has access', async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id);
      const task = await createTestTask(project.id);

      // Create a comment
      await prisma.taskComment.create({
        data: {
          content: 'Test comment',
          taskId: task.id,
          userId: owner.id,
        },
      });

      // Mock auth to inject user
      app.use((req, _res, next) => {
        req.auth = { sub: owner.authProviderId };
        next();
      });

      const response = await request(app)
        .get(`/api/tasks/${task.id}/comments`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].content).toBe('Test comment');
      expect(response.body[0].user.email).toBe(owner.email);
    });

    it('should return 403 when user lacks project access', async () => {
      const owner = await createTestUser();
      const otherUser = await createTestUser();
      const project = await createTestProject(owner.id);
      const task = await createTestTask(project.id);

      app.use((req, _res, next) => {
        req.auth = { sub: otherUser.authProviderId };
        next();
      });

      await request(app)
        .get(`/api/tasks/${task.id}/comments`)
        .expect(403);
    });

    it('should return 404 when task does not exist', async () => {
      const user = await createTestUser();

      app.use((req, _res, next) => {
        req.auth = { sub: user.authProviderId };
        next();
      });

      await request(app)
        .get('/api/tasks/non-existent-id/comments')
        .expect(404);
    });
  });

  describe('POST /api/tasks/:taskId/comments', () => {
    it('should create a comment when user is project owner', async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id);
      const task = await createTestTask(project.id);

      app.use((req, _res, next) => {
        req.auth = { sub: owner.authProviderId };
        next();
      });

      const response = await request(app)
        .post(`/api/tasks/${task.id}/comments`)
        .send({ content: 'New comment' })
        .expect(201);

      expect(response.body.content).toBe('New comment');
      expect(response.body.taskId).toBe(task.id);
      expect(response.body.userId).toBe(owner.id);
    });

    it('should create a comment when user is editor', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');
      const task = await createTestTask(project.id);

      app.use((req, _res, next) => {
        req.auth = { sub: editor.authProviderId };
        next();
      });

      const response = await request(app)
        .post(`/api/tasks/${task.id}/comments`)
        .send({ content: 'Editor comment' })
        .expect(201);

      expect(response.body.content).toBe('Editor comment');
    });

    it('should return 403 when user is only viewer', async () => {
      const owner = await createTestUser();
      const viewer = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, viewer.id, 'viewer');
      const task = await createTestTask(project.id);

      app.use((req, _res, next) => {
        req.auth = { sub: viewer.authProviderId };
        next();
      });

      await request(app)
        .post(`/api/tasks/${task.id}/comments`)
        .send({ content: 'Viewer comment' })
        .expect(403);
    });
  });

  describe('PUT /api/comments/:commentId', () => {
    it('should update comment when user is comment author', async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id);
      const task = await createTestTask(project.id);
      const comment = await prisma.taskComment.create({
        data: {
          content: 'Original content',
          taskId: task.id,
          userId: owner.id,
        },
      });

      app.use((req, _res, next) => {
        req.auth = { sub: owner.authProviderId };
        next();
      });

      const response = await request(app)
        .put(`/api/comments/${comment.id}`)
        .send({ content: 'Updated content' })
        .expect(200);

      expect(response.body.content).toBe('Updated content');
    });

    it('should return 403 when user is not comment author', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');
      const task = await createTestTask(project.id);
      const comment = await prisma.taskComment.create({
        data: {
          content: 'Original content',
          taskId: task.id,
          userId: owner.id,
        },
      });

      app.use((req, _res, next) => {
        req.auth = { sub: editor.authProviderId };
        next();
      });

      await request(app)
        .put(`/api/comments/${comment.id}`)
        .send({ content: 'Updated content' })
        .expect(403);
    });
  });

  describe('DELETE /api/comments/:commentId', () => {
    it('should delete comment when user is comment author', async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id);
      const task = await createTestTask(project.id);
      const comment = await prisma.taskComment.create({
        data: {
          content: 'Test content',
          taskId: task.id,
          userId: owner.id,
        },
      });

      app.use((req, _res, next) => {
        req.auth = { sub: owner.authProviderId };
        next();
      });

      await request(app)
        .delete(`/api/comments/${comment.id}`)
        .expect(204);

      const deleted = await prisma.taskComment.findUnique({
        where: { id: comment.id },
      });
      expect(deleted).toBeNull();
    });

    it('should delete comment when user is project owner', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');
      const task = await createTestTask(project.id);

      // Editor creates comment
      const comment = await prisma.taskComment.create({
        data: {
          content: 'Editor comment',
          taskId: task.id,
          userId: editor.id,
        },
      });

      // Owner deletes it
      app.use((req, _res, next) => {
        req.auth = { sub: owner.authProviderId };
        next();
      });

      await request(app)
        .delete(`/api/comments/${comment.id}`)
        .expect(204);
    });

    it('should return 403 when editor tries to delete another users comment', async () => {
      const owner = await createTestUser();
      const editor1 = await createTestUser();
      const editor2 = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor1.id, 'editor');
      await createCollaborator(project.id, editor2.id, 'editor');
      const task = await createTestTask(project.id);

      const comment = await prisma.taskComment.create({
        data: {
          content: 'Editor 1 comment',
          taskId: task.id,
          userId: editor1.id,
        },
      });

      app.use((req, _res, next) => {
        req.auth = { sub: editor2.authProviderId };
        next();
      });

      await request(app)
        .delete(`/api/comments/${comment.id}`)
        .expect(403);
    });
  });
});
