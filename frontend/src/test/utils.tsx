import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../features/auth/AuthContext';
import type { User } from '../lib/api/types';

export const testUser: User = { id: 1, email: 'user@example.com', fullName: 'Test User', role: 'USER' };
export const testAdmin: User = { id: 2, email: 'admin@example.com', fullName: 'Admin User', role: 'ADMIN' };

export function makeAuth(user: User | null, overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user,
    initializing: false,
    isAuthenticated: user !== null,
    isAdmin: user?.role === 'ADMIN',
    login: vi.fn(async () => user ?? testUser),
    register: vi.fn(async () => user ?? testUser),
    logout: vi.fn(async () => undefined),
    ...overrides,
  };
}

interface RenderOptions {
  route?: string;
  path?: string;
  auth?: AuthContextValue;
}

export function renderWithProviders(ui: ReactElement, { route = '/', path = '/', auth = makeAuth(testUser) }: RenderOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={<div>navigated away</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient, auth };
}
