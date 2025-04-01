import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { User } from 'libs/types';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@app/config';
import { SignUpDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
    user: User,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.getOrThrow<AuthConfig>('jwt').jwt.expiresIn,
      secret: this.configService.getOrThrow<AuthConfig>('jwt').jwt.secret,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn:
        this.configService.getOrThrow<AuthConfig>('jwt').refreshToken.expiresIn,
      secret:
        this.configService.getOrThrow<AuthConfig>('jwt').refreshToken.secret,
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.getOrThrow<AuthConfig>('jwt').refreshToken.secret,
      });

      const newAccessToken = await this.jwtService.signAsync(
        {
          id: payload.id,
          email: payload.email,
          role: payload.role,
          name: payload.name,
        },
        {
          expiresIn:
            this.configService.getOrThrow<AuthConfig>('jwt').jwt.expiresIn,
          secret: this.configService.getOrThrow<AuthConfig>('jwt').jwt.secret,
        },
      );

      return {
        accessToken: newAccessToken,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
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
