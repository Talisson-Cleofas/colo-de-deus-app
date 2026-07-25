import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../enums/permission.enum';
export const PERMISSIONS_KEY = 'rbac:permissions';
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
