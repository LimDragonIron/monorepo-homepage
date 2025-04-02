import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload, Tokens, User } from 'libs/types';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@app/config';
import { SignUpDto } from './dto/signup.dto';
import { nanoid } from 'nanoid';
import { RedisService } from '@app/redis';
import { ResponseBuilder } from 'libs/common/response/response-builder';
import { SignInDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findUserByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.userService.comparePassword(
      password,
      user.password,
    );

    if (isPasswordValid) {
      return user;
    }

    return null;
  }

  async signin(
    signinDto: SignInDto,
  ): Promise<ResponseBuilder<Tokens, undefined>> {
    const user = await this.validateUser(signinDto.email, signinDto.password);

    if (!user) {
      throw new UnauthorizedException(
        ResponseBuilder.Error('Invalid credentials', 'UNAUTHORIZED'),
      );
    }

    const sessionId = nanoid();
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user, sessionId),
      this.generateRefreshToken(user, sessionId),
    ]);

    await this.redisService.set(
      `refresh_token:${user.id}:${sessionId}`,
      refreshToken,
      60 * 60 * 24 * 7, // TTL
    );

    await this.redisService.setUserSession(
      user.id,
      sessionId,
      60 * 60 * 24 * 1, // TTL
    );

    return ResponseBuilder.OK_WITH({ accessToken, refreshToken });
  }

  private async generateAccessToken(
    user: User,
    sessionId: string,
  ): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId,
      jti: nanoid(),
    };
    return this.jwtService.signAsync(payload, {
      expiresIn:
        this.configService.getOrThrow<AuthConfig>('jwt').accessToken.expiresIn,
      secret:
        this.configService.getOrThrow<AuthConfig>('jwt').accessToken.secret,
    });
  }

  private async generateRefreshToken(
    user: User,
    sessionId: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      { sub: user.id, sessionId, jti: nanoid() },
      {
        expiresIn:
          this.configService.getOrThrow<AuthConfig>('jwt').refreshToken
            .expiresIn,
        secret:
          this.configService.getOrThrow<AuthConfig>('jwt').refreshToken.secret,
      },
    );
  }
  async refreshToken(
    refreshPayload: JwtPayload,
  ): Promise<ResponseBuilder<Tokens, string>> {
    const {
      sub: userId,
      sessionId: oldSessionId,
      jti: oldJti,
    } = refreshPayload;

    // 1. 저장된 Refresh Token 확인
    const storedToken = await this.redisService.get(
      `refresh_token:${userId}:${oldSessionId}`,
    );
    if (!storedToken) {
      throw new UnauthorizedException(
        ResponseBuilder.Error('Invalid refresh token', 'TOKEN_INVALID'),
      );
    }

    // 2. 사용자 세션 유효성 검증 (추가된 부분)
    const sessionValid = await this.redisService.validateSession(
      userId,
      oldSessionId,
    );
    if (!sessionValid) {
      throw new UnauthorizedException(
        ResponseBuilder.Error('Expired session', 'SESSION_EXPIRED'),
      );
    }

    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 3. 새로운 세션 ID 생성
    const newSessionId = nanoid();

    // 4. 새로운 토큰 쌍 생성
    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.generateAccessToken(user, newSessionId),
      this.generateRefreshToken(user, newSessionId),
    ]);

    // 5. 기존 데이터 무효화 (개선된 부분)
    await Promise.all([
      this.redisService.delete(`refresh_token:${userId}:${oldSessionId}`),
      this.redisService.set(
        `token:lastUsed:${oldJti}`,
        Date.now(),
        refreshPayload.exp - Math.floor(Date.now() / 1000),
      ),
      this.redisService.removeSession(userId, oldSessionId), // 기존 세션 제거
    ]);

    // 6. 새로운 데이터 저장 (개선된 부분)
    await Promise.all([
      this.redisService.set(
        `refresh_token:${userId}:${newSessionId}`,
        newRefreshToken,
        60 * 60 * 24 * 7,
      ),
      this.redisService.setUserSession(userId, newSessionId, 60 * 60 * 24 * 1), // 새 세션 등록
    ]);

    return ResponseBuilder.OK_WITH(
      { accessToken: newAccessToken, refreshToken: newRefreshToken },
      'Token refreshed successfully',
    );
  }

  async logout(
    userId: string,
    sessionId: string,
  ): Promise<ResponseBuilder<string, string>> {
    await this.redisService.removeSession(userId, sessionId);
    await this.redisService.delete(`refresh_token:${userId}:${sessionId}`);

    return ResponseBuilder.OK();
  }

  async signup(signupDto: SignUpDto): Promise<ResponseBuilder<string, null>> {
    const existingUser = await this.userService.findUserByEmail(
      signupDto.email,
    );

    if (existingUser) {
      throw new UnauthorizedException(
        ResponseBuilder.Error('User already exists', 'UNAUTHORIZED'),
      );
    }

    const newUser = await this.userService.createUser(signupDto);

    if (!newUser) {
      throw new UnauthorizedException(
        ResponseBuilder.Error('User creation failed', 'UNAUTHORIZED'),
      );
    }

    return ResponseBuilder.OK_WITH('Signup successful', null);
  }

  async getProfile(
    jwtPayload: JwtPayload,
  ): Promise<ResponseBuilder<User, undefined>> {
    if (!jwtPayload) {
      throw new UnauthorizedException(
        ResponseBuilder.Error('JWT payload not found', 'UNAUTHORIZED'),
      );
    }

    const profileData = await this.userService.findUserById(jwtPayload.sub);

    if (!profileData) {
      throw new UnauthorizedException(
        ResponseBuilder.Error('User not found', 'UNAUTHORIZED'),
      );
    }

    return ResponseBuilder.OK_WITH(profileData);
  }
}
