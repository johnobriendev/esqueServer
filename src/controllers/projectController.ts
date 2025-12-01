// src/controllers/projectController.ts 
import { Response, NextFunction } from 'express';
import prisma from '../models/prisma';
import { AuthenticatedRequest, AuthenticatedController } from '../types/express-custom';
import { getAuthenticatedUser } from '../utils/auth';
import { getUserAccessibleProjects } from '../utils/permissions';



export const createProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    
    const { name, description } = req.body;
    
    const project = await prisma.project.create({
      data: { name, description, userId: user.id }
    });
    
    const response = {
      ...project,
      userRole: 'owner',  
      canWrite: true      
    };
   
    res.status(201).json(response);
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};

export const getAllProjects: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);

    // Get all projects user has access to (owned + collaborated)
    const { owned, collaborated } = await getUserAccessibleProjects(user.id);

    // Combine and sort by most recently updated
    const allProjects = [...owned, ...collaborated].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    res.status(200).json(allProjects);
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};

export const getProjectById: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: projectId } = req.params;

    // Check if user has access to this project
    const project = await prisma.project.findFirst({
      where: { id: projectId }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check if user is owner
    if (project.userId === user.id) {
      res.status(200).json({ ...project, userRole: 'owner', canWrite: true });
      return;
    }

    // Check if user is collaborator
    const collaborator = await prisma.projectCollaborator.findFirst({
      where: { projectId, userId: user.id }
    });

    if (collaborator) {
      res.status(200).json({
        ...project,
        userRole: collaborator.role,
        canWrite: collaborator.role === 'editor'
      });
      return;
    }

    res.status(403).json({ error: 'Access denied' });
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};

export const updateProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { name, description } = req.body;
    const { id: projectId } = req.params;

    // Check if user can write to this project
    const project = await prisma.project.findFirst({
      where: { id: projectId }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check if user is owner
    if (project.userId === user.id) {
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: { name, description }
      });
      res.status(200).json(updatedProject);
      return;
    }

    // Check if user is editor
    const collaborator = await prisma.projectCollaborator.findFirst({
      where: { projectId, userId: user.id }
    });

    if (collaborator && collaborator.role === 'editor') {
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: { name, description }
      });
      res.status(200).json(updatedProject);
      return;
    }

    res.status(403).json({ error: 'Access denied' });
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};

export const deleteProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: projectId } = req.params;

    // Only owners can delete projects
    try {
      await prisma.project.delete({
        where: {
          id: projectId,
          userId: user.id // Only owner can delete
        }
      });

      res.status(204).send();
    } catch (prismaError) {
      const err = prismaError as any;
      if (err.code === 'P2025') {
        res.status(404).json({ error: 'Project not found or unauthorized' });
        return;
      }
      throw prismaError;
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

export const getArchivedProjects: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);

    const { owned, collaborated } = await getUserAccessibleProjects(user.id, true);

    const archivedOwned = owned.filter((p: any) => p.isArchived);
    const archivedCollaborated = collaborated.filter((p: any) => p.isUserArchived || p.isArchived);

    const allArchived = [...archivedOwned, ...archivedCollaborated].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    res.status(200).json(allArchived);
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};

export const archiveProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found or unauthorized' });
      return;
    }

    if (project.isArchived) {
      res.status(400).json({ error: 'Project is already archived' });
      return;
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { isArchived: true }
    });

    res.status(200).json({
      ...updatedProject,
      userRole: 'owner',
      canWrite: true
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

export const unarchiveProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found or unauthorized' });
      return;
    }

    if (!project.isArchived) {
      res.status(400).json({ error: 'Project is not archived' });
      return;
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { isArchived: false }
    });

    res.status(200).json({
      ...updatedProject,
      userRole: 'owner',
      canWrite: true
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

export const hideProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: projectId } = req.params;

    const collaborator = await prisma.projectCollaborator.findFirst({
      where: { projectId, userId: user.id }
    });

    if (!collaborator) {
      res.status(403).json({ error: 'Only collaborators can hide projects. Owners should use archive.' });
      return;
    }

    if (collaborator.isArchived) {
      res.status(400).json({ error: 'Project is already hidden' });
      return;
    }

    await prisma.projectCollaborator.update({
      where: {
        projectId_userId: { projectId, userId: user.id }
      },
      data: { isArchived: true }
    });

    res.status(200).json({ message: 'Project hidden from your view' });
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};

export const unhideProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: projectId } = req.params;

    const collaborator = await prisma.projectCollaborator.findFirst({
      where: { projectId, userId: user.id }
    });

    if (!collaborator) {
      res.status(403).json({ error: 'Only collaborators can unhide projects' });
      return;
    }

    if (!collaborator.isArchived) {
      res.status(400).json({ error: 'Project is not hidden' });
      return;
    }

    await prisma.projectCollaborator.update({
      where: {
        projectId_userId: { projectId, userId: user.id }
      },
      data: { isArchived: false }
    });

    res.status(200).json({ message: 'Project restored to your view' });
  } catch (error) {
    const err = error as any;
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next(error);
  }
};