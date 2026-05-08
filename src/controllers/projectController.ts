// src/controllers/projectController.ts
import { Response, NextFunction } from 'express';
import prisma from '../models/prisma';
import { AuthenticatedRequest, AuthenticatedController } from '../types/express-custom';
import { getUserAccessibleProjects } from '../utils/permissions';



export const createProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.dbUser!;

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
    next(error);
  }
};

export const getAllProjects: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.dbUser!;

    const { owned, collaborated } = await getUserAccessibleProjects(user.id);

    const allProjects = [...owned, ...collaborated].sort(
      (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );

    res.status(200).json(allProjects);
  } catch (error) {
    next(error);
  }
};

export const getProjectById: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const { role, canWrite } = req.projectAccess!;
    res.status(200).json({ ...project, userRole: role, canWrite });
  } catch (error) {
    next(error);
  }
};

export const updateProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description } = req.body;
    const { id: projectId } = req.params;

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { name, description }
    });
    res.status(200).json(updatedProject);
  } catch (error) {
    next(error);
  }
};

export const deleteProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.dbUser!;
    const { id: projectId } = req.params;

    await prisma.project.delete({
      where: {
        id: projectId,
        userId: user.id
      }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getArchivedProjects: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.dbUser!;

    const { owned, collaborated } = await getUserAccessibleProjects(user.id, true);

    const archivedOwned = owned.filter((p: any) => p.isArchived);
    const archivedCollaborated = collaborated.filter((p: any) => p.isUserArchived || p.isArchived);

    const allArchived = [...archivedOwned, ...archivedCollaborated].sort(
      (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );

    res.status(200).json(allArchived);
  } catch (error) {
    next(error);
  }
};

export const archiveProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.dbUser!;
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
    next(error);
  }
};

export const unarchiveProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.dbUser!;
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
    next(error);
  }
};

export const hideProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.dbUser!;
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
    next(error);
  }
};

export const unhideProject: AuthenticatedController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.dbUser!;
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
    next(error);
  }
};
