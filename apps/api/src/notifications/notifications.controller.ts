import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { CreateNotificationDto, UpdateNotificationPreferencesDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { RequireMinistryModule } from '../rbac/decorators/ministry-module.decorator';
import { Permission } from '../rbac/enums/permission.enum';
@Controller('notifications')
export class NotificationsController {
 constructor(private readonly service:NotificationsService){}
 @Get() list(@CurrentUser() user:AuthenticatedUser){return this.service.state(user);}
 @Get('state') state(@CurrentUser() user:AuthenticatedUser){return this.service.state(user);}
 @Get('options') options(@CurrentUser() user:AuthenticatedUser){return this.service.options(user);}
 @Get('preferences') preferences(@CurrentUser() user:AuthenticatedUser){return this.service.preferences(user);}
 @Patch('preferences') updatePreferences(@Body() dto:UpdateNotificationPreferencesDto,@CurrentUser() user:AuthenticatedUser){return this.service.updatePreferences(dto,user);}
 @Get('deliveries') @Roles('ADMIN') deliveries(@CurrentUser() user:AuthenticatedUser){return this.service.deliveryHistory(user);}
 @Post('automations/process') @Roles('ADMIN') process(){return this.service.processAutomations();}
 @Post() @RequirePermissions(Permission.NOTIFICATIONS_CREATE) @RequireMinistryModule('COMUNICACAO') create(@Body() dto:CreateNotificationDto,@CurrentUser() user:AuthenticatedUser){return this.service.create(dto,user);}
 @Patch(':id/read') read(@Param('id') id:string,@Body() body:{read?:boolean},@CurrentUser() user:AuthenticatedUser){return this.service.markRead(id,user,body.read!==false);}
 @Post('read-all') all(@CurrentUser() user:AuthenticatedUser){return this.service.markAll(user);}
 @Delete(':id') remove(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){return this.service.remove(id,user);}
}
