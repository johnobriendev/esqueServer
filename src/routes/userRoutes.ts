// src/routes/userRoutes.ts
import { Router } from 'express';
import { checkJwt, extractUserInfo, attachDbUser } from '../middleware/auth';
import { teamRateLimit } from '../middleware/rateLimiter'; 
import * as userController from '../controllers/userController';

const router = Router();

router.use(checkJwt, extractUserInfo, attachDbUser);
router.use(teamRateLimit);

router.get('/me', userController.getCurrentUser);
router.patch('/me', userController.updateUser);

export default router;