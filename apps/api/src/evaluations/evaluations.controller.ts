import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { AnswerEvaluationDto, CreateEvaluationDto } from './evaluations.dto';
import { EvaluationsService } from './evaluations.service';

@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly service: EvaluationsService) {}
  @Get('mine') @Header('Cache-Control', 'no-store') mine(@CurrentUser() user: AuthenticatedUser) { return this.service.mine(user); }
  @Post(':id/answers') answer(@Param('id') id: string, @Body() dto: AnswerEvaluationDto, @CurrentUser() user: AuthenticatedUser) { return this.service.answer(id, dto, user); }
  @Get() @Roles('MISSION_LEADER', 'DEVELOPER') @Header('Cache-Control', 'no-store') list(@CurrentUser() user: AuthenticatedUser) { return this.service.list(user); }
  @Post() @Roles('MISSION_LEADER', 'DEVELOPER') create(@Body() dto: CreateEvaluationDto, @CurrentUser() user: AuthenticatedUser) { return this.service.create(dto, user); }
  @Post(':id/open') @Roles('MISSION_LEADER', 'DEVELOPER') open(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.open(id, user); }
  @Post(':id/close') @Roles('MISSION_LEADER', 'DEVELOPER') close(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.close(id, user); }
  @Get(':id/results') @Roles('MISSION_LEADER', 'DEVELOPER') @Header('Cache-Control', 'no-store') results(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.results(id, user); }
}
