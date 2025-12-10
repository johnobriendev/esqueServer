// tests/integration/team.test.ts
import request from 'supertest';
import app from '../../src/app';
import { clearDatabase, prisma } from '../setup/testDb';
import { createTestUser, createTestProject, createCollaborator } from '../setup/testHelpers';
import { setMockAuth, clearMockAuth } from '../setup/authMock';

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

describe('Team API Integration Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
    clearMockAuth();
  });

  describe('POST /api/team/projects/:id/invite', () => {
    it('should create invitation when user is owner', async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id);

      setMockAuth(owner.authProviderId, owner.email, owner);

      const response = await request(app)
        .post(`/api/team/projects/${project.id}/invite`)
        .send({ email: 'invitee@example.com', role: 'editor' })
        .expect(201);

      expect(response.body.invitation.email).toBe('invitee@example.com');
      expect(response.body.invitation.role).toBe('editor');
    });

    it('should return 403 when user is not owner', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');

      setMockAuth(editor.authProviderId, editor.email, editor);

      await request(app)
        .post(`/api/team/projects/${project.id}/invite`)
        .send({ email: 'invitee@example.com', role: 'editor' })
        .expect(403);
    });
  });

  describe('GET /api/team/users/invitations', () => {
    it('should return user pending invitations', async () => {
      const owner = await createTestUser();
      const invitee = await createTestUser({ email: 'invitee@example.com' });
      const project = await createTestProject(owner.id);

      await prisma().projectInvitation.create({
        data: {
          receiverEmail: invitee.email,
          senderUserId: owner.id,
          role: 'editor',
          token: 'test-token',
          projectId: project.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      setMockAuth(invitee.authProviderId, invitee.email, invitee);

      const response = await request(app).get('/api/team/users/invitations').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].receiverEmail).toBe(invitee.email);
    });
  });

  describe('POST /api/team/invitations/:token/accept', () => {
    it('should accept invitation and create collaborator', async () => {
      const owner = await createTestUser();
      const invitee = await createTestUser({ email: 'invitee@example.com' });
      const project = await createTestProject(owner.id);

      const invitation = await prisma().projectInvitation.create({
        data: {
          receiverEmail: invitee.email,
          senderUserId: owner.id,
          role: 'editor',
          token: 'accept-token',
          projectId: project.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      setMockAuth(invitee.authProviderId, invitee.email, invitee);

      const response = await request(app)
        .post(`/api/team/invitations/${invitation.token}/accept`)
        .expect(200);

      expect(response.body.message).toBe('Successfully joined Test Project');
      expect(response.body.role).toBe('editor');

      const collaborator = await prisma().projectCollaborator.findFirst({
        where: { projectId: project.id, userId: invitee.id },
      });
      expect(collaborator).not.toBeNull();
    });

    it('should return 404 for invalid token', async () => {
      const user = await createTestUser();

      setMockAuth(user.authProviderId, user.email, user);

      await request(app).post('/api/team/invitations/invalid-token/accept').expect(404);
    });
  });

  describe('GET /api/team/projects/:id/collaborators', () => {
    it('should return all collaborators including owner', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const viewer = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');
      await createCollaborator(project.id, viewer.id, 'viewer');

      setMockAuth(owner.authProviderId, owner.email, owner);

      const response = await request(app)
        .get(`/api/team/projects/${project.id}/collaborators`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('DELETE /api/team/projects/:id/collaborators/:userId', () => {
    it('should remove collaborator when user is owner', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');

      setMockAuth(owner.authProviderId, owner.email, owner);

      await request(app)
        .delete(`/api/team/projects/${project.id}/collaborators/${editor.id}`)
        .expect(200);

      const collaborator = await prisma().projectCollaborator.findFirst({
        where: { projectId: project.id, userId: editor.id },
      });
      expect(collaborator).toBeNull();
    });

    it('should return 403 when user is not owner', async () => {
      const owner = await createTestUser();
      const editor1 = await createTestUser();
      const editor2 = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor1.id, 'editor');
      await createCollaborator(project.id, editor2.id, 'editor');

      setMockAuth(editor1.authProviderId, editor1.email, editor1);

      await request(app)
        .delete(`/api/team/projects/${project.id}/collaborators/${editor2.id}`)
        .expect(403);
    });
  });

  describe('PUT /api/team/projects/:id/collaborators/:userId/role', () => {
    it('should update collaborator role when user is owner', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');

      setMockAuth(owner.authProviderId, owner.email, owner);

      const response = await request(app)
        .put(`/api/team/projects/${project.id}/collaborators/${editor.id}/role`)
        .send({ role: 'viewer' })
        .expect(200);

      expect(response.body.role).toBe('viewer');

      const collaborator = await prisma().projectCollaborator.findFirst({
        where: { projectId: project.id, userId: editor.id },
      });
      expect(collaborator?.role).toBe('viewer');
    });

    it('should return 403 when user is not owner', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');

      setMockAuth(editor.authProviderId, editor.email, editor);

      await request(app)
        .put(`/api/team/projects/${project.id}/collaborators/${editor.id}/role`)
        .send({ role: 'viewer' })
        .expect(403);
    });
  });
});
