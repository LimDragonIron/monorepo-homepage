import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedRequest, JwtPayload } from 'libs/types';
import { AuthConfig } from '@app/config';
import { RedisService } from '@app/redis';
import { ResponseBuilder } from 'libs/common/response/response-builder';
import { nanoid } from 'nanoid';

export const IS_PUBLIC_KEY = 'isPublic';
export const TOKEN_TYPE_KEY = 'tokenType';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    let payload: JwtPayload | undefined;
    const tokenType = this.getTokenType(context);
    const { token, secret } = this.extractTokenData(request, tokenType);
    try {
      payload = await this.verifyToken(token, secret);
      await this.validateSession(payload);
      await this.checkTokenReuse(request, payload);
      this.assignPayload(request, payload, tokenType);
      return true;
    } catch (error) {
      const errorPayload = payload ?? this.decodePartialPayload(token);
      this.handleSecurityEvents(error, request, errorPayload);
      throw error;
    }
  }

  private decodePartialPayload(token: string): Partial<JwtPayload> {
    try {
      const decoded = this.jwtService.decode(token) as Partial<JwtPayload>;
      return {
        sub: decoded?.sub,
        jti: decoded?.jti,
        sessionId: decoded?.sessionId,
        name: decoded?.name,
        email: decoded?.email,
        role: decoded?.role,
      };
    } catch {
      return {};
    }
  }

  private getTokenType(context: ExecutionContext): 'access' | 'refresh' {
    return (
      this.reflector.getAllAndOverride<'access' | 'refresh'>(TOKEN_TYPE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || 'access'
    );
  }

  private extractTokenData(
    request: AuthenticatedRequest,
    tokenType: 'access' | 'refresh',
  ): { token: string; secret: string } {
    const token = this.extractTokenFromRequest(request, tokenType);
    const secret =
      this.configService.getOrThrow<AuthConfig>('jwt')[
        tokenType === 'access' ? 'accessToken' : 'refreshToken'
      ].secret;

    return { token, secret };
  }

  private extractTokenFromRequest(
    request: AuthenticatedRequest,
    tokenType: 'access' | 'refresh',
  ): string {
    const cookieName =
      tokenType === 'access' ? 'access_token' : 'refresh_token';
    const sources = [
      request.headers.authorization?.split(' ')[1],
      request.cookies?.[cookieName],
      request.query?.token,
    ];

    const token = sources.find((t) => typeof t === 'string' && t.length >= 100);
    if (!token) throw new UnauthorizedException('Token not found');

    return token;
  }

  private async verifyToken(
    token: string,
    secret: string,
  ): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
        clockTolerance: 30,
      });
    } catch (e) {
      const errorType =
        e.name === 'TokenExpiredError'
          ? 'Expired token'
          : 'Invalid token signature';
      throw new UnauthorizedException(errorType);
    }
  }

  private async validateSession(payload: JwtPayload): Promise<void> {
    const sessionValid = await this.redisService.validateSession(
      payload.sub,
      payload.sessionId,
    );

    if (!sessionValid) {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  private async checkTokenReuse(
    request: AuthenticatedRequest,
    payload: JwtPayload,
  ): Promise<void> {
    const lastUsedAt = await this.redisService.get(
      `token:lastUsed:${payload.jti}`,
    );
    if (lastUsedAt) {
      // 토큰 패밀리 전체 삭제 (token family 개념 적용)
      await this.redisService.deleteByPattern(`token:family:${payload.sub}:*`);

      // 보안 이벤트 발행
      await this.redisService.publish('security-events', {
        type: 'TOKEN_REUSE',
        jti: payload.jti,
        ip: request.ip || request.headers['x-forwarded-for'],
        userId: payload.sub,
        timestamp: new Date(),
      });

      throw new ForbiddenException(
        ResponseBuilder.Error('Security violation detected', 'TOKEN_REUSE', {
          action: 'full_logout',
        }),
      );
    }

    // 토큰 패밀리 추적 추가
    const familyKey = `token:family:${payload.sub}:${nanoid()}`;
    const ttl = payload.exp - Math.floor(Date.now() / 1000);

    await Promise.all([
      this.redisService.set(`token:lastUsed:${payload.jti}`, Date.now(), ttl),
      this.redisService.set(familyKey, payload.jti, ttl),
    ]);
  }

  private assignPayload(
    request: AuthenticatedRequest,
    payload: JwtPayload,
    tokenType: 'access' | 'refresh',
  ): void {
    if (tokenType === 'access') {
      request.jwtPayload = payload;
    } else {
      request.refreshPayload = payload;
    }
  }

  private handleSecurityEvents(
    error: Error,
    request: AuthenticatedRequest,
    payload?: Partial<JwtPayload>,
  ): void {
    const eventData = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ip:
        request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress ||
        request.ip,
      userAgent: request.headers['user-agent'],
      errorMessage: error.message,
      userId: payload?.sub ?? 'unknown',
      sessionId: payload?.sessionId ?? 'unknown',
      tokenId: payload?.jti ?? 'unknown',
    };

    console.error('Security Event:', eventData);
    this.redisService.publish('security-audit', eventData);
  }
}
