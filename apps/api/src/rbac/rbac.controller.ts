import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionService } from './permission.service';
@Controller('rbac')
export class RbacController {
  constructor(private readonly permissions: PermissionService) {}
  @Get('me') me(@CurrentUser() user: AuthenticatedUser) { return this.permissions.forUser(user); }
  @Get('catalog')
  @Roles('MISSION_LEADER','ADMIN','DEVELOPER')
  catalog() { return this.permissions.catalog(); }
}
