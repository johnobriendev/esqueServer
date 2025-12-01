// src/controllers/teamController.ts
import { Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import prisma from '../models/prisma';
import { AuthenticatedRequest, AuthenticatedController } from '../types/express-custom';
import { getAuthenticatedUser } from '../utils/auth';
import { validateProjectAccess } from '../utils/permissions';

// Helper to generate secure invitation token
function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

// Helper to calculate invitation expiry (7 days)
function getInvitationExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry;
}

// 1. POST /projects/:id/invite - Send invitation
export const inviteUserToProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: projectId } = req.params;
    const { email, role } = req.body;
    
    // Validate inputs
    if (!email || !role) {
      res.status(400).json({ error: 'Email and role are required' });
      return;
    }
    
    if (!['editor', 'viewer'].includes(role)) {
      res.status(400).json({ error: 'Role must be editor or viewer' });
      return;
    }
    
    // Check if user is project owner (only owners can invite)
    const access = await validateProjectAccess(user.id, projectId, 'write');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }
    
    if (access.role !== 'owner') {
      res.status(403).json({ error: 'Only project owners can invite team members' });
      return;
    }
    
    // Check if email is already a collaborator
    const existingCollaborator = await prisma.projectCollaborator.findFirst({
      where: {
        projectId,
        user: { email: email.toLowerCase() }
      }
    });
    
    if (existingCollaborator) {
      res.status(400).json({ error: 'User is already a team member' });
      return;
    }
    
    // Check for existing pending invitation
    const existingInvitation = await prisma.projectInvitation.findFirst({
      where: {
        projectId,
        receiverEmail: email.toLowerCase(),
        status: 'pending'
      }
    });
    
    if (existingInvitation) {
      res.status(400).json({ error: 'User already has a pending invitation' });
      return;
    }
    
    // Create invitation
    const token = generateInvitationToken();
    const invitation = await prisma.projectInvitation.create({
      data: {
        projectId,
        senderUserId: user.id,
        receiverEmail: email.toLowerCase(),
        role,
        token,
        expiresAt: getInvitationExpiry()
      },
      include: {
        project: { select: { name: true } }
      }
    });
    
    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.receiverEmail,
        role: invitation.role,
        projectName: invitation.project.name,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET /users/invitations - Get user's invitations
export const getUserInvitations: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    
    // Auto-cleanup expired invitations
    await prisma.projectInvitation.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: new Date() }
      },
      data: { status: 'expired' }
    });
    
    const invitations = await prisma.projectInvitation.findMany({
      where: {
        receiverEmail: user.email.toLowerCase(),
        status: 'pending'
      },
      include: {
        project: { select: { name: true, description: true } },
        sender: { select: { email: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.status(200).json(invitations);
  } catch (error) {
    next(error);
  }
};

// 3. POST /invitations/:token/accept - Accept invitation
export const acceptInvitation: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { token } = req.params;
    
    const invitation = await prisma.projectInvitation.findFirst({
      where: {
        token,
        status: 'pending',
        expiresAt: { gt: new Date() }
      },
      include: {
        project: { select: { name: true } }
      }
    });
    
    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found or expired' });
      return;
    }
    
    if (invitation.receiverEmail !== user.email.toLowerCase()) {
      res.status(403).json({ error: 'This invitation is not for you' });
      return;
    }
    
    // 🔧 FIX: Delete any existing invitations with 'accepted' status first
    await prisma.$transaction([
      // Delete any existing accepted invitations for this project/email
      prisma.projectInvitation.deleteMany({
        where: {
          projectId: invitation.projectId,
          receiverEmail: invitation.receiverEmail,
          status: 'accepted'
        }
      }),
      // Create collaborator relationship
      prisma.projectCollaborator.upsert({
        where: {
          projectId_userId: {
            projectId: invitation.projectId,
            userId: user.id
          }
        },
        update: {
          role: invitation.role // Update role if user was previously a collaborator
        },
        create: {
          projectId: invitation.projectId,
          userId: user.id,
          role: invitation.role
        }
      }),
      // Update current invitation status
      prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted' }
      })
    ]);
    
    res.status(200).json({
      message: `Successfully joined ${invitation.project.name}`,
      projectId: invitation.projectId,
      role: invitation.role
    });
  } catch (error) {
    next(error);
  }
};

