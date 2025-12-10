// tests/integration/comments.test.ts
import request from 'supertest';
import app from '../../src/app';
import { clearDatabase, prisma } from '../setup/testDb';
import {
  createTestUser,
  createTestProject,
  createTestTask,
  createCollaborator,
} from '../setup/testHelpers';
import { setMockAuth, clearMockAuth } from '../setup/authMock';

// Mock the auth middleware
// Mock prisma to use test database client
jest.mock('../../src/models/prisma', () => {
  const { prisma } = require('../setup/testDb');
  return {
    __esModule: true,
    default: prisma(),
  };
});

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


jest.mock('../../src/utils/auth', () => ({
  getAuthenticatedUser: jest.fn(async (req: any) => {
    const { getMockUser } = require('../setup/authMock');
    const mockUser = getMockUser();
    if (!mockUser) {
      throw new Error('Unauthorized');
    }
    return mockUser;
  }),
}));

describe('Comment API Integration Tests', () => {
  beforeEach(async () => {
    // Manually clear database before each test
    await clearDatabase();
    clearMockAuth();
  });

  describe('GET /api/tasks/:taskId/comments', () => {
    it('should return comments for a task when user has access', async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id);
      const task = await createTestTask(project.id);

      // Create a comment
      await prisma().taskComment.create({
        data: {
          content: 'Test comment',
          taskId: task.id,
          userId: owner.id,
        },
      });

      setMockAuth(owner.authProviderId, owner.email, owner);

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

      setMockAuth(otherUser.authProviderId, otherUser.email, otherUser);

      await request(app)
        .get(`/api/tasks/${task.id}/comments`)
        .expect(403);
    });

    it('should return 404 when task does not exist', async () => {
      const user = await createTestUser();

      setMockAuth(user.authProviderId, user.email, user);

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

      setMockAuth(owner.authProviderId, owner.email, owner);

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

      setMockAuth(editor.authProviderId, editor.email, editor);

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

      setMockAuth(viewer.authProviderId, viewer.email, viewer);

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
      const comment = await prisma().taskComment.create({
        data: {
          content: 'Original content',
          taskId: task.id,
          userId: owner.id,
        },
      });

      setMockAuth(owner.authProviderId, owner.email, owner);

      const response = await request(app)
        .patch(`/api/comments/${comment.id}`)
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
      const comment = await prisma().taskComment.create({
        data: {
          content: 'Original content',
          taskId: task.id,
          userId: owner.id,
        },
      });

      setMockAuth(editor.authProviderId, editor.email, editor);

      await request(app)
        .patch(`/api/comments/${comment.id}`)
        .send({ content: 'Updated content' })
        .expect(403);
    });
  });

  describe('DELETE /api/comments/:commentId', () => {
    it('should delete comment when user is comment author', async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id);
      const task = await createTestTask(project.id);
      const comment = await prisma().taskComment.create({
        data: {
          content: 'Test content',
          taskId: task.id,
          userId: owner.id,
        },
      });

      setMockAuth(owner.authProviderId, owner.email, owner);

      await request(app)
        .delete(`/api/comments/${comment.id}`)
        .expect(204);

      const deleted = await prisma().taskComment.findUnique({
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
      const comment = await prisma().taskComment.create({
        data: {
          content: 'Editor comment',
          taskId: task.id,
          userId: editor.id,
        },
      });

      // Owner deletes it
      setMockAuth(owner.authProviderId, owner.email, owner);

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

      const comment = await prisma().taskComment.create({
        data: {
          content: 'Editor 1 comment',
          taskId: task.id,
          userId: editor1.id,
        },
      });

      setMockAuth(editor2.authProviderId, editor2.email, editor2);

      await request(app)
        .delete(`/api/comments/${comment.id}`)
        .expect(403);
    });
  });
});
