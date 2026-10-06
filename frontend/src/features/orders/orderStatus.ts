import type { OrderStatus } from '../../lib/api/types';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return TRANSITIONS[status];
}

export function canCancel(status: OrderStatus): boolean {
  return TRANSITIONS[status].includes('CANCELLED');
}

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  PENDING: 'warning',
  PAID: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};
