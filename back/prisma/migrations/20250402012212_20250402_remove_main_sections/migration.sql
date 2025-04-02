/*
  Warnings:

  - You are about to drop the `main_sections` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `files` DROP FOREIGN KEY `files_mina_section_id_fkey`;

-- DropIndex
DROP INDEX `files_mina_section_id_fkey` ON `files`;

-- AlterTable
ALTER TABLE `files` ADD COLUMN `promotion_banner_id` INTEGER NULL;

-- DropTable
DROP TABLE `main_sections`;

-- CreateTable
CREATE TABLE `promotion_banners` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NULL,
    `content` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `promotion_banners` ADD CONSTRAINT `promotion_banners_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_promotion_banner_id_fkey` FOREIGN KEY (`promotion_banner_id`) REFERENCES `promotion_banners`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
