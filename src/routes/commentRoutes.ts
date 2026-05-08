// src/routes/commentRoutes.ts
import { Router } from 'express';
import { checkJwt, extractUserInfo, attachDbUser } from '../middleware/auth';
import { taskRateLimit } from '../middleware/rateLimiter';
import * as commentController from '../controllers/commentController';
import { validateCommentData } from '../middleware/validation';

const router = Router({ mergeParams: true });

// Apply auth middleware to all routes
router.use(checkJwt, extractUserInfo, attachDbUser);
router.use(taskRateLimit);

// Comment routes for a specific task
router.get('/', commentController.getCommentsByTask);
router.post('/', validateCommentData, commentController.createComment);
router.patch('/:commentId', validateCommentData, commentController.updateComment);
router.delete('/:commentId', commentController.deleteComment);

export default router;
