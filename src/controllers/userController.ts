// src/controllers/userController.ts
import { Response, NextFunction } from 'express';
import prisma from '../models/prisma';
import { AuthenticatedRequest, AuthenticatedController } from '../types/express-custom';

export const getCurrentUser: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json(req.dbUser!);
  } catch (error) {
    next(error);
  }
};

export const updateUser: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.dbUser!.id },
      data: { name }
    });
    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};
