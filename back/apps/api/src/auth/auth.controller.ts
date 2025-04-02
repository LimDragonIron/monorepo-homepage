import { Body, Controller, Get, Post, Req, SetMetadata } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto, SignUpDto } from './dto';
import { TOKEN_TYPE_KEY } from './auth.guard';
import { AuthenticatedRequest } from 'libs/types';
import { Public } from 'libs/common/decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @Public()
  async signin(@Body() signinDto: SignInDto) {
    return this.authService.signin(signinDto);
  }

  @Post('refresh')
  @SetMetadata(TOKEN_TYPE_KEY, 'refresh')
  async refreshToken(@Req() req: AuthenticatedRequest) {
    return this.authService.refreshToken(req.refreshPayload);
  }

  @Post('signup')
  @Public()
  async signup(@Body() signupDto: SignUpDto) {
    return this.authService.signup(signupDto);
  }

  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.jwtPayload);
  }

  @Post('logout')
  async logout(@Req() req: AuthenticatedRequest) {
    return this.authService.logout(
      req.jwtPayload.sub,
      req.jwtPayload.sessionId,
    );
  }
}
