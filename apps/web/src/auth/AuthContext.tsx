import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, apiErrorMessage } from '../services/api';
import { googleSignIn, googleSignOut, observeAuthState } from '../services/firebase';
import type { AccessProfile, AuthUser } from '../types';

type AuthContextValue = {
  user: AuthUser | null;
  initializing: boolean;
  loading: boolean;
  error: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  hasRole: (...roles: AccessProfile[]) => boolean;
};

const STORAGE_KEY = 'colo:user';
const AuthContext = createContext<AuthContextValue | null>(null);

function readSnapshot(): AuthUser | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as AuthUser | null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readSnapshot);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const saveUser = useCallback((next: AuthUser | null) => {
    setUser(next);
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data } = await api.get<{ user: AuthUser }>('/auth/me');
      saveUser(data.user);
      setError('');
      return true;
    } catch (requestError) {
      saveUser(null);
      setError(apiErrorMessage(requestError));
      return false;
    }
  }, [saveUser]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    observeAuthState(async (_ready, hasFirebaseUser) => {
      if (!mounted) return;
      const demo = import.meta.env.VITE_DEMO_MODE === 'true';
      const hasSnapshot = Boolean(readSnapshot());
      if (hasFirebaseUser || (demo && hasSnapshot)) await refreshSession();
      else saveUser(null);
      if (mounted) setInitializing(false);
    })
      .then((stop) => {
        unsubscribe = stop;
      })
      .catch((authError) => {
        if (mounted) {
          setError(apiErrorMessage(authError));
          setInitializing(false);
        }
      });

    const sessionExpired = () => {
      saveUser(null);
      setError('Sua sessão expirou. Entre novamente com sua conta Google.');
    };
    window.addEventListener('colo:session-expired', sessionExpired);

    return () => {
      mounted = false;
      unsubscribe?.();
      window.removeEventListener('colo:session-expired', sessionExpired);
    };
  }, [refreshSession, saveUser]);

  const login = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const credential = await googleSignIn();
      const idToken = await credential.user.getIdToken();
      const { data } = await api.post<{ user: AuthUser }>('/auth/google', { idToken });
      saveUser(data.user);
    } catch (loginError) {
      setError(apiErrorMessage(loginError));
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  }, [saveUser]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      try { await api.post('/audit/logout'); } catch { /* logout local continua mesmo se auditoria falhar */ }
      await googleSignOut();
    } finally {
      saveUser(null);
      setLoading(false);
    }
  }, [saveUser]);

  const hasRole = useCallback(
    (...roles: AccessProfile[]) => Boolean(user && roles.includes(user.profile)),
    [user],
  );

  const value = useMemo(
    () => ({ user, initializing, loading, error, login, logout, refreshSession, hasRole }),
    [user, initializing, loading, error, login, logout, refreshSession, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth precisa ser usado dentro de AuthProvider.');
  return value;
}
