import { Controller, Get, Post } from '@nestjs/common';
import { GoogleSheetsService } from '../google/google-sheets.service';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { Permission } from '../rbac/enums/permission.enum';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin')
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService, private readonly sheets: GoogleSheetsService) {}

  @Get('dashboard')
  @RequirePermissions(Permission.SETTINGS_READ)
  getDashboard() { return this.dashboard.getDashboard(); }

  @Get('sheets/schema')
  @RequirePermissions(Permission.SETTINGS_READ)
  schemaStatus() { return this.sheets.schemaStatus(); }

  @Post('sheets/initialize')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async initializeSheets() {
    await this.sheets.ensureAllTabs();
    return { message: 'Abas ausentes criadas e cabeçalhos adicionados nas abas vazias.', status: await this.sheets.schemaStatus() };
  }
}
