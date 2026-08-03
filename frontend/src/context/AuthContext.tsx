import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, type AuthUser } from '../services/api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'fines_token';
const USER_KEY = 'fines_user';
const EXPIRES_AT_KEY = 'fines_expires_at';
const SESSION_MS = 30 * 60 * 1000;

function readStoredSession(): {
  token: string | null;
  user: AuthUser | null;
  expiresAt: number | null;
} {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  const rawExp = localStorage.getItem(EXPIRES_AT_KEY);
  const expiresAt = rawExp ? Number(rawExp) : null;
  const user = rawUser ? (JSON.parse(rawUser) as AuthUser) : null;

  if (!token || !user || !expiresAt || Date.now() >= expiresAt) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    return { token: null, user: null, expiresAt: null };
  }
  return { token, user, expiresAt };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = readStoredSession();
  const [user, setUser] = useState<AuthUser | null>(initial.user);
  const [token, setToken] = useState<string | null>(initial.token);
  const [expiresAt, setExpiresAt] = useState<number | null>(initial.expiresAt);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setExpiresAt(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  // Al montar: si no hay sesión válida, arrancar en login (ready)
  useEffect(() => {
    setReady(true);
  }, []);

  // Persistencia
  useEffect(() => {
    if (token && user && expiresAt) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
    }
  }, [token, user, expiresAt]);

  // Expiración a los 30 min
  useEffect(() => {
    if (!token || !expiresAt) return;

    const tick = () => {
      if (Date.now() >= expiresAt) {
        clearSession();
      }
    };

    tick();
    const id = window.setInterval(tick, 15_000);
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [token, expiresAt, clearSession]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      const ttlMs = (res.expiresInSeconds ?? 30 * 60) * 1000;
      setToken(res.accessToken);
      setUser(res.user);
      setExpiresAt(Date.now() + Math.min(ttlMs, SESSION_MS));
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({ user, token, loading, ready, login, logout }),
    [user, token, loading, ready, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
