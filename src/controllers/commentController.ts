// src/controllers/commentController.ts
import { Response, NextFunction } from 'express';
import prisma from '../models/prisma';
import { AuthenticatedRequest, AuthenticatedController } from '../types/express-custom';
import { validateProjectAccess } from '../utils/permissions';

// Helper to handle Prisma not found errors
const handlePrismaError = (error: any, res: Response) => {
  const err = error as any;
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Resource not found or unauthorized' });
  }
  throw error;
};

const touchProjectActivity = (projectId: string) =>
  prisma.project.update({ where: { id: projectId }, data: { lastActivityAt: new Date() } });

export const getCommentsByTask: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.dbUser!;
    const { taskId } = req.params;

    const task = await prisma.task.findFirst({
      where: { id: taskId }
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const access = await validateProjectAccess(user.id, task.projectId, 'read');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }

    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
};

export const createComment: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.dbUser!;
    const { taskId } = req.params;
    const { content } = req.body;

    const task = await prisma.task.findFirst({
      where: { id: taskId }
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const access = await validateProjectAccess(user.id, task.projectId, 'write');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }

    const comment = await prisma.taskComment.create({
      data: {
        content,
        taskId,
        userId: user.id
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    await touchProjectActivity(task.projectId);
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};

export const updateComment: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.dbUser!;
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await prisma.taskComment.findFirst({
      where: { id: commentId },
      include: {
        task: true
      }
    });

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    const access = await validateProjectAccess(user.id, comment.task.projectId, 'read');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }

    if (comment.userId !== user.id) {
      res.status(403).json({ error: 'You can only edit your own comments' });
      return;
    }

    try {
      const updatedComment = await prisma.taskComment.update({
        where: { id: commentId },
        data: { content },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });

      await touchProjectActivity(comment.task.projectId);
      res.status(200).json(updatedComment);
    } catch (prismaError) {
      if (handlePrismaError(prismaError, res)) return;
    }
  } catch (error) {
    next(error);
  }
};

export const deleteComment: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.dbUser!;
    const { commentId } = req.params;

    const comment = await prisma.taskComment.findFirst({
      where: { id: commentId },
      include: {
        task: {
          include: {
            project: true
          }
        }
      }
    });

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    const access = await validateProjectAccess(user.id, comment.task.projectId, 'read');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }

    const isOwner = comment.task.project.userId === user.id;
    const isCommentAuthor = comment.userId === user.id;

    if (!isOwner && !isCommentAuthor) {
      res.status(403).json({ error: 'You can only delete your own comments' });
      return;
    }

    try {
      await prisma.taskComment.delete({
        where: { id: commentId }
      });

      await touchProjectActivity(comment.task.projectId);
      res.status(204).send();
    } catch (prismaError) {
      if (handlePrismaError(prismaError, res)) return;
    }
  } catch (error) {
    next(error);
  }
};
