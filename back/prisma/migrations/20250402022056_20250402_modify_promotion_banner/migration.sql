-- AlterTable
ALTER TABLE `promotion_banners` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `active_promotion_banner` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `bannerId` INTEGER NOT NULL,
    `activatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `active_promotion_banner_id_key`(`id`),
    UNIQUE INDEX `active_promotion_banner_bannerId_key`(`bannerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `active_promotion_banner` ADD CONSTRAINT `active_promotion_banner_bannerId_fkey` FOREIGN KEY (`bannerId`) REFERENCES `promotion_banners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
