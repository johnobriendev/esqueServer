// src/routes/index.ts
import { Router } from 'express';
import userRoutes from './userRoutes';
import projectRoutes from './projectRoutes';
import teamRoutes from './teamRoutes';
import crossProjectTaskRoutes from './crossProjectTaskRoutes';
import commentRoutes from './commentRoutes';


const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// User routes
router.use('/users', userRoutes);

// Project routes
router.use('/projects', projectRoutes);

// Team collaboration routes
router.use('/team', teamRoutes);

// Cross-project task routes
router.use('/tasks', crossProjectTaskRoutes);

// Standalone comment routes (also available nested under projects)
router.use('/tasks/:taskId/comments', commentRoutes);
router.use('/comments', commentRoutes);

// Project-scoped task routes are under /projects/:projectId/tasks
// See projectRoutes.ts for nested task routes

export default router;