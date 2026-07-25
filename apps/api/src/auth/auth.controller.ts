import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './auth.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import type { AuthenticatedUser } from './types/auth-user.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('google')
  login(@Body() dto: GoogleLoginDto) {
    return this.auth.login(dto.idToken);
  }

  @Get('me')
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }
}
