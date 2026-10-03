import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost, apiErrorMessage, updateMe, AuthUser } from '../lib/api';

interface ImpersonatorSession {
  token: string | null;
  user: AuthUser | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  impersonate: (token: string, user: AuthUser) => void;
  exitImpersonation: () => AuthUser | null;
  impersonator: AuthUser | null;
  updateProfile: (patch: { name?: string; photo?: string | null }) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('d42_user') ?? 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [impersonator, setImpersonator] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('d42_impersonator');
      if (!raw) return null;
      const entity = JSON.parse(raw) as ImpersonatorSession;
      return entity?.user ?? null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const token = localStorage.getItem('d42_token');
    if (!token) {
      setLoading(false);
      return;
    }
    apiGet<AuthUser>('/auth/me')
      .then((u) => {
        setUser(u);
        localStorage.setItem('d42_user', JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem('d42_token');
        localStorage.removeItem('d42_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiPost<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    localStorage.setItem('d42_token', data.token);
    localStorage.setItem('d42_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await apiPost<{ token: string; user: AuthUser }>('/auth/register', { name, email, password });
    localStorage.setItem('d42_token', data.token);
    localStorage.setItem('d42_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('d42_token');
    localStorage.removeItem('d42_user');
    localStorage.removeItem('d42_impersonator');
    setImpersonator(null);
    setUser(null);
  };

  const impersonate = (token: string, user: AuthUser) => {
    try {
      const existing = localStorage.getItem('d42_impersonator');
      if (!existing) {
        const origToken = localStorage.getItem('d42_token');
        const origUserRaw = localStorage.getItem('d42_user');
        let origUser: AuthUser | null = null;
        if (origUserRaw) {
          origUser = JSON.parse(origUserRaw);
        }
        const entity: ImpersonatorSession = { token: origToken, user: origUser };
        localStorage.setItem('d42_impersonator', JSON.stringify(entity));
        setImpersonator(origUser);
      }
    } catch {
      /* ignore */
    }
    localStorage.setItem('d42_token', token);
    localStorage.setItem('d42_user', JSON.stringify(user));
    setUser(user);
  };

  const exitImpersonation = (): AuthUser | null => {
    const raw = localStorage.getItem('d42_impersonator');
    localStorage.removeItem('d42_impersonator');
    setImpersonator(null);
    if (raw) {
      try {
        const entity = JSON.parse(raw) as ImpersonatorSession;
        if (entity && entity.token) {
          localStorage.setItem('d42_token', entity.token);
          if (entity.user) {
            localStorage.setItem('d42_user', JSON.stringify(entity.user));
            setUser(entity.user);
            return entity.user;
          }
        }
      } catch {
        /* fall through */
      }
    }
    localStorage.removeItem('d42_token');
    localStorage.removeItem('d42_user');
    setUser(null);
    return null;
  };

  const updateProfile = async (patch: { name?: string; photo?: string | null }) => {
    const updated = await updateMe(patch);
    localStorage.setItem('d42_user', JSON.stringify(updated));
    setUser(updated);
    return updated;
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout, impersonate, exitImpersonation, impersonator, updateProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useApiError() {
  return (err: unknown) => {
    const msg = apiErrorMessage(err);
    alert(msg);
    return msg;
  };
}
