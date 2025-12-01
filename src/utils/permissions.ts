// src/utils/permissions.ts
import prisma from '../models/prisma';

export type ProjectRole = 'owner' | 'editor' | 'viewer';
export type Permission = 'read' | 'write';

// Simple function to check if user can access a project and what they can do
export async function getUserProjectAccess(
  userId: string, 
  projectId: string
): Promise<{ hasAccess: boolean; role: ProjectRole | null; canWrite: boolean }> {
  
  // Check if user is project owner
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId }
  });
  
  if (project) {
    return { hasAccess: true, role: 'owner', canWrite: true };
  }
  
  // Check if user is a collaborator
  const collaborator = await prisma.projectCollaborator.findFirst({
    where: { projectId, userId }
  });
  
  if (collaborator) {
    const role = collaborator.role as ProjectRole;
    const canWrite = role === 'editor';
    return { hasAccess: true, role, canWrite };
  }
  
  // No access
  return { hasAccess: false, role: null, canWrite: false };
}

// Get all projects user has access to (owned + collaborated)
export async function getUserAccessibleProjects(userId: string, includeArchived: boolean = false) {
  const [ownedProjects, collaboratedProjects] = await Promise.all([
    // Projects owned by user
    prisma.project.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { isArchived: false })
      },
      orderBy: { updatedAt: 'desc' }
    }),

    // Projects user collaborates on
    prisma.project.findMany({
      where: {
        collaborators: {
          some: {
            userId,
            ...(includeArchived ? {} : { isArchived: false })
          }
        },
        ...(includeArchived ? {} : { isArchived: false })
      },
      include: {
        collaborators: {
          where: { userId },
          select: { role: true, isArchived: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
  ]);

  return {
    owned: ownedProjects.map((p: any) => ({
      ...p,
      userRole: 'owner' as const,
      canWrite: true,
      isUserArchived: p.isArchived
    })),
    collaborated: collaboratedProjects.map((p: any) => ({
      ...p,
      userRole: p.collaborators[0].role as ProjectRole,
      canWrite: p.collaborators[0].role === 'editor',
      isUserArchived: p.collaborators[0].isArchived
    }))
  };
}

// Helper to validate if user can perform an action
export async function validateProjectAccess(
  userId: string,
  projectId: string,
  requiredPermission: Permission
): Promise<{ success: boolean; role?: ProjectRole; error?: string }> {
  
  const access = await getUserProjectAccess(userId, projectId);
  
  if (!access.hasAccess) {
    return { success: false, error: 'Project not found or access denied' };
  }
  
  if (requiredPermission === 'write' && !access.canWrite) {
    return { success: false, error: 'Write permission required. Your role: ' + access.role };
  }
  
  return { success: true, role: access.role! };
}