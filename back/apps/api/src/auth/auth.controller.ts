import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { TOKEN_TYPE_KEY } from './auth.guard';
import { AuthenticatedRequest } from 'libs/types';
import { Public } from 'libs/common/decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 사용자 로그인 처리
   * @param signinDto 이메일과 비밀번호를 포함한 로그인 DTO
   */
  @Public()
  @Post('signin')
  async signin(@Body() signinDto: SignInDto) {
    const user = await this.authService.validateUser(
      signinDto.email,
      signinDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return await this.authService.signin(user);
  }

  /**
   * 리프레시 토큰을 사용하여 액세스 토큰 갱신
   * @param req 인증된 요청 객체
   */
  @Post('refresh')
  @SetMetadata(TOKEN_TYPE_KEY, 'refresh') // 리프레시 토큰 타입 설정
  async refreshToken(@Req() req: AuthenticatedRequest) {
    const refreshPayload = req.refreshPayload;

    if (!refreshPayload) {
      throw new UnauthorizedException('Refresh token payload not found');
    }

    return await this.authService.refresh(refreshPayload);
  }

  /**
   * 사용자 회원가입 처리
   * @param signupDto 회원가입 DTO
   */
  @Post('signup')
  @Public()
  async signup(@Body() signupDto: SignUpDto) {
    try {
      return await this.authService.signup(signupDto);
    } catch (error) {
      console.error('Signup error:', error.message);
      throw new UnauthorizedException('Failed to sign up');
    }
  }

  /**
   * 사용자 프로필 조회 (JWT 액세스 토큰 필요)
   * @param req 인증된 요청 객체
   */
  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest) {
    const jwtPayload = req.jwtPayload;

    if (!jwtPayload) {
      throw new UnauthorizedException('JWT payload not found');
    }

    return {
      id: jwtPayload.sub,
      name: jwtPayload.name,
      email: jwtPayload.email,
      role: jwtPayload.role,
    };
  }

  @Post('logout')
  async logout(@Req() req: AuthenticatedRequest) {
    const jwtPayload = req.jwtPayload;
    await this.authService.logout(jwtPayload.sub, jwtPayload.sessionId);
    return { message: 'Logged out successfully' };
  }
}
