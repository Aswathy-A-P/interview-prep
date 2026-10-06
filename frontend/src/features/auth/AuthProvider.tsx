import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { configureSession, refreshAccessToken, refreshTokens } from '../../lib/api/client';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../../lib/api/types';
import { AuthContext, type AuthContextValue } from './AuthContext';
import { authApi } from './authApi';
import { tokenStorage } from './tokenStorage';

interface SessionState {
  user: User | null;
  initializing: boolean;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>(() => ({
    user: null,
    initializing: tokenStorage.getRefreshToken() !== null,
  }));

  const applyAuth = useCallback((response: AuthResponse) => {
    tokenStorage.setTokens(response.accessToken, response.refreshToken);
    setState({ user: response.user, initializing: false });
  }, []);

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setState({ user: null, initializing: false });
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    configureSession({
      getAccessToken: tokenStorage.getAccessToken,
      refresh: async () => {
        const refreshToken = tokenStorage.getRefreshToken();
        if (!refreshToken) {
          return null;
        }
        const response = await refreshTokens(refreshToken);
        applyAuth(response);
        return response.accessToken;
      },
      onAuthFailure: clearSession,
    });
    return () => configureSession(null);
  }, [applyAuth, clearSession]);

  useEffect(() => {
    if (!tokenStorage.getRefreshToken()) {
      return;
    }
    void refreshAccessToken().then((token) => {
      if (!token) {
        clearSession();
      }
    });
  }, [clearSession]);

  const login = useCallback(
    async (body: LoginRequest) => {
      const response = await authApi.login(body);
      queryClient.clear();
      applyAuth(response);
      return response.user;
    },
    [applyAuth, queryClient],
  );

  const register = useCallback(
    async (body: RegisterRequest) => {
      const response = await authApi.register(body);
      queryClient.clear();
      applyAuth(response);
      return response.user;
    },
    [applyAuth, queryClient],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    clearSession();
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => undefined);
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      initializing: state.initializing,
      isAuthenticated: state.user !== null,
      isAdmin: state.user?.role === 'ADMIN',
      login,
      register,
      logout,
    }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
