import { createContext } from 'react';
import type { LoginRequest, RegisterRequest, User } from '../../lib/api/types';

export interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (body: LoginRequest) => Promise<User>;
  register: (body: RegisterRequest) => Promise<User>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
