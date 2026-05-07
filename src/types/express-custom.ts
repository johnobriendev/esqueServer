// src/types/express-custom.ts
import { Request, Response, NextFunction } from 'express';
import { User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  auth?: any;
  user?: {
    auth0Id: string;
    email: string;
  };
  dbUser?: User;
}

export type AuthenticatedController = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;