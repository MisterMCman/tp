/*
  Warnings:

  - You are about to drop the `_TopicToTrainer` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_TopicToTrainer` DROP FOREIGN KEY `_TopicToTrainer_A_fkey`;

-- DropForeignKey
ALTER TABLE `_TopicToTrainer` DROP FOREIGN KEY `_TopicToTrainer_B_fkey`;

-- DropTable
DROP TABLE `_TopicToTrainer`;

-- CreateTable
CREATE TABLE `TrainerTopic` (
    `trainerId` INTEGER NOT NULL,
    `topicId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`trainerId`, `topicId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TrainerTopic` ADD CONSTRAINT `TrainerTopic_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `Trainer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainerTopic` ADD CONSTRAINT `TrainerTopic_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `Topic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
