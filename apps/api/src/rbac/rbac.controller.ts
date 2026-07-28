import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { PermissionService } from './permission.service';
import { PermissionsService, type MatrixInput } from './permissions.service';

@Controller('rbac')
export class RbacController {
  constructor(
    private readonly permissions: PermissionService,
    private readonly permissionCrud: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.permissions.forUser(user);
  }

  @Get('catalog')
  @Roles('MISSION_LEADER', 'ADMIN', 'DEVELOPER')
  catalog() {
    return this.permissions.catalog();
  }

  @Get('permissions')
  @Roles('MISSION_LEADER', 'ADMIN', 'DEVELOPER')
  permissionsCatalog() {
    return this.permissionCrud.list();
  }

  @Get('profiles/:profileCode/permissions')
  @Roles('MISSION_LEADER', 'ADMIN', 'DEVELOPER')
  async profilePermissions(@Param('profileCode') profileCode: string) {
    const normalized = profileCode.trim().toUpperCase();
    const [permissions, links] = await Promise.all([
      this.permissionCrud.list(),
      this.permissionCrud.matrix(),
    ]);
    const matrix = new Map(
      links
        .filter((item) => item.profileCode === normalized)
        .map((item) => [item.permissionCode, item]),
    );
    return permissions.map((permission) => ({
      ...permission,
      allowed: Boolean(matrix.get(permission.code)?.allowed),
      scope: matrix.get(permission.code)?.scope || 'OWN',
      linkActive: matrix.get(permission.code)?.active !== false,
    }));
  }

  @Put('profiles/:profileCode/permissions')
  @Roles('DEVELOPER')
  async saveProfilePermissions(
    @Param('profileCode') profileCode: string,
    @Body() body: { items?: Omit<MatrixInput, 'profileCode'>[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const items = (body.items || []).map((item) => ({ ...item, profileCode }));
    const result = await this.permissionCrud.saveMatrixBulk(items);
    await this.audit.record({
      action: 'PERMISSION',
      module: 'RBAC',
      entity: 'PROFILE_PERMISSION_MATRIX',
      recordId: profileCode,
      user,
      description: `Matriz de permissões salva para ${profileCode}.`,
      newData: items,
    });
    return result;
  }
}
