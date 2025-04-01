import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import { RefreshGuard } from './auth.refresh.guard';
import { SignUpDto } from './dto/signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @UseGuards(RefreshGuard)
  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }
    return await this.authService.refresh(refreshToken);
  }

  @Post('signup')
  async signup(@Body() signupDto: SignUpDto) {
    console.log('signupDto', signupDto);
    return await this.authService.signup(signupDto);
  }
}
