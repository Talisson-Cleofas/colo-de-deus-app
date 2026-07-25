import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { BirthdaysService } from './birthdays.service';
import { SendBirthdayMessageDto } from './send-birthday-message.dto';

@Controller('birthdays')
export class BirthdaysController {
  constructor(private readonly service: BirthdaysService) {}

  @Get()
  list(@Query('month') month?: string, @Query('search') search?: string, @Query('ministryId') ministryId?: string, @Query('cellId') cellId?: string, @Query('cenacleId') cenacleId?: string) {
    return this.service.list({ month, search, ministryId, cellId, cenacleId });
  }

  @Get('dashboard')
  dashboard() { return this.service.dashboard(); }

  @Get('history')
  history(@CurrentUser() user: AuthenticatedUser) { return this.service.history(user); }

  @Post(':id/message')
  sendMessage(@Param('id') id: string, @Body() dto: SendBirthdayMessageDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.sendMessage(id, dto, user);
  }
}
