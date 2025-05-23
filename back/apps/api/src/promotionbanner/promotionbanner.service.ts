import { DatabaseService } from '@app/database/database.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PromotionBanners } from '@prisma/client';
import { ResponseBuilder } from 'libs/common/response/response-builder';

@Injectable()
export class PromotionbannerService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(): Promise<PromotionBanners[]> {
    return this.database.promotionBanners.findMany();
  }

  async findOne(id: number): Promise<PromotionBanners | null> {
    return this.database.promotionBanners.findUnique({
      where: { id },
    });
  }

  async create(
    data: Prisma.PromotionBannersCreateInput,
  ): Promise<PromotionBanners> {
    return this.database.promotionBanners.create({ data });
  }

  async update(
    id: number,
    data: Prisma.PromotionBannersUpdateInput,
  ): Promise<PromotionBanners> {
    return this.database.promotionBanners.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<PromotionBanners> {
    return this.database.promotionBanners.delete({
      where: { id },
    });
  }

  async activateBanner(bannerId: number) {
    return this.database.$transaction([
      // 기존 활성화된 배너 비활성화
      this.database.activePromotionBanner.deleteMany({}),
      // 새 배너 활성화
      this.database.activePromotionBanner.create({
        data: { bannerId },
      }),
      // isActive 상태 업데이트
      this.database.promotionBanners.update({
        where: { id: bannerId },
        data: { isActive: true },
      }),
    ]);
  }

  async getActiveBanner(): Promise<ResponseBuilder<PromotionBanners, string>> {
    const active = await this.database.activePromotionBanner.findFirst({
      include: { banner: true },
    });

    if (!active) {
      throw new NotFoundException(
        ResponseBuilder.Error('활성화된 배너 없음', 'RESOURCE_NOT_FOUND'),
      );
    }
    return ResponseBuilder.OK_WITH(active.banner, ' 활성화 배너 ');
  }
}
