import { Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { MapsDriveSheetsMigrationService } from './maps-drive-sheets-migration.service';

@Controller('admin/migrations/maps-drive')
@Roles('ADMIN')
export class SheetsMigrationController {
  constructor(private readonly service: MapsDriveSheetsMigrationService) {}
  @Get('preview') preview() { return this.service.preview(); }
  @Post('run') run(@CurrentUser() user: AuthenticatedUser) { return this.service.run(user?.email || user?.uid || 'admin'); }
  @Get('status') status() { return this.service.status(); }
}
