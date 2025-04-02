import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { GlobalConfigModule } from '@app/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PromotionbannerModule } from './promotionbanner/promotionbanner.module';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from 'libs/errors';

@Module({
  imports: [GlobalConfigModule, AuthModule, UserModule, PromotionbannerModule],
  controllers: [ApiController],
  providers: [
    ApiService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class ApiModule {}
