import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { SaveCenacleMissionDto, SaveCenacleMissionFeedbackDto } from './cenacle-missions.dto';
import { CenacleMissionsService } from './cenacle-missions.service';

@Controller('cenacle-missions')
export class CenacleMissionsController {
  constructor(private readonly service: CenacleMissionsService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }
  @Get('options') options(@CurrentUser() user: AuthenticatedUser) {
    return this.service.options(user);
  }
  @Post() create(@Body() dto: SaveCenacleMissionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: SaveCenacleMissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }
  @Post(':id/feedback') feedback(
    @Param('id') id: string,
    @Body() dto: SaveCenacleMissionFeedbackDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.feedback(id, dto, user);
  }
  @Get(':id/feedback') results(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.results(id, user);
  }
}
