import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@app/config';

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.getOrThrow<AuthConfig>('jwt').accessToken.secret,
        signOptions: {
          expiresIn:
            configService.getOrThrow<AuthConfig>('jwt').accessToken.expiresIn,
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
