import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, tokenStore } from './api';
import type { Role, User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; role: Extract<Role, 'STUDENT' | 'OWNER'> }) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) return;
    api<{ user: User }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const finish = useCallback(
    (r: { token: string; user: User }) => {
      tokenStore.set(r.token);
      setUser(r.user);
      qc.invalidateQueries();
      return r.user;
    },
    [qc],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => finish(await api('/auth/login', { body: { email, password } })),
      register: async (input) => finish(await api('/auth/register', { body: input })),
      logout: () => {
        tokenStore.clear();
        setUser(null);
        qc.clear();
      },
    }),
    [user, loading, finish, qc],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
