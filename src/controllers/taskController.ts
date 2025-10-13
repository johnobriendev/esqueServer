// src/controllers/taskController.ts 
import { Response, NextFunction } from 'express';
import prisma from '../models/prisma';
import { AuthenticatedRequest, AuthenticatedController } from '../types/express-custom';
import { getAuthenticatedUser } from '../utils/auth';
import { validateProjectAccess } from '../utils/permissions';


// Helper to handle Prisma not found errors
const handlePrismaError = (error: any, res: Response) => {
  const err = error as any;
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Resource not found or unauthorized' });
  }
  throw error;
};

export const createTask: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { projectId } = req.params;
    const { id, title, description, status = 'not started', priority = 'low', position, customFields } = req.body;

    // Check if user can write to this project
    const access = await validateProjectAccess(user.id, projectId, 'write');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }

    // Calculate position if not provided
    let finalPosition = position;
    if (finalPosition === undefined || finalPosition === null) {
      const maxPos = await prisma.task.aggregate({
        where: { projectId, priority },
        _max: { position: true }
      });
      finalPosition = (maxPos._max.position ?? -1) + 1;
    }

    // Calculate statusPosition independently
    const maxStatusPos = await prisma.task.aggregate({
      where: { projectId, status },
      _max: { statusPosition: true } as any
    });
    const finalStatusPosition = ((maxStatusPos._max as any)?.statusPosition ?? -1) + 1;

    const task = await prisma.task.create({
      data: {
        ...(id && { id }),
        title,
        description,
        status,
        priority,
        position: finalPosition,
        statusPosition: finalStatusPosition,
        customFields,
        projectId,
        version: 1,
        updatedBy: user.email
      }
    });

    res.status(201).json(task);
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Project not found or unauthorized' });
      return;
    }
    next(error);
  }
};

export const getTasksByProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { projectId } = req.params;
    
    // Check if user can read this project
    const access = await validateProjectAccess(user.id, projectId, 'read');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }
    
    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { position: 'asc' }
    });
    
    res.status(200).json(tasks);
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};

export const getTaskById: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { taskId } = req.params;
    
    const task = await prisma.task.findFirst({
      where: { id: taskId },
      include: { project: true }
    });
    
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    // Check if user can read this project
    const access = await validateProjectAccess(user.id, task.projectId, 'read');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }
    
    res.status(200).json(task);
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};

export const updateTask: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { taskId } = req.params;
    const { title, description, status, priority, position, customFields, version } = req.body;
    
    // Get current task
    const currentTask = await prisma.task.findFirst({
      where: { id: taskId },
      include: { project: true }
    });
    
    if (!currentTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    // Check if user can write to this project
    const access = await validateProjectAccess(user.id, currentTask.projectId, 'write');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }
    
    // Simple version conflict check
    if (version && currentTask.version !== version) {
      res.status(409).json({
        error: 'VERSION_CONFLICT',
        message: `This task was modified by ${currentTask.updatedBy || 'another user'} while you were editing it.`,
        conflict: {
          taskId: currentTask.id,
          expectedVersion: version,
          currentVersion: currentTask.version,
          lastUpdatedBy: currentTask.updatedBy,
          lastUpdatedAt: currentTask.updatedAt,
          currentTask: currentTask
        }
      });
      return;
    }
    
    try {
      const task = await prisma.task.update({
        where: { id: taskId },
        data: { 
          title, 
          description, 
          status, 
          priority, 
          position, 
          customFields,
          version: { increment: 1 },
          updatedBy: user.email
        }
      });
      
      res.status(200).json(task);
    } catch (prismaError) {
      if (handlePrismaError(prismaError, res)) return;
    }
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};

export const deleteTask: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { taskId } = req.params;
    
    // Get current task
    const currentTask = await prisma.task.findFirst({
      where: { id: taskId }
    });
    
    if (!currentTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    // Check if user can write to this project
    const access = await validateProjectAccess(user.id, currentTask.projectId, 'write');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }
    
    try {
      await prisma.task.delete({
        where: { id: taskId }
      });
      
      res.status(204).send();
    } catch (prismaError) {
      if (handlePrismaError(prismaError, res)) return;
    }
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};

