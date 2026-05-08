// src/types/express-custom.ts
import { Request, Response, NextFunction } from 'express';
import { User } from '@prisma/client';
import { ProjectRole } from '../utils/permissions';

export interface AuthenticatedRequest extends Request {
  auth?: any;
  user?: {
    auth0Id: string;
    email: string;
  };
  dbUser?: User;
  projectAccess?: { role: ProjectRole; canWrite: boolean };
}

export type AuthenticatedController = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;