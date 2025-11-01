-- AlterTable
ALTER TABLE `Lesson`
  DROP INDEX `Lesson_slug_key`,
  ADD UNIQUE INDEX `Lesson_wikiSlug_slug_key`(`wikiSlug`, `slug`);
