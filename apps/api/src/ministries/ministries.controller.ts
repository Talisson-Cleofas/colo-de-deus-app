import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { AddMinistryMemberDto, CreateMinistryDto, RegisterMinistryAttendanceDto, UpdateMinistryDto } from './ministry.dto';
import { MinistriesService } from './ministries.service';

@ApiTags('ministries')
@Controller('ministries')
export class MinistriesController {
  constructor(private readonly service: MinistriesService) {}

  @Get()
  list(@CurrentUser() user:AuthenticatedUser,@Query('includeInactive') includeInactive='false') { return this.service.list(user,includeInactive==='true'); }

  @Get(':id') @Roles('ADMIN','MINISTRY_LEADER')
  detail(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser) { return this.service.detail(id,user); }

  @Post() @Roles('ADMIN') @ApiOperation({summary:'Criar ministério (somente administrador)'})
  async create(@Body() dto:CreateMinistryDto) { return {ministry:await this.service.create(dto),message:'Ministério criado com sucesso.'}; }

  @Patch(':id') @Roles('ADMIN','MINISTRY_LEADER')
  async update(@Param('id') id:string,@Body() dto:UpdateMinistryDto,@CurrentUser() user:AuthenticatedUser) { return {ministry:await this.service.update(id,dto,user),message:'Ministério atualizado com sucesso.'}; }

  @Delete(':id') @Roles('ADMIN')
  async remove(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser) { await this.service.deactivate(id,user); return {message:'Ministério desativado com sucesso.'}; }

  @Get(':id/members') @Roles('ADMIN','MINISTRY_LEADER')
  members(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser) { return this.service.listMembers(id,user); }

  @Post(':id/members') @Roles('ADMIN','MINISTRY_LEADER')
  addMember(@Param('id') id:string,@Body() dto:AddMinistryMemberDto,@CurrentUser() user:AuthenticatedUser) { return this.service.addMember(id,dto,user); }

  @Delete(':id/members/:memberId') @Roles('ADMIN','MINISTRY_LEADER')
  async removeMember(@Param('id') id:string,@Param('memberId') memberId:string,@CurrentUser() user:AuthenticatedUser) { await this.service.removeMember(id,memberId,user); return {message:'Membro removido do ministério.'}; }

  @Get(':id/attendance') @Roles('ADMIN','MINISTRY_LEADER')
  attendance(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser) { return this.service.listAttendance(id,user); }

  @Post(':id/attendance') @Roles('ADMIN','MINISTRY_LEADER')
  registerAttendance(@Param('id') id:string,@Body() dto:RegisterMinistryAttendanceDto,@CurrentUser() user:AuthenticatedUser) { return this.service.registerAttendance(id,dto,user); }
}
