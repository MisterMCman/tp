-- CreateTable
CREATE TABLE `TrainingRating` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `trainingId` INTEGER NOT NULL,
    `trainerId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,
    `topicId` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TrainingRating_trainingId_companyId_key`(`trainingId`, `companyId`),
    INDEX `TrainingRating_trainerId_fkey`(`trainerId`),
    INDEX `TrainingRating_companyId_fkey`(`companyId`),
    INDEX `TrainingRating_topicId_fkey`(`topicId`),
    INDEX `TrainingRating_trainingId_fkey`(`trainingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TrainingRating` ADD CONSTRAINT `TrainingRating_trainingId_fkey` FOREIGN KEY (`trainingId`) REFERENCES `Training`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainingRating` ADD CONSTRAINT `TrainingRating_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `Trainer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainingRating` ADD CONSTRAINT `TrainingRating_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `TrainingCompany`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainingRating` ADD CONSTRAINT `TrainingRating_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `Topic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

