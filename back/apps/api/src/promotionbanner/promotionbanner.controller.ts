// src/promotionbanner/promotionbanner.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { PromotionbannerService } from './promotionbanner.service';
import { Prisma } from '@prisma/client';
import { Public } from 'libs/common/decorators';

@Controller('promotionbanner')
export class PromotionbannerController {
  constructor(
    private readonly promotionbannerService: PromotionbannerService,
  ) {}

  @Get()
  getAll() {
    return this.promotionbannerService.findAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.promotionbannerService.findOne(Number(id));
  }

  @Public()
  @Get('/active')
  async getActiveBanner() {
    const active = await this.promotionbannerService.getActiveBanner();
    if (!active) throw new NotFoundException('활성화된 배너 없음');
    return active.banner;
  }

  @Post()
  create(@Body() data: Prisma.PromotionBannersCreateInput) {
    return this.promotionbannerService.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: Prisma.PromotionBannersUpdateInput,
  ) {
    return this.promotionbannerService.update(Number(id), data);
  }

  @Put('/:id/activate')
  async activateBanner(@Param('id') id: string) {
    return this.promotionbannerService.activateBanner(Number(id));
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.promotionbannerService.delete(Number(id));
  }
}
