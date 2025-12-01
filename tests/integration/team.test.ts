// tests/integration/team.test.ts
import request from 'supertest';
import app from '../../src/app';
import { clearDatabase, prisma } from '../setup/testDb';
import { createTestUser, createTestProject, createCollaborator } from '../setup/testHelpers';

jest.mock('../../src/middleware/auth', () => ({
  checkJwt: (req: any, res: any, next: any) => next(),
  extractUserInfo: (req: any, res: any, next: any) => next(),
}));

describe('Team API Integration Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/team/projects/:id/invite', () => {
    it('should create invitation when user is owner', async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id);

      app.use((req, _res, next) => {
        req.auth = { payload: { sub: owner.authProviderId }, header: {}, token: '' };
        next();
      });

      const response = await request(app)
        .post(`/api/team/projects/${project.id}/invite`)
        .send({ email: 'invitee@example.com', role: 'editor' })
        .expect(200);

      expect(response.body.email).toBe('invitee@example.com');
      expect(response.body.role).toBe('editor');
      expect(response.body.token).toBeDefined();
    });

    it('should return 403 when user is not owner', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');

      app.use((req, _res, next) => {
        req.auth = { payload: { sub: editor.authProviderId }, header: {}, token: '' };
        next();
      });

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

      app.use((req, _res, next) => {
        req.auth = { payload: { sub: invitee.authProviderId }, header: {}, token: '' };
        next();
      });

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

      app.use((req, _res, next) => {
        req.auth = { payload: { sub: invitee.authProviderId }, header: {}, token: '' };
        next();
      });

      const response = await request(app)
        .post(`/api/team/invitations/${invitation.token}/accept`)
        .expect(200);

      expect(response.body.message).toBe('Invitation accepted successfully');
      expect(response.body.role).toBe('editor');

      const collaborator = await prisma().projectCollaborator.findFirst({
        where: { projectId: project.id, userId: invitee.id },
      });
      expect(collaborator).not.toBeNull();
    });

    it('should return 404 for invalid token', async () => {
      const user = await createTestUser();

      app.use((req, _res, next) => {
        req.auth = { payload: { sub: user.authProviderId }, header: {}, token: '' };
        next();
      });

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

      app.use((req, _res, next) => {
        req.auth = { payload: { sub: owner.authProviderId }, header: {}, token: '' };
        next();
      });

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

      app.use((req, _res, next) => {
        req.auth = { payload: { sub: owner.authProviderId }, header: {}, token: '' };
        next();
      });

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

      app.use((req, _res, next) => {
        req.auth = { payload: { sub: editor1.authProviderId }, header: {}, token: '' };
        next();
      });

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

      app.use((req, _res, next) => {
        req.auth = { payload: { sub: owner.authProviderId }, header: {}, token: '' };
        next();
      });

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

      app.use((req, _res, next) => {
        req.auth = { payload: { sub: editor.authProviderId }, header: {}, token: '' };
        next();
      });

      await request(app)
        .put(`/api/team/projects/${project.id}/collaborators/${editor.id}/role`)
        .send({ role: 'viewer' })
        .expect(403);
    });
  });
});
