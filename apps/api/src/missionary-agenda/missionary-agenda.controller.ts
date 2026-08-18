import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { Permission } from '../rbac/enums/permission.enum';
import {
  ApproveMissionaryAgendaDto,
  CreateMissionaryAgendaDto,
  RejectMissionaryAgendaDto,
  SendMissionaryAgendaDto,
  UpdateMissionaryAgendaDto,
} from './missionary-agenda.dto';
import { MissionaryAgendaService } from './missionary-agenda.service';

@ApiTags('Agenda Missionária')
@Controller('missionary-agenda')
export class MissionaryAgendaController {
  constructor(private readonly service: MissionaryAgendaService) {}

  @Get()
  @RequirePermissions(Permission.MISSIONARY_AGENDA_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('q') search?: string,
  ) {
    return this.service.list({ status, type, search }, user);
  }

  @Get('options')
  @RequirePermissions(Permission.MISSIONARY_AGENDA_READ)
  options(@CurrentUser() user: AuthenticatedUser) {
    return this.service.options(user);
  }

  @Get(':id')
  @RequirePermissions(Permission.MISSIONARY_AGENDA_READ)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @Post()
  @RequirePermissions(Permission.MISSIONARY_AGENDA_CREATE)
  create(@Body() dto: CreateMissionaryAgendaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions(Permission.MISSIONARY_AGENDA_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMissionaryAgendaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/submit')
  @RequirePermissions(Permission.MISSIONARY_AGENDA_UPDATE)
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.submit(id, user);
  }

  @Post(':id/approve')
  @RequirePermissions(Permission.MISSIONARY_AGENDA_UPDATE)
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveMissionaryAgendaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.approve(id, dto, user);
  }

  @Post(':id/reject')
  @RequirePermissions(Permission.MISSIONARY_AGENDA_UPDATE)
  reject(
    @Param('id') id: string,
    @Body() dto: RejectMissionaryAgendaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.reject(id, dto, user);
  }

  @Post(':id/send')
  @RequirePermissions(Permission.MISSIONARY_AGENDA_UPDATE)
  send(
    @Param('id') id: string,
    @Body() dto: SendMissionaryAgendaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.sendToMembers(id, dto, user);
  }

  @Get(':id/history')
  @RequirePermissions(Permission.MISSIONARY_AGENDA_READ)
  history(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.history(id, user);
  }
}
