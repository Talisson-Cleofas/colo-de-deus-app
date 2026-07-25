import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PermissionLoadingScreen } from '../components/system/PermissionLoadingScreen';
import type { PermissionCode } from './permissions';
import { usePermission } from './usePermission';
import { useAuth } from '../auth/AuthContext';
import type { AccessProfile } from '../types';

type PermissionRouteProps = {
  children: ReactNode;
  permission?: PermissionCode;
  anyOf?: PermissionCode[];
  allOf?: PermissionCode[];
  deniedProfiles?: AccessProfile[];
};

export function PermissionRoute({ children, permission, anyOf, allOf, deniedProfiles }: PermissionRouteProps) {
  const location = useLocation();
  const { loading, error, hasPermission, hasAnyPermission, refreshPermissions } = usePermission();
  const { user } = useAuth();

  if (loading) return <PermissionLoadingScreen />;
  if (error) return <PermissionLoadingScreen error={error} onRetry={() => void refreshPermissions()} />;

  const deniedByProfile = Boolean(user && deniedProfiles?.includes(user.profile));
  const allowedByPermission = permission
    ? hasPermission(permission)
    : anyOf?.length
      ? hasAnyPermission(...anyOf)
      : allOf?.length
        ? hasPermission(...allOf)
        : true;

  const allowed = !deniedByProfile && allowedByPermission;

  return allowed
    ? <>{children}</>
    : <Navigate to="/sem-permissao" replace state={{ from: location.pathname }} />;
}
