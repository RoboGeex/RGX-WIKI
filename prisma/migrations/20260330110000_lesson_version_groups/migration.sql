-- Enable grouped lesson versions (draft/published/archived)
ALTER TABLE `Lesson`
  ADD COLUMN `lessonKey` VARCHAR(191) NULL AFTER `id`;

UPDATE `Lesson`
SET `lessonKey` = `id`
WHERE `lessonKey` IS NULL OR `lessonKey` = '';

ALTER TABLE `Lesson`
  MODIFY `lessonKey` VARCHAR(191) NOT NULL;

ALTER TABLE `Lesson`
  DROP INDEX `Lesson_wikiSlug_slug_key`,
  ADD INDEX `Lesson_wikiSlug_lessonKey_idx`(`wikiSlug`, `lessonKey`),
  ADD INDEX `Lesson_wikiSlug_slug_status_version_idx`(`wikiSlug`, `slug`, `status`, `version`),
  ADD INDEX `Lesson_wikiSlug_lessonKey_status_version_idx`(`wikiSlug`, `lessonKey`, `status`, `version`);
