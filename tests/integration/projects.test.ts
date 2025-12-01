// tests/integration/projects.test.ts
import request from 'supertest';
import app from '../../src/app';
import { clearDatabase, prisma } from '../setup/testDb';
import { createTestUser, createTestProject, createCollaborator } from '../setup/testHelpers';

jest.mock('../../src/middleware/auth', () => ({
  checkJwt: (req: any, _res: any, next: any) => next(),
  extractUserInfo: (req: any, _res: any, next: any) => next(),
}));

describe('Projects API Integration Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /api/projects', () => {
    it('should return all projects user owns and collaborates on', async () => {
      const user = await createTestUser();
      const ownedProject = await createTestProject(user.id, { name: 'Owned Project' });

      const otherUser = await createTestUser();
      const sharedProject = await createTestProject(otherUser.id, { name: 'Shared Project' });
      await createCollaborator(sharedProject.id, user.id, 'editor');

      app.use((req: any, _res: any, next: any) => {
        req.auth = { payload: { sub: user.authProviderId } };
        next();
      });

      const response = await request(app).get('/api/projects').expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map((p: any) => p.id)).toContain(ownedProject.id);
      expect(response.body.map((p: any) => p.id)).toContain(sharedProject.id);
    });

    it('should return empty array when user has no projects', async () => {
      const user = await createTestUser();

      app.use((req: any, _res: any, next: any) => {
        req.auth = { payload: { sub: user.authProviderId } };
        next();
      });

      const response = await request(app).get('/api/projects').expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project when user is owner', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      app.use((req: any, _res: any, next: any) => {
        req.auth = { payload: { sub: user.authProviderId } };
        next();
      });

      const response = await request(app).get(`/api/projects/${project.id}`).expect(200);

      expect(response.body.id).toBe(project.id);
      expect(response.body.name).toBe(project.name);
    });

    it('should return 403 when user has no access', async () => {
      const owner = await createTestUser();
      const otherUser = await createTestUser();
      const project = await createTestProject(owner.id);

      app.use((req: any, _res: any, next: any) => {
        req.auth = { payload: { sub: otherUser.authProviderId } };
        next();
      });

      await request(app).get(`/api/projects/${project.id}`).expect(403);
    });

    it('should return 404 when project does not exist', async () => {
      const user = await createTestUser();

      app.use((req: any, _res: any, next: any) => {
        req.auth = { payload: { sub: user.authProviderId } };
        next();
      });

      await request(app).get('/api/projects/non-existent-id').expect(404);
    });
  });

  describe('POST /api/projects', () => {
    it('should create project successfully', async () => {
      const user = await createTestUser();

      app.use((req: any, _res: any, next: any) => {
        req.auth = { payload: { sub: user.authProviderId } };
        next();
      });

      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'New Project', description: 'Description' })
        .expect(201);

      expect(response.body.name).toBe('New Project');
      expect(response.body.description).toBe('Description');
      expect(response.body.userId).toBe(user.id);
    });

    it('should fail when name is missing', async () => {
      const user = await createTestUser();

      app.use((req: any, _res: any, next: any) => {
        req.auth = { payload: { sub: user.authProviderId } };
        next();
      });

      await request(app)
        .post('/api/projects')
        .send({ description: 'Description' })
        .expect(400);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('should update project when user is owner', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      app.use((req: any, _res: any, next: any) => {
        req.auth = { payload: { sub: user.authProviderId } };
        next();
      });

      const response = await request(app)
        .patch(`/api/projects/${project.id}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });

    it('should return 403 when user is not owner', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');

      app.use((req: any, _res: any, next: any) => {
        req.auth = { payload: { sub: editor.authProviderId } };
        next();
      });

      await request(app)
        .patch(`/api/projects/${project.id}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project when user is owner', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      app.use((req: any, _res: any, next: any) => {
        req.auth = { payload: { sub: user.authProviderId } };
        next();
      });

      await request(app).delete(`/api/projects/${project.id}`).expect(200);

      const deleted = await prisma().project.findUnique({ where: { id: project.id } });
      expect(deleted).toBeNull();
    });

    it('should return 403 when user is not owner', async () => {
      const owner = await createTestUser();
      const editor = await createTestUser();
      const project = await createTestProject(owner.id);
      await createCollaborator(project.id, editor.id, 'editor');

      app.use((req: any, _res: any, next: any) => {
        req.auth = { payload: { sub: editor.authProviderId } };
        next();
      });

      await request(app).delete(`/api/projects/${project.id}`).expect(403);
    });
  });
});
