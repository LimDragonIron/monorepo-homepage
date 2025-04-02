import { Module, Provider } from '@nestjs/common';
import { PromotionbannerService } from './promotionbanner.service';
import { PromotionbannerController } from './promotionbanner.controller';

@Module({
  controllers: [PromotionbannerController],
  providers: [PromotionbannerService],
})
export class PromotionbannerModule {}
