-- Users, sessions, enrollment links, enrollments, lesson progress.
-- Uses Prisma relationMode = "prisma": no FK constraints, only indexes.

CREATE TABLE `User` (
  `id`           VARCHAR(191) NOT NULL,
  `email`        VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `name`         VARCHAR(191) NULL,
  `role`         VARCHAR(191) NOT NULL,
  `disabledAt`   DATETIME(3) NULL,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3) NOT NULL,
  UNIQUE INDEX `User_email_key` (`email`),
  INDEX `User_role_idx` (`role`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Session` (
  `id`        VARCHAR(191) NOT NULL,
  `token`     VARCHAR(191) NOT NULL,
  `userId`    VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `Session_token_key` (`token`),
  INDEX `Session_userId_idx` (`userId`),
  INDEX `Session_token_idx` (`token`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EnrollmentLink` (
  `id`         VARCHAR(191) NOT NULL,
  `token`      VARCHAR(191) NOT NULL,
  `teacherId`  VARCHAR(191) NOT NULL,
  `wikiSlug`   VARCHAR(191) NOT NULL,
  `isActive`   BOOLEAN NOT NULL DEFAULT true,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `disabledAt` DATETIME(3) NULL,
  UNIQUE INDEX `EnrollmentLink_token_key` (`token`),
  INDEX `EnrollmentLink_teacherId_wikiSlug_idx` (`teacherId`, `wikiSlug`),
  INDEX `EnrollmentLink_token_idx` (`token`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Enrollment` (
  `id`        VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `linkId`    VARCHAR(191) NOT NULL,
  `wikiSlug`  VARCHAR(191) NOT NULL,
  `status`    VARCHAR(191) NOT NULL DEFAULT 'active',
  `joinedAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `removedAt` DATETIME(3) NULL,
  UNIQUE INDEX `Enrollment_studentId_wikiSlug_linkId_key` (`studentId`, `wikiSlug`, `linkId`),
  INDEX `Enrollment_teacherId_status_idx` (`teacherId`, `status`),
  INDEX `Enrollment_studentId_status_idx` (`studentId`, `status`),
  INDEX `Enrollment_linkId_idx` (`linkId`),
  INDEX `Enrollment_wikiSlug_idx` (`wikiSlug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LessonProgress` (
  `id`           VARCHAR(191) NOT NULL,
  `studentId`    VARCHAR(191) NOT NULL,
  `wikiSlug`     VARCHAR(191) NOT NULL,
  `lessonId`     VARCHAR(191) NOT NULL,
  `status`       VARCHAR(191) NOT NULL DEFAULT 'in_progress',
  `lastViewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt`  DATETIME(3) NULL,
  UNIQUE INDEX `LessonProgress_studentId_lessonId_key` (`studentId`, `lessonId`),
  INDEX `LessonProgress_studentId_wikiSlug_idx` (`studentId`, `wikiSlug`),
  INDEX `LessonProgress_lessonId_idx` (`lessonId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
