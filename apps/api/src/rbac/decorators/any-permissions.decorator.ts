import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../enums/permission.enum';
export const ANY_PERMISSIONS_KEY = 'rbac:any-permissions';
export const RequireAnyPermission = (...permissions: Permission[]) => SetMetadata(ANY_PERMISSIONS_KEY, permissions);
