// src/middleware/validation.ts 
import { Request, Response, NextFunction } from 'express';

// Helper function for validation responses
const validationError = (res: Response, message: string): void => {
  res.status(400).json({ error: message });
};
// Simplified validation functions (no asyncHandler needed - these are sync)
export const validateProjectData = (req: Request, res: Response, next: NextFunction) => {
  const { name, description } = req.body;
  
  if (!name?.trim()) {
    return validationError(res, 'Project name is required');
  }
  
  if (name.length > 100) {
    return validationError(res, 'Project name is too long (max 100 characters)');
  }
  
  if (description && description.length > 500) {
    return validationError(res, 'Project description is too long (max 500 characters)');
  }
  
  next();
};

export const validateTaskData = (req: Request, res: Response, next: NextFunction) => {
  const { title, status, priority, position, description, customFields } = req.body;
  
  if (!title?.trim()) {
    return validationError(res, 'Task title is required');
  }
  
  if (title.length > 200) {
    return validationError(res, 'Task title is too long (max 200 characters)');
  }
  
  if (description && description.length > 2000) {
    return validationError(res, 'Task description is too long (max 2000 characters)');
  }
  
  const validStatuses = ['not started', 'in progress', 'completed'];
  if (status && !validStatuses.includes(status)) {
    return validationError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }
  
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (priority && !validPriorities.includes(priority)) {
    return validationError(res, `Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
  }
  
  if (position !== undefined && (typeof position !== 'number' || position < 0)) {
    return validationError(res, 'Position must be a positive number');
  }
  
  if (customFields && JSON.stringify(customFields).length > 10000) {
    return validationError(res, 'Custom fields data is too large');
  }
  
  next();
};

export const validateBulkUpdateData = (req: Request, res: Response, next: NextFunction) => {
  const { taskIds, updates } = req.body;
  
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return validationError(res, 'Task IDs array is required and must not be empty');
  }
  
  if (!updates || typeof updates !== 'object') {
    return validationError(res, 'Update object is required');
  }
  
  const { status, priority } = updates;
  if (!status && !priority) {
    return validationError(res, 'At least one field (status or priority) must be provided');
  }
  
  // Reuse the same validation logic
  if (status && !['not started', 'in progress', 'completed'].includes(status)) {
    return validationError(res, 'Invalid status');
  }
  
  if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
    return validationError(res, 'Invalid priority');
  }
  
  next();
};

export const validateReorderData = (req: Request, res: Response, next: NextFunction) => {
  const { tasks } = req.body;

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return validationError(res, 'Tasks array is required and must not be empty');
  }

  for (const task of tasks) {
    if (!task.id || typeof task.id !== 'string') {
      return validationError(res, 'Each task must have a valid id');
    }

    if (typeof task.position !== 'number' || task.position < 0) {
      return validationError(res, 'Each task must have a valid position');
    }
  }

  next();
};

export const validateCommentData = (req: Request, res: Response, next: NextFunction) => {
  const { content } = req.body;

  if (!content?.trim()) {
    return validationError(res, 'Comment content is required');
  }

  if (content.length > 2000) {
    return validationError(res, 'Comment is too long (max 2000 characters)');
  }

  next();
};
