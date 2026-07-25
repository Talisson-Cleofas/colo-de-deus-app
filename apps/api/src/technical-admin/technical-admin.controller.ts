import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { TechnicalAdminService } from './technical-admin.service';
import type { IntegrationKey, PermissionRecord } from './technical-admin.types';

@Controller('technical-admin')
@Roles('ADMIN')
export class TechnicalAdminController {
  constructor(private readonly service: TechnicalAdminService) {}
  @Get('integrations') integrations() { return this.service.statuses(); }
  @Post('integrations/:key/test') test(@Param('key') key: IntegrationKey, @CurrentUser() user: AuthenticatedUser) { return this.service.test(key,user); }
  @Get('schema') schema() { return this.service.schema(); }
  @Post('synchronize') synchronize(@CurrentUser() user: AuthenticatedUser) { return this.service.synchronize(user); }
  @Get('settings') settings() { return this.service.technicalSettings(); }
  @Patch('settings/notifications') notificationSettings(@Body() body: Record<string,unknown>, @CurrentUser() user: AuthenticatedUser) { return this.service.updateNotificationSettings(body,user); }
  @Get('permissions') permissions() { return this.service.permissions(); }
  @Post('permissions') permission(@Body() body: Partial<PermissionRecord>, @CurrentUser() user: AuthenticatedUser) { return this.service.savePermission(body,user); }
  @Delete('permissions/:id') remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.deletePermission(id,user); }
  @Get('history') history(@Query('limit') limit?: string) { return this.service.history(Number(limit || 100)); }
}
