import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest, JwtPayload } from 'libs/types';

@Injectable()
export class RefreshGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractRefreshToken(request);

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        clockTolerance: 30, // 30초 시간 오차 허용
        ignoreExpiration: false, // 기본값(false)이지만 명시적 설정
      });

      this.validateTokenTiming(payload);
      request.refreshPayload = payload;
      return true;
    } catch (error) {
      this.handleAuthError(error, request);
    }
  }

  private extractRefreshToken(request: AuthenticatedRequest): string {
    const token = request.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException('Refresh token missing');
    return token;
  }

  private validateTokenTiming(payload: JwtPayload): void {
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now - 30) {
      // 30초 유예 기간
      throw new UnauthorizedException('Refresh token expired');
    }
  }

  private handleAuthError(error: Error, request: AuthenticatedRequest): never {
    const errorInfo = {
      path: request.url,
      method: request.method,
      error: error.message,
    };

    console.error('Auth Error:', errorInfo);
    throw new UnauthorizedException({
      statusCode: 401,
      message: 'Authentication failed',
      details: errorInfo,
    });
  }
}
