-- Add status and publishedAt to lessons for review/publish flow
ALTER TABLE `Lesson`
  ADD COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  ADD COLUMN `publishedAt` DATETIME(3) NULL;
