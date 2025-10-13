-- Update all tasks with priority 'none' to 'low'
UPDATE "Task" SET priority = 'low' WHERE priority = 'none';
