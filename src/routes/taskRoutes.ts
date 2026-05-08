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
router.get('/:taskId', requireProjectAccess('read'), taskController.getTaskById);
router.patch('/:taskId', requireProjectAccess('write'), validateTaskData, taskController.updateTask);
router.patch('/:taskId/priority', requireProjectAccess('write'), taskController.updateTaskPriority);
router.patch('/:taskId/status', requireProjectAccess('write'), validateTaskStatusUpdate, taskController.updateTaskStatus);
router.delete('/:taskId', requireProjectAccess('write'), taskController.deleteTask);

// Bulk operations
router.put('/bulk', requireProjectAccess('write'), validateBulkUpdateData, taskController.bulkUpdateTasks);
router.put('/reorder', requireProjectAccess('write'), validateReorderData, taskController.reorderTasks);
router.delete('/', requireProjectAccess('write'), taskController.deleteMultipleTasks);

export default router;