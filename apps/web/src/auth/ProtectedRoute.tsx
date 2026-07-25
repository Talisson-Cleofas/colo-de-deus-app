import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { AccessProfile } from '../types';
import { useAuth } from './AuthContext';

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: AccessProfile[];
}) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles?.length && !roles.includes(user.profile)) return <Navigate to="/sem-permissao" replace />;
  return children;
}
