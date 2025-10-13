-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "statusPosition" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Task_status_statusPosition_idx" ON "Task"("status", "statusPosition");

-- Initialize statusPosition values based on current order
-- Group by projectId and status, then set sequential statusPosition values
WITH ranked_tasks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "projectId", status
      ORDER BY "createdAt"
    ) - 1 as new_status_position
  FROM "Task"
)
UPDATE "Task"
SET "statusPosition" = ranked_tasks.new_status_position
FROM ranked_tasks
WHERE "Task".id = ranked_tasks.id;
