-- Optional start/end dates for a class (EnrollmentLink). Access is computed
-- from these on read, so no background job is needed. Additive + nullable —
-- safe to apply against live data.

ALTER TABLE `EnrollmentLink`
  ADD COLUMN `startsAt` DATETIME(3) NULL,
  ADD COLUMN `endsAt` DATETIME(3) NULL;
