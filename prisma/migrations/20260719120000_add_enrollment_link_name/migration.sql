-- A class is an EnrollmentLink. Teachers can now run multiple classes per wiki,
-- each with an optional display name. Additive, nullable column — safe to apply
-- against live data.

ALTER TABLE `EnrollmentLink`
  ADD COLUMN `name` VARCHAR(191) NULL;
