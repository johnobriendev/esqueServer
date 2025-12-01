// src/routes/teamRoutes.ts
import { Router } from 'express';
import { checkJwt, extractUserInfo } from '../middleware/auth';
import { teamRateLimit, inviteRateLimit } from '../middleware/rateLimiter';
import {
  inviteUserToProject,
  getUserInvitations,
  acceptInvitation,
  declineInvitation,
  getProjectCollaborators,
  removeTeamMember,
  updateMemberRole,
  leaveProject
} from '../controllers/teamController';

const router = Router();

// Apply authentication to all routes
router.use(checkJwt);
router.use(extractUserInfo);
router.use(teamRateLimit);


router.post('/projects/:id/invite',inviteRateLimit, inviteUserToProject);

router.get('/users/invitations', getUserInvitations);

router.post('/invitations/:token/accept', acceptInvitation);

router.delete('/invitations/:id', declineInvitation);

router.get('/projects/:id/collaborators', getProjectCollaborators);

router.delete('/projects/:id/collaborators/:userId', removeTeamMember);

router.put('/projects/:id/collaborators/:userId/role', updateMemberRole);

router.delete('/projects/:id/leave', leaveProject);

export default router;