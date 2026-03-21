import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { UserSession } from '@/services/api/contracts';

interface AuthContextValue {
  user: UserSession | null;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AUTH_STORAGE_KEY = 'minha-agenda:user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const rawUser = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!rawUser) {
      return;
    }

    try {
      setUser(JSON.parse(rawUser) as UserSession);
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: async ({ email }) => {
        const nextUser: UserSession = {
          name: 'Olá, Marketing',
          role: 'Gestão Operacional',
          email,
        };

        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
      },
      logout: () => {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}