import type { AuthResponse, FieldError, ProblemDetail } from './types';

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail: string | undefined;
  readonly fieldErrors: FieldError[];
  readonly correlationId: string | undefined;

  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.title = problem.title ?? 'Error';
    this.detail = problem.detail;
    this.fieldErrors = problem.errors ?? [];
    this.correlationId = problem.correlationId;
  }
}

export interface SessionHandlers {
  getAccessToken: () => string | null;
  refresh: () => Promise<string | null>;
  onAuthFailure: () => void;
}

const defaultHandlers: SessionHandlers = {
  getAccessToken: () => null,
  refresh: async () => null,
  onAuthFailure: () => undefined,
};

let handlers: SessionHandlers = defaultHandlers;

let refreshInFlight: Promise<string | null> | null = null;

export function configureSession(next: SessionHandlers | null): void {
  handlers = next ?? defaultHandlers;
}

export function refreshAccessToken(): Promise<string | null> {
  return refreshOnce();
}

function refreshOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = handlers
      .refresh()
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  auth?: boolean;
}

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
  }
  const qs = params.toString();
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ''}`;
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetail = { status: response.status, title: response.statusText || 'Error' };
  try {
    const text = await response.text();
    if (text) {
      problem = { ...problem, ...(JSON.parse(text) as ProblemDetail) };
    }
  } catch {
    problem = { status: response.status, title: response.statusText || 'Error' };
  }
  return new ApiError(response.status, problem);
}

function send(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth !== false;
  let response = await send(path, options, useAuth ? handlers.getAccessToken() : null);

  if (response.status === 401 && useAuth) {
    const newToken = await refreshOnce();
    if (!newToken) {
      handlers.onAuthFailure();
      throw await toApiError(response);
    }
    response = await send(path, options, newToken);
    if (response.status === 401) {
      handlers.onAuthFailure();
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, query?: Record<string, QueryValue>) => apiRequest<T>(path, { query }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    apiRequest<T>(path, { method: 'POST', body, headers }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

export function refreshTokens(refreshToken: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    auth: false,
  });
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.detail ?? error.title;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong';
}
