import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { logger } from '@client/src/utils/logger';
import type { AuthResponse, UserInfo } from '@shared/api.interface';
import * as authApi from '@client/src/api/auth';
import {
  clearAuth,
  getUserInfo,
  isLoggedIn as checkLoggedIn,
  setToken,
  setUserInfo,
} from '@client/src/utils/auth';

interface AuthContextValue {
  user: UserInfo | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: { username: string; password: string }) => Promise<UserInfo>;
  register: (data: { username: string; password: string }) => Promise<UserInfo>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapAuthResponse(res: AuthResponse): UserInfo {
  return {
    userId: res.userId,
    username: res.username,
    role: res.role,
  };
}

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore user from localStorage on mount
  useEffect(() => {
    const stored = getUserInfo();
    const hasToken = checkLoggedIn();
    if (stored && hasToken) {
      setUser(stored);
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (data: { username: string; password: string }): Promise<UserInfo> => {
      const res = await authApi.login(data);
      const userInfo: UserInfo = mapAuthResponse(res);
      setToken(res.token);
      setUserInfo(userInfo);
      setUser(userInfo);
      return userInfo;
    },
    [],
  );

  const register = useCallback(
    async (data: {
      username: string;
      password: string;
    }): Promise<UserInfo> => {
      const res = await authApi.register(data);
      const userInfo: UserInfo = mapAuthResponse(res);
      setToken(res.token);
      setUserInfo(userInfo);
      setUser(userInfo);
      return userInfo;
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (err: unknown) {
      logger.error(`AuthContext logout error: ${JSON.stringify(err)}`);
      // Still clear local state even if server call fails
    }
    clearAuth();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const userInfo = await authApi.getCurrentUser();
      setUserInfo(userInfo);
      setUser(userInfo);
    } catch (err: unknown) {
      logger.error(`AuthContext refreshUser failed: ${JSON.stringify(err)}`);
      throw err;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      loading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading, login, register, logout, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
