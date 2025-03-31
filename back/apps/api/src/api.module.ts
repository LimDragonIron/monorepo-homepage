import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { GlobalConfigModule } from '@app/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [GlobalConfigModule, AuthModule, UserModule],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
