import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import { UserSession } from '@/services/api/contracts';

const API_URL = import.meta.env.VITE_API_URL as string;

interface AuthContextValue {
  user: UserSession | null;
  isAuthenticated: boolean;
  initializing: boolean;
  token: string | null;
  tenantId: string | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toDisplayName(email: string, fullName?: string | null): string {
  if (fullName?.trim()) return fullName.trim();

  const localPart = (email.split('@')[0] ?? '').replace(/[._-]+/g, ' ').trim();
  if (!localPart) return 'Usuário';

  return localPart
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

async function fetchTenantId(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/v1/me/bootstrap`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { memberships: Array<{ tenant_id: string }> };
    return data.memberships[0]?.tenant_id ?? null;
  } catch {
    return null;
  }
}

async function createTenant(token: string, name: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/v1/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { tenant_id?: string; id?: string };
    return data.tenant_id ?? data.id ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const bootstrap = useCallback(async (accessToken: string, email: string) => {
    let tid = await fetchTenantId(accessToken);
    if (!tid) {
      const tenantName = email.split('@')[0] ?? 'Minha Empresa';
      tid = await createTenant(accessToken, tenantName);
    }
    setToken(accessToken);
    setTenantId(tid);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const email = session.user.email ?? '';
        const fullName = (session.user.user_metadata?.full_name ?? session.user.user_metadata?.name) as string | undefined;
        setUser({ name: toDisplayName(email, fullName), role: 'Gestão', email });
        bootstrap(session.access_token, email).finally(() => setInitializing(false));
      } else {
        setInitializing(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const email = session.user.email ?? '';
        const fullName = (session.user.user_metadata?.full_name ?? session.user.user_metadata?.name) as string | undefined;
        setUser({ name: toDisplayName(email, fullName), role: 'Gestão', email });
        bootstrap(session.access_token, email);
      } else {
        setUser(null);
        setToken(null);
        setTenantId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [bootstrap]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && tenantId),
      initializing,
      token,
      tenantId,
      login: async ({ email, password }) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
      },
      logout: async () => {
        await supabase.auth.signOut();
      },
    }),
    [user, token, tenantId, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}