-- AlterTable
ALTER TABLE "Project" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProjectCollaborator" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Project_userId_isArchived_idx" ON "Project"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "ProjectCollaborator_userId_isArchived_idx" ON "ProjectCollaborator"("userId", "isArchived");
