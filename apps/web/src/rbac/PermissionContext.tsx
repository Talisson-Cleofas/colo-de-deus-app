import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api, apiErrorMessage } from '../services/api';
import type { PermissionCode, PermissionScope } from './permissions';

export type MinistryModuleCode = 'CELULAS' | 'EVENTOS' | 'CENACULO' | 'FINANCAS' | 'COMUNICACAO';
type PermissionState = { profile: string; permissions: PermissionCode[]; scopes: Partial<Record<PermissionCode, PermissionScope>>; ministryModules?: MinistryModuleCode[] };
type PermissionContextValue = PermissionState & {
  loading: boolean;
  error: string;
  hasPermission: (...permissions: PermissionCode[]) => boolean;
  hasAnyPermission: (...permissions: PermissionCode[]) => boolean;
  hasMinistryModule: (module: MinistryModuleCode) => boolean;
  scopeFor: (permission: PermissionCode) => PermissionScope | undefined;
  refreshPermissions: () => Promise<void>;
};

const empty: PermissionState = { profile: 'MEMBER', permissions: [], scopes: {}, ministryModules: [] };
const Context = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const identity = user?.email || user?.uid || user?.id || 'anonymous';
  const query = useQuery({
    queryKey: ['rbac', 'me', identity],
    enabled: Boolean(user),
    queryFn: async () => (await api.get<PermissionState>('/rbac/me', { timeout: 30_000 })).data,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: (failureCount: number, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      return !status && failureCount < 3;
    },
    retryDelay: (attempt: number) => Math.min(4_000, 1_000 * 2 ** attempt),
    refetchOnWindowFocus: false,
  });

  const state = user ? (query.data ?? empty) : empty;
  const hasPermission = useCallback((...items: PermissionCode[]) => items.every((item) => state.permissions.includes(item)), [state.permissions]);
  const hasAnyPermission = useCallback((...items: PermissionCode[]) => items.some((item) => state.permissions.includes(item)), [state.permissions]);
  const hasMinistryModule = useCallback((module: MinistryModuleCode) => {
    if (['DEVELOPER', 'ADMIN', 'MISSION_LEADER'].includes(state.profile)) return true;
    if (state.profile !== 'MINISTRY_LEADER') return true;
    return Boolean(state.ministryModules?.includes(module));
  }, [state.profile, state.ministryModules]);
  const scopeFor = useCallback((permission: PermissionCode) => state.scopes[permission], [state.scopes]);
  const refreshPermissions = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['rbac', 'me', identity] });
  }, [identity, queryClient]);

  const value = useMemo(() => ({
    ...state,
    ministryModules: state.ministryModules ?? [],
    loading: Boolean(user) && query.isPending,
    error: query.error ? apiErrorMessage(query.error) : '',
    hasPermission,
    hasAnyPermission,
    hasMinistryModule,
    scopeFor,
    refreshPermissions,
  }), [state, user, query.isPending, query.error, hasPermission, hasAnyPermission, hasMinistryModule, scopeFor, refreshPermissions]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePermission() {
  const value = useContext(Context);
  if (!value) throw new Error('usePermission precisa ser usado dentro de PermissionProvider.');
  return value;
}
