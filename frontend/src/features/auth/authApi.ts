import { apiRequest, api } from '../../lib/api/client';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../../lib/api/types';

export const authApi = {
  login: (body: LoginRequest) => apiRequest<AuthResponse>('/auth/login', { method: 'POST', body, auth: false }),
  register: (body: RegisterRequest) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body, auth: false }),
  logout: (refreshToken: string) =>
    apiRequest<void>('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),
  me: () => api.get<User>('/auth/me'),
};
