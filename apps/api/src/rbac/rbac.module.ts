import { Global, Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionMiddleware } from './middleware/permission.middleware';
import { RbacController } from './rbac.controller';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { MinistryScopeService } from './ministry-scope.service';
import { MinistryScopeGuard } from './guards/ministry-scope.guard';
import { CellScopeService } from './cell-scope.service';
import { CellLeaderGuard } from './guards/cell-leader.guard';

@Global()
@Module({
  controllers: [RbacController, ProfilesController, PermissionsController],
  providers: [ProfilesService, PermissionsService, PermissionService, PermissionsGuard, PermissionMiddleware, MinistryScopeService, MinistryScopeGuard, CellScopeService, CellLeaderGuard],
  exports: [ProfilesService, PermissionsService, PermissionService, PermissionsGuard, PermissionMiddleware, MinistryScopeService, MinistryScopeGuard, CellScopeService, CellLeaderGuard],
})
export class RbacModule {}
