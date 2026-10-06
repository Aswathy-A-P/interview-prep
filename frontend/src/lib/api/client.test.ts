import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, configureSession } from './client';

function jsonResponse(status: number, body: unknown, contentType = 'application/json'): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': contentType },
  });
}

describe('api client', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let accessToken: string | null = 'token-1';
  const refresh = vi.fn<() => Promise<string | null>>();
  const onAuthFailure = vi.fn();

  beforeEach(() => {
    accessToken = 'token-1';
    vi.stubGlobal('fetch', fetchMock);
    configureSession({ getAccessToken: () => accessToken, refresh, onAuthFailure });
  });

  afterEach(() => {
    fetchMock.mockReset();
    refresh.mockReset();
    onAuthFailure.mockReset();
    vi.unstubAllGlobals();
    configureSession(null);
  });

  function authHeader(callIndex: number): string | undefined {
    const init = fetchMock.mock.calls[callIndex][1];
    return (init?.headers as Record<string, string>).Authorization;
  }

  it('attaches the bearer token and builds the url with query params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await api.get<{ ok: boolean }>('/products', { q: 'phone', categoryId: undefined, page: 0 });

    expect(result).toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/products?q=phone&page=0');
    expect(authHeader(0)).toBe('Bearer token-1');
  });

  it('refreshes once on 401 and retries with the new token, deduplicating concurrent refreshes', async () => {
    fetchMock.mockImplementation(async (_url, init) => {
      const header = (init?.headers as Record<string, string>).Authorization;
      return header === 'Bearer token-2' ? jsonResponse(200, { ok: true }) : jsonResponse(401, { title: 'Unauthorized', status: 401 });
    });
    refresh.mockImplementation(async () => {
      accessToken = 'token-2';
      return 'token-2';
    });

    const [first, second] = await Promise.all([api.get('/cart'), api.get('/orders')]);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('logs out when the refresh fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { title: 'Unauthorized', status: 401 }));
    refresh.mockRejectedValueOnce(new Error('revoked'));

    await expect(api.get('/cart')).rejects.toMatchObject({ status: 401 });
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps a ProblemDetail body to ApiError with field errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        400,
        {
          type: 'about:blank',
          title: 'Bad Request',
          status: 400,
          detail: 'Validation failed',
          correlationId: 'abc',
          errors: [{ field: 'quantity', message: 'must be greater than 0' }],
        },
        'application/problem+json',
      ),
    );

    const error = await api.post('/cart/items', { productId: 1, quantity: 0 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(400);
    expect(apiError.title).toBe('Bad Request');
    expect(apiError.detail).toBe('Validation failed');
    expect(apiError.correlationId).toBe('abc');
    expect(apiError.fieldErrors).toEqual([{ field: 'quantity', message: 'must be greater than 0' }]);
  });

  it('sends the idempotency key header and returns undefined for 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await api.post('/orders', { shippingAddress: 'x' }, { 'Idempotency-Key': 'key-1' });

    expect(result).toBeUndefined();
    const init = fetchMock.mock.calls[0][1];
    expect((init?.headers as Record<string, string>)['Idempotency-Key']).toBe('key-1');
    expect(init?.body).toBe(JSON.stringify({ shippingAddress: 'x' }));
  });
});
