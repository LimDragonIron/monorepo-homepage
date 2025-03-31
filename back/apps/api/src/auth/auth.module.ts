import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthConfig } from '@app/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';

const AuthGuardMeta = {
  provide: APP_GUARD,
  useClass: AuthGuard,
};

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.getOrThrow<AuthConfig>('jwt').jwt.secret,
        signOptions: {
          expiresIn: configService.getOrThrow<AuthConfig>('jwt').jwt.expiresIn,
        },
        refreshSecret:
          configService.getOrThrow<AuthConfig>('jwt').refreshToken.secret,
        refreshExpiresIn:
          configService.getOrThrow<AuthConfig>('jwt').refreshToken.expiresIn,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
