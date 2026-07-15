CREATE TABLE `Track` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `createdByUserId` VARCHAR(191) NULL,
  `createdByType` VARCHAR(191) NOT NULL,
  `createdByName` VARCHAR(191) NULL,
  `createdByEmail` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Track_createdByUserId_idx` (`createdByUserId`),
  INDEX `Track_createdByType_idx` (`createdByType`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TrackWiki` (
  `id` VARCHAR(191) NOT NULL,
  `trackId` VARCHAR(191) NOT NULL,
  `wikiSlug` VARCHAR(191) NOT NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TrackWiki_trackId_wikiSlug_key` (`trackId`, `wikiSlug`),
  INDEX `TrackWiki_trackId_position_idx` (`trackId`, `position`),
  INDEX `TrackWiki_wikiSlug_idx` (`wikiSlug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TrackAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `trackId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `assignedByUserId` VARCHAR(191) NULL,
  `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TrackAssignment_trackId_studentId_key` (`trackId`, `studentId`),
  INDEX `TrackAssignment_studentId_idx` (`studentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
