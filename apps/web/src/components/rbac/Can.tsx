import type { ReactNode } from 'react';
import { usePermission } from '../../rbac/usePermission';
import type { PermissionCode } from '../../rbac/permissions';
export function Can({permission,anyOf,allOf,fallback=null,children}:{permission?:PermissionCode;anyOf?:PermissionCode[];allOf?:PermissionCode[];fallback?:ReactNode;children:ReactNode}){
 const {hasPermission,hasAnyPermission}=usePermission();
 const allowed=permission?hasPermission(permission):anyOf?.length?hasAnyPermission(...anyOf):allOf?.length?hasPermission(...allOf):true;
 return allowed?<>{children}</>:<>{fallback}</>;
}
