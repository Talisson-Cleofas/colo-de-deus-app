import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { MemberDashboardService } from './member-dashboard.service';

@Controller('dashboard')
export class MemberDashboardController {
  constructor(private readonly service: MemberDashboardService) {}

  @Get()
  aggregated(@CurrentUser() user: AuthenticatedUser) { return this.service.member(user); }

  @Get('member')
  member(@CurrentUser() user: AuthenticatedUser) {
    return this.service.member(user);
  }
}
