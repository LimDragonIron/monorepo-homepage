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

  @Public()
  @Get('/active')
  async getActiveBanner() {
    const result = await this.promotionbannerService.getActiveBanner();
    return result;
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.promotionbannerService.findOne(Number(id));
  }

  @Get()
  getAll() {
    return this.promotionbannerService.findAll();
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
