import type { Permission } from '../enums/permission.enum';
import type { PermissionScope } from '../enums/permission-scope.enum';
import type { ProfileCode } from '../enums/profile.enum';

export interface RbacProfile { id?: string; code: ProfileCode | string; name: string; description: string; level: number; active: boolean; createdAt?: string; updatedAt?: string; }
export interface RbacPermission { code: Permission; resource: string; action: string; description: string; active: boolean; }
export interface ProfilePermission { profileCode: ProfileCode; permissionCode: Permission; allowed: boolean; scope: PermissionScope; }
export interface UserPermissions { profile: ProfileCode; permissions: Permission[]; scopes: Partial<Record<Permission, PermissionScope>>; ministryModules?: string[]; }
