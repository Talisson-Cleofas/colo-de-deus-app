import type { ReactNode } from 'react';
import { usePermission, type MinistryModuleCode } from '../../rbac/PermissionContext';
import type { PermissionCode } from '../../rbac/permissions';

export function Can({ permission, anyOf, allOf, ministryModule, fallback = null, children }: {
  permission?: PermissionCode;
  anyOf?: PermissionCode[];
  allOf?: PermissionCode[];
  ministryModule?: MinistryModuleCode;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { hasPermission, hasAnyPermission, hasMinistryModule } = usePermission();
  const permissionAllowed = permission
    ? hasPermission(permission)
    : anyOf?.length
      ? hasAnyPermission(...anyOf)
      : allOf?.length
        ? hasPermission(...allOf)
        : true;
  const moduleAllowed = ministryModule ? hasMinistryModule(ministryModule) : true;
  return permissionAllowed && moduleAllowed ? <>{children}</> : <>{fallback}</>;
}
