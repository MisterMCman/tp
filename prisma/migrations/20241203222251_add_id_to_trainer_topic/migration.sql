/*
  Warnings:

  - The primary key for the `TrainerTopic` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[trainerId,topicId]` on the table `TrainerTopic` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id` to the `TrainerTopic` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `TrainerTopic` DROP PRIMARY KEY,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- CreateIndex
CREATE UNIQUE INDEX `TrainerTopic_trainerId_topicId_key` ON `TrainerTopic`(`trainerId`, `topicId`);