export const bulkUpdateTasks: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { taskIds, updates } = req.body;
    
    // Get project ID from first task to check permissions
    const firstTask = await prisma.task.findFirst({
      where: { id: taskIds[0] }
    });
    
    if (!firstTask) {
      res.status(404).json({ error: 'Tasks not found' });
      return;
    }
    
    // Check if user can write to this project
    const access = await validateProjectAccess(user.id, firstTask.projectId, 'write');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }
    
    // Update all tasks
    const result = await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        projectId: firstTask.projectId
      },
      data: {
        ...updates,
        updatedBy: user.email
      }
    });
    
    // Update versions separately (updateMany doesn't support increment)
    await prisma.$transaction(
      taskIds.map((taskId: string) =>
        prisma.task.update({
          where: { id: taskId },
          data: { version: { increment: 1 } }
        })
      )
    );
    
    if (result.count === 0) {
      res.status(404).json({ error: 'No tasks found or unauthorized' });
      return;
    }
    
    res.status(200).json({
      message: `Successfully updated ${result.count} tasks`,
      count: result.count
    });
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};

export const reorderTasks: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { projectId } = req.params;
    const { tasks, groupBy } = req.body;

    // Check if user can write to this project
    const access = await validateProjectAccess(user.id, projectId, 'write');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }

    // Use transaction for atomic updates
    const updatedTasks = await prisma.$transaction(
      tasks.map((task: { id: string; position?: number; statusPosition?: number }) => {
        const updateData: any = {
          version: { increment: 1 },
          updatedBy: user.email
        };

        if (groupBy === 'status' && task.statusPosition !== undefined) {
          updateData.statusPosition = task.statusPosition;
        } else if (task.position !== undefined) {
          updateData.position = task.position;
        }

        return prisma.task.update({
          where: {
            id: task.id,
            projectId
          },
          data: updateData
        });
      })
    );

    res.status(200).json(updatedTasks);
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'One or more tasks not found or unauthorized' });
      return;
    }
    next(error);
  }
};

export const deleteMultipleTasks: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { projectId } = req.params;
    const { taskIds } = req.body;
    
    // Check if user can write to this project
    const access = await validateProjectAccess(user.id, projectId, 'write');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }
    
    const result = await prisma.task.deleteMany({
      where: {
        id: { in: taskIds },
        projectId
      }
    });
    
    if (result.count === 0) {
      res.status(404).json({ error: 'No tasks found or unauthorized' });
      return;
    }
    
    res.status(200).json({
      message: `Successfully deleted ${result.count} tasks`,
      count: result.count
    });
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};

export const updateTaskPriority: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { taskId } = req.params;
    const { priority, destinationIndex, version } = req.body;

    // Get current task
    const currentTask = await prisma.task.findFirst({
      where: { id: taskId }
    });

    if (!currentTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check if user can write to this project
    const access = await validateProjectAccess(user.id, currentTask.projectId, 'write');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }

    // Simple version conflict check
    if (version && currentTask.version !== version) {
      res.status(409).json({
        error: 'VERSION_CONFLICT',
        message: `This task was modified by ${currentTask.updatedBy || 'another user'} while you were editing it.`,
        conflict: {
          taskId: currentTask.id,
          expectedVersion: version,
          currentVersion: currentTask.version,
          lastUpdatedBy: currentTask.updatedBy,
          lastUpdatedAt: currentTask.updatedAt,
          currentTask: currentTask
        }
      });
      return;
    }

    try {
      const task = await prisma.task.update({
        where: { id: taskId },
        data: {
          priority,
          ...(destinationIndex !== undefined && { position: destinationIndex }),
          version: { increment: 1 },
          updatedBy: user.email
        }
      });

      res.status(200).json(task);
    } catch (prismaError) {
      if (handlePrismaError(prismaError, res)) return;
    }
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};

export const updateTaskStatus: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { taskId } = req.params;
    const { status, destinationIndex, version } = req.body;

    // Get current task
    const currentTask = await prisma.task.findFirst({
      where: { id: taskId }
    });

    if (!currentTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check if user can write to this project
    const access = await validateProjectAccess(user.id, currentTask.projectId, 'write');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }

    // Simple version conflict check
    if (version && currentTask.version !== version) {
      res.status(409).json({
        error: 'VERSION_CONFLICT',
        message: `This task was modified by ${currentTask.updatedBy || 'another user'} while you were editing it.`,
        conflict: {
          taskId: currentTask.id,
          expectedVersion: version,
          currentVersion: currentTask.version,
          lastUpdatedBy: currentTask.updatedBy,
          lastUpdatedAt: currentTask.updatedAt,
          currentTask: currentTask
        }
      });
      return;
    }

    try {
      const task = await prisma.task.update({
        where: { id: taskId },
        data: {
          status,
          ...(destinationIndex !== undefined && { statusPosition: destinationIndex }),
          version: { increment: 1 },
          updatedBy: user.email
        }
      });

      res.status(200).json(task);
    } catch (prismaError) {
      if (handlePrismaError(prismaError, res)) return;
    }
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};