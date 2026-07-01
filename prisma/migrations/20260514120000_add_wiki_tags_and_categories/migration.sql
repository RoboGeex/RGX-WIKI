-- Add `tags` JSON column to the Wiki table (categories assigned to a wiki).
-- Uses information_schema check so re-running on environments that already
-- received the column via the in-app ensure-column path is a no-op.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Wiki'
    AND COLUMN_NAME = 'tags'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `Wiki` ADD COLUMN `tags` JSON NULL',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Master list of categories that wikis can be tagged with.
-- Only superadmins write here; everyone authenticated can read.
CREATE TABLE IF NOT EXISTS `Category` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(191) NOT NULL,
  `createdBy`  VARCHAR(191) NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Category_name_key` (`name`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