// 4. DELETE /invitations/:id - Decline invitation
export const declineInvitation: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = req.params;
    
    const invitation = await prisma.projectInvitation.findFirst({
      where: {
        id,
        receiverEmail: user.email.toLowerCase(),
        status: 'pending'
      }
    });
    
    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' });
      return;
    }
    
    await prisma.projectInvitation.update({
      where: { id },
      data: { status: 'declined' }
    });
    
    res.status(200).json({ message: 'Invitation declined' });
  } catch (error) {
    next(error);
  }
};

// 5. GET /projects/:id/collaborators - Get project team
export const getProjectCollaborators: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: projectId } = req.params;
    
    // Check if user has access to this project
    const access = await validateProjectAccess(user.id, projectId, 'read');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }
    
    // Get project with owner and collaborators
    const project = await prisma.project.findFirst({
      where: { id: projectId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        collaborators: {
          include: {
            user: { select: { id: true, email: true, name: true } }
          },
          orderBy: { joinedAt: 'asc' }
        }
      }
    });
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    // Format team list
    const team = [
      {
        id: project.user.id,
        email: project.user.email,
        name: project.user.name,
        role: 'owner',
        joinedAt: project.createdAt
      },
      ...project.collaborators.map((c: any) => ({
        id: c.user.id,
        email: c.user.email,
        name: c.user.name,
        role: c.role,
        joinedAt: c.joinedAt
      }))
    ];
    
    res.status(200).json(team);
  } catch (error) {
    next(error);
  }
};

// 6. DELETE /projects/:id/collaborators/:userId - Remove team member
export const removeTeamMember: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: projectId, userId: memberUserId } = req.params;
    
    // Only owners can remove team members
    const access = await validateProjectAccess(user.id, projectId, 'write');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }
    
    if (access.role !== 'owner') {
      res.status(403).json({ error: 'Only project owners can remove team members' });
      return;
    }
    
    // Can't remove the owner
    if (memberUserId === user.id) {
      res.status(400).json({ error: 'Cannot remove project owner' });
      return;
    }
    
    const result = await prisma.projectCollaborator.deleteMany({
      where: {
        projectId,
        userId: memberUserId
      }
    });
    
    if (result.count === 0) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    
    res.status(200).json({ message: 'Team member removed successfully' });
  } catch (error) {
    next(error);
  }
};

// 7. PUT /projects/:id/collaborators/:userId/role - Update member role
export const updateMemberRole: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: projectId, userId: memberUserId } = req.params;
    const { role } = req.body;

    if (!['editor', 'viewer'].includes(role)) {
      res.status(400).json({ error: 'Role must be editor or viewer' });
      return;
    }

    // Only owners can update roles
    const access = await validateProjectAccess(user.id, projectId, 'write');
    if (!access.success) {
      res.status(403).json({ error: access.error });
      return;
    }

    if (access.role !== 'owner') {
      res.status(403).json({ error: 'Only project owners can update member roles' });
      return;
    }

    // Can't update owner role
    if (memberUserId === user.id) {
      res.status(400).json({ error: 'Cannot change owner role' });
      return;
    }

    const collaborator = await prisma.projectCollaborator.update({
      where: {
        projectId_userId: {
          projectId,
          userId: memberUserId
        }
      },
      data: { role },
      include: {
        user: { select: { id: true, email: true, name: true } }
      }
    });

    res.status(200).json({
      id: collaborator.user.id,
      email: collaborator.user.email,
      name: collaborator.user.name,
      role: collaborator.role,
      joinedAt: collaborator.joinedAt
    });
  } catch (error) {
    const err = error as any;
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    next(error);
  }
};

// 8. DELETE /projects/:id/leave - Leave project
export const leaveProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.userId === user.id) {
      res.status(403).json({ error: 'Project owners cannot leave. Transfer ownership or delete the project.' });
      return;
    }

    const collaborator = await prisma.projectCollaborator.findFirst({
      where: { projectId, userId: user.id }
    });

    if (!collaborator) {
      res.status(404).json({ error: 'You are not a member of this project' });
      return;
    }

    await prisma.projectCollaborator.delete({
      where: {
        projectId_userId: { projectId, userId: user.id }
      }
    });

    res.status(200).json({ message: 'Successfully left project' });
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};