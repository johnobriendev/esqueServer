// src/routes/taskRoutes.ts
import { Router } from 'express';
import { checkJwt, extractUserInfo } from '../middleware/auth';
import { taskRateLimit, bulkOperationRateLimit } from '../middleware/rateLimiter'; 
import * as taskController from '../controllers/taskController';
import {
  validateTaskData,
  validateBulkUpdateData,
  validateReorderData,
  validateTaskStatusUpdate
} from '../middleware/validation';

const router = Router({ mergeParams: true });

// Apply auth middleware to all routes
router.use(checkJwt, extractUserInfo);
router.use(taskRateLimit); 

// Project task routes - cast each controller function
router.get('/', taskController.getTasksByProject);
router.post('/', validateTaskData, taskController.createTask);

// Individual task routes
router.get('/:taskId', taskController.getTaskById);
router.patch('/:taskId', validateTaskData, taskController.updateTask);
router.patch('/:taskId/priority', taskController.updateTaskPriority);
router.patch('/:taskId/status', validateTaskStatusUpdate, taskController.updateTaskStatus);
router.delete('/:taskId', taskController.deleteTask);

// Bulk operations
router.put('/bulk', validateBulkUpdateData, taskController.bulkUpdateTasks);
router.put('/reorder', validateReorderData, taskController.reorderTasks);
router.delete('/', taskController.deleteMultipleTasks);

export default router;