import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { AddCommunityParticipantDto, CreateCommunityDto, UpdateCommunityDto } from './create-community.dto';
import { CommunitiesService } from './communities.service';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { RequireAnyPermission } from '../rbac/decorators/any-permissions.decorator';
import { RequireMinistryModule } from '../rbac/decorators/ministry-module.decorator';
import { Permission } from '../rbac/enums/permission.enum';
@ApiTags('communities')
@Controller('communities')
export class CommunitiesController {
 constructor(private readonly service:CommunitiesService){}
 @Get('trash') trash(@Query('type') type:'CELL'|'CENACLE'='CELL',@CurrentUser() user:AuthenticatedUser){return this.service.trash(type,user);}
 @Get() list(@Query('type') type:'CELL'|'CENACLE'='CELL',@Query('status') status:'UPCOMING'|'FINISHED'|'CANCELLED'|'ALL'='UPCOMING',@Query('periodStart') periodStart='',@Query('periodEnd') periodEnd='',@CurrentUser() user:AuthenticatedUser){return this.service.list(type,user,status,periodStart,periodEnd);}
 @Post() @Roles('ADMIN','MISSION_LEADER','DEVELOPER','MINISTRY_LEADER') @RequireAnyPermission(Permission.CELLS_CREATE,Permission.CENACLES_CREATE) @RequireMinistryModule('CELULAS','CENACULO') create(@Body() dto:CreateCommunityDto,@CurrentUser() user:AuthenticatedUser){return this.service.create(dto,user);}
 @Get(':id') detail(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){return this.service.detail(id,user);}
 @Delete(':id') @RequireAnyPermission(Permission.CELLS_DELETE,Permission.CENACLES_DELETE) @RequireMinistryModule('CELULAS','CENACULO') removeCommunity(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){return this.service.remove(id,user);}
 @Post(':id/restore') @RequireAnyPermission(Permission.CELLS_UPDATE,Permission.CENACLES_UPDATE) @RequireMinistryModule('CELULAS','CENACULO') restore(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){return this.service.restore(id,user);}
 @Patch(':id') @RequireAnyPermission(Permission.CELLS_UPDATE,Permission.CENACLES_UPDATE) @RequireMinistryModule('CELULAS','CENACULO') update(@Param('id') id:string,@Body() dto:UpdateCommunityDto,@CurrentUser() user:AuthenticatedUser){return this.service.update(id,dto,user);}
 @Post(':id/participants') add(@Param('id') id:string,@Body() dto:AddCommunityParticipantDto,@CurrentUser() user:AuthenticatedUser){return this.service.addParticipant(id,dto,user);}
 @Delete(':id/participants/:memberId') remove(@Param('id') id:string,@Param('memberId') memberId:string,@CurrentUser() user:AuthenticatedUser){return this.service.removeParticipant(id,memberId,user);}
 @Post(':id/duplicate') duplicate(@Param('id') id:string,@Body() body:{startDate:string;time:string;endDate:string;endTime:string},@CurrentUser() user:AuthenticatedUser){return this.service.duplicateCenacle(id,body,user);}
 @Post(':id/close') close(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){return this.service.closeCenacle(id,user);}
 @Post(':id/reopen') reopen(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){return this.service.reopenCenacle(id,user);}
 @Post(':id/cancel') cancel(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){return this.service.cancelCenacle(id,user);}
 @Post(':id/attendance') @RequirePermissions(Permission.ATTENDANCE_CREATE) @RequireMinistryModule('CELULAS','CENACULO') attendance(@Param('id') id:string,@Body() body:{date:string;records:{participantId:string;participantName:string;present:boolean;notes:string}[]},@CurrentUser() user:AuthenticatedUser){return this.service.attendance(id,body.date,body.records,user);}
}
