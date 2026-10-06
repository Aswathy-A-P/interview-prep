import { api } from '../../lib/api/client';
import type { CreateOrderRequest, Order, Page, PayOrderRequest } from '../../lib/api/types';

export const ordersApi = {
  create: (body: CreateOrderRequest, idempotencyKey: string) =>
    api.post<Order>('/orders', body, { 'Idempotency-Key': idempotencyKey }),
  pay: (id: number, body: PayOrderRequest) => api.post<Order>(`/orders/${id}/pay`, body),
  cancel: (id: number) => api.post<Order>(`/orders/${id}/cancel`),
  list: (page: number) => api.get<Page<Order>>('/orders', { page, size: 10 }),
  get: (id: number) => api.get<Order>(`/orders/${id}`),
};
