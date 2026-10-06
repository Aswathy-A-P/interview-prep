import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeAuth, renderWithProviders, testAdmin } from '../../test/utils';
import type { AdminOrder, OrderStatus } from '../../lib/api/types';
import { nextStatuses } from '../orders/orderStatus';
import { adminApi } from './adminApi';
import { AdminOrdersPage } from './AdminOrdersPage';

vi.mock('./adminApi', () => ({
  adminApi: {
    products: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deactivateProduct: vi.fn(),
    orders: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
}));

function order(id: number, status: OrderStatus): AdminOrder {
  return {
    id,
    status,
    total: 100,
    shippingAddress: '1 Main Street',
    paymentReference: null,
    createdAt: '2026-10-01T10:00:00Z',
    items: [],
    customerEmail: `c${id}@example.com`,
  };
}

describe('order status transitions', () => {
  it('only allows the documented lifecycle', () => {
    expect(nextStatuses('PENDING')).toEqual(['PAID', 'CANCELLED']);
    expect(nextStatuses('PAID')).toEqual(['SHIPPED', 'CANCELLED']);
    expect(nextStatuses('SHIPPED')).toEqual(['DELIVERED']);
    expect(nextStatuses('DELIVERED')).toEqual([]);
    expect(nextStatuses('CANCELLED')).toEqual([]);
  });
});

describe('AdminOrdersPage', () => {
  beforeEach(() => {
    vi.mocked(adminApi.orders).mockReset();
    vi.mocked(adminApi.updateOrderStatus).mockReset();
  });

  it('offers only the allowed next-status actions per order', async () => {
    vi.mocked(adminApi.orders).mockResolvedValue({
      content: [order(1, 'PENDING'), order(2, 'SHIPPED'), order(3, 'DELIVERED')],
      page: 0,
      size: 20,
      totalElements: 3,
      totalPages: 1,
    });
    renderWithProviders(<AdminOrdersPage />, { auth: makeAuth(testAdmin) });

    const pending = within(await screen.findByTestId('admin-order-1'));
    expect(pending.getByRole('button', { name: 'Mark paid' })).toBeInTheDocument();
    expect(pending.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(pending.queryByRole('button', { name: 'Mark shipped' })).not.toBeInTheDocument();

    const shipped = within(screen.getByTestId('admin-order-2'));
    expect(shipped.getAllByRole('button').map((b) => b.textContent)).toEqual(['Mark delivered']);

    const delivered = within(screen.getByTestId('admin-order-3'));
    expect(delivered.queryAllByRole('button')).toHaveLength(0);
  });

  it('sends the chosen transition to the api', async () => {
    vi.mocked(adminApi.orders).mockResolvedValue({
      content: [order(1, 'PENDING')],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(adminApi.updateOrderStatus).mockResolvedValue(order(1, 'PAID'));
    renderWithProviders(<AdminOrdersPage />, { auth: makeAuth(testAdmin) });

    await userEvent.click(await screen.findByRole('button', { name: 'Mark paid' }));

    expect(adminApi.updateOrderStatus).toHaveBeenCalledWith(1, 'PAID');
  });
});
