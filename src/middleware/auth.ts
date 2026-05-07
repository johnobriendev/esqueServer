// src/middleware/auth.ts - PRODUCTION READY
import { Response, NextFunction } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';
import { AUTH0_DOMAIN, AUTH0_AUDIENCE } from '../config/env';
import { AuthenticatedRequest } from '../types/express-custom';
import prisma from '../models/prisma';

export const checkJwt = auth({
  audience: AUTH0_AUDIENCE,
  issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256'
});

export const extractUserInfo = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth?.payload?.sub) {
      res.status(401).json({ error: 'Invalid authentication token' });
      return;
    }

    const auth0Id = req.auth.payload.sub;

    // Try multiple sources for email with fallback
    const email = req.auth.payload.email ||
      req.headers['x-user-email'] as string ||
      req.auth.payload[`${AUTH0_AUDIENCE}/email`] ||
      `${auth0Id.replace('|', '_')}@example.com`;

    req.user = { auth0Id, email };
    next();
  } catch (error) {
    next(error);
  }
};

export const attachDbUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { auth0Id, email } = req.user!;
    req.dbUser = await prisma.user.upsert({
      where: { authProviderId: auth0Id },
      update: {},
      create: { authProviderId: auth0Id, email }
    });
    next();
  } catch (error) {
    next(error);
  }
};