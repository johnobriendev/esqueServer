// src/routes/taskRoutes.ts
import { Router } from 'express';
import { checkJwt, extractUserInfo, attachDbUser, requireProjectAccess } from '../middleware/auth';
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
router.use(checkJwt, extractUserInfo, attachDbUser);
router.use(taskRateLimit); 

// Project task routes - cast each controller function
router.get('/', requireProjectAccess('read'), taskController.getTasksByProject);
router.post('/', requireProjectAccess('write'), validateTaskData, taskController.createTask);

// Individual task routes
router.get('/:taskId', taskController.getTaskById);
router.patch('/:taskId', validateTaskData, taskController.updateTask);
router.patch('/:taskId/priority', taskController.updateTaskPriority);
router.patch('/:taskId/status', validateTaskStatusUpdate, taskController.updateTaskStatus);
router.delete('/:taskId', taskController.deleteTask);

// Bulk operations
router.put('/bulk', validateBulkUpdateData, taskController.bulkUpdateTasks);
router.put('/reorder', requireProjectAccess('write'), validateReorderData, taskController.reorderTasks);
router.delete('/', requireProjectAccess('write'), taskController.deleteMultipleTasks);

export default router;