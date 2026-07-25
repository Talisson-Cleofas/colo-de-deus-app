import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { Permission } from '../rbac/enums/permission.enum';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get()
  @RequirePermissions(Permission.DASHBOARD_READ)
  getDashboard() { return this.dashboard.getDashboard(); }
}
