-- Active time a student spends on each lesson, in seconds. Accumulated by the
-- client only while the tab is visible/focused/not idle. Additive with a
-- default — safe to apply against live data.

ALTER TABLE `LessonProgress`
  ADD COLUMN `timeSpentSec` INT NOT NULL DEFAULT 0;
