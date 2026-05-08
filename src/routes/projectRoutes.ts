// src/routes/projectRoutes.ts
import { Router } from 'express';
import { checkJwt, extractUserInfo, attachDbUser, requireProjectAccess } from '../middleware/auth';
import { projectRateLimit } from '../middleware/rateLimiter';
import * as projectController from '../controllers/projectController';
import { validateProjectData } from '../middleware/validation';
import taskRoutes from './taskRoutes';
import commentRoutes from './commentRoutes';

const router = Router();

router.use(checkJwt, extractUserInfo, attachDbUser);
router.use(projectRateLimit);

router.get('/', projectController.getAllProjects);
router.get('/archived', projectController.getArchivedProjects);
router.get('/:id', requireProjectAccess('read'), projectController.getProjectById);
router.post('/', validateProjectData, projectController.createProject);
router.patch('/:id', requireProjectAccess('write'), validateProjectData, projectController.updateProject);
router.patch('/:id/archive', projectController.archiveProject);
router.patch('/:id/unarchive', projectController.unarchiveProject);
router.patch('/:id/hide', projectController.hideProject);
router.patch('/:id/unhide', projectController.unhideProject);
router.delete('/:id', projectController.deleteProject);

// Nest task routes under projects
router.use('/:projectId/tasks', taskRoutes);

// Nest comment routes under tasks
router.use('/:projectId/tasks/:taskId/comments', commentRoutes);

export default router;