CREATE TABLE `TrackInviteLink` (
  `id` VARCHAR(191) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  `trackId` VARCHAR(191) NOT NULL,
  `createdByActorId` VARCHAR(191) NOT NULL,
  `createdByUserId` VARCHAR(191) NULL,
  `createdByName` VARCHAR(191) NULL,
  `createdByEmail` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `disabledAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TrackInviteLink_token_key` (`token`),
  INDEX `TrackInviteLink_trackId_createdByActorId_idx` (`trackId`, `createdByActorId`),
  INDEX `TrackInviteLink_token_idx` (`token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TrackAssignment`
  ADD COLUMN `linkId` VARCHAR(191) NULL,
  ADD INDEX `TrackAssignment_linkId_idx` (`linkId`);
