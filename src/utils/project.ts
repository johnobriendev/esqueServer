import prisma from '../models/prisma';

export const touchProjectActivity = (projectId: string) =>
  prisma.project.update({ where: { id: projectId }, data: { lastActivityAt: new Date() } });
