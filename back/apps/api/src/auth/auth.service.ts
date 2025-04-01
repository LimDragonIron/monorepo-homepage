import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload, Tokens, User } from 'libs/types';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@app/config';
import { SignUpDto } from './dto/signup.dto';
import { nanoid } from 'nanoid';
import { RedisService } from '@app/redis';

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

  async signin(user: User): Promise<Tokens> {
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

    return { accessToken, refreshToken };
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
    const result = await this.jwtService.signAsync(payload, {
      expiresIn:
        this.configService.getOrThrow<AuthConfig>('jwt').accessToken.expiresIn,
      secret:
        this.configService.getOrThrow<AuthConfig>('jwt').accessToken.secret,
    });
    return result;
  }

  private async generateRefreshToken(
    user: User,
    sessionId: string,
  ): Promise<string> {
    const result = await this.jwtService.signAsync(
      { sub: user.id, sessionId, jti: nanoid() },
      {
        expiresIn:
          this.configService.getOrThrow<AuthConfig>('jwt').refreshToken
            .expiresIn,
        secret:
          this.configService.getOrThrow<AuthConfig>('jwt').refreshToken.secret,
      },
    );
    return result;
  }

  async refresh(refreshPayload: JwtPayload): Promise<{ accessToken: string }> {
    const { sub: userId, sessionId } = refreshPayload;

    // Redis에서 저장된 리프레시 토큰 확인
    const storedToken = await this.redisService.get(
      `refresh_token:${userId}:${sessionId}`,
    );

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 사용자 정보 가져오기
    const user = await this.userService.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 새로운 액세스 토큰 발급
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        jti: nanoid(),
        sessionId,
      },
      {
        secret:
          this.configService.getOrThrow<AuthConfig>('jwt').accessToken.secret,
        expiresIn:
          this.configService.getOrThrow<AuthConfig>('jwt').accessToken
            .expiresIn,
      },
    );

    return { accessToken };
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.redisService.removeSession(userId, sessionId);
    await this.redisService.delete(`refresh_token:${userId}:${sessionId}`);
  }

  async signup(user: SignUpDto): Promise<boolean> {
    const existingUser = await this.userService.findUserByEmail(user.email);
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const newUser = await this.userService.createUser(user);
    if (!newUser) {
      throw new UnauthorizedException('User creation failed');
    }

    return true;
  }
}
