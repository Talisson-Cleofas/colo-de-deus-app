import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateMissionDto, UpdateMissionDto } from './mission.dto';
import { MissionsService } from './missions.service';
@Controller('missions')
export class MissionsController { constructor(private readonly service:MissionsService) {}
  @Get() list(){ return this.service.list(); }
  @Get(':id') get(@Param('id') id:string){ return this.service.get(id); }
  @Post() @Roles('ADMIN','DEVELOPER') create(@Body() dto:CreateMissionDto){ return this.service.create(dto); }
  @Patch(':id') @Roles('ADMIN','DEVELOPER') update(@Param('id') id:string,@Body() dto:UpdateMissionDto){ return this.service.update(id,dto); }
  @Post('seed/default') @Roles('ADMIN','DEVELOPER') seed(){ return this.service.ensureDefaultStructure(); }
}
