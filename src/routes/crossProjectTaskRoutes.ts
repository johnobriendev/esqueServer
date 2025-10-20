// src/routes/crossProjectTaskRoutes.ts
import { Router } from 'express';
import { checkJwt, extractUserInfo } from '../middleware/auth';
import { taskRateLimit } from '../middleware/rateLimiter';
import * as taskController from '../controllers/taskController';

const router = Router();

// Apply auth middleware to all routes
router.use(checkJwt, extractUserInfo);
router.use(taskRateLimit);

// Cross-project task queries
router.get('/urgent', taskController.getUrgentTasks);

export default router;
