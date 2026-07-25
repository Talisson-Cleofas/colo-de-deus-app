import { Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { AuditService } from './audit.service';
@ApiTags('Auditoria')
@Controller('audit')
@Roles('DEVELOPER','MISSION_LEADER','ADMIN')
export class AuditController{
 constructor(private readonly audit:AuditService){}
 @Get() list(@Query('action') action?:string,@Query('module') module?:string,@Query('user') user?:string,@Query('startDate') startDate?:string,@Query('endDate') endDate?:string,@Query('q') q?:string){return this.audit.list({action,module,user,startDate,endDate,q});}
 @Post('logout') logout(@CurrentUser() user:AuthenticatedUser,@Req() req:any){return this.audit.record({action:'LOGOUT',module:'AUTH',entity:'session',user,description:'Logout realizado',ip:req.ip,userAgent:req.headers?.['user-agent']});}
}
