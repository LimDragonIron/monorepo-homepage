import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedRequest, JwtPayload } from 'libs/types';
import { AuthConfig } from '@app/config';

const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<AuthConfig>('jwt').jwt.secret,
        clockTolerance: 30, // 30초 시간 오차 허용
        ignoreExpiration: false, // 기본값(false)이지만 명시적 설정
      });

      this.validateTokenTiming(payload);
      request.jwtPayload = payload;
      return true;
    } catch (error) {
      this.handleAuthError(error, request);
    }
  }

  private extractToken(request: AuthenticatedRequest): string {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Bearer token not found');
    }
    return token;
  }

  private validateTokenTiming(payload: JwtPayload): void {
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now - 30) {
      // 30초 유예 기간
      throw new UnauthorizedException('Token expired');
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
