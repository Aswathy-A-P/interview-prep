import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import type { Cart } from '../../lib/api/types';
import { cartApi } from './cartApi';
import { CartPage } from './CartPage';

vi.mock('./cartApi', () => ({
  cartApi: {
    get: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

const cart: Cart = {
  items: [
    { productId: 10, name: 'Phone', imageUrl: null, unitPrice: 100, quantity: 2, lineTotal: 200 },
    { productId: 11, name: 'Case', imageUrl: null, unitPrice: 50.5, quantity: 1, lineTotal: 50.5 },
  ],
  totalItems: 3,
  total: 250.5,
};

describe('CartPage', () => {
  beforeEach(() => {
    vi.mocked(cartApi.get).mockReset();
    vi.mocked(cartApi.removeItem).mockReset();
  });

  it('renders cart lines and the server total', async () => {
    vi.mocked(cartApi.get).mockResolvedValue(cart);
    renderWithProviders(<CartPage />);

    expect(await screen.findByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Case')).toBeInTheDocument();
    expect(screen.getByTestId('cart-total')).toHaveTextContent('₹250.50');
    expect(within(screen.getByTestId('cart-line-10')).getByText('₹200.00')).toBeInTheDocument();
  });

  it('removes an item through the api and shows the updated cart', async () => {
    vi.mocked(cartApi.get).mockResolvedValue(cart);
    vi.mocked(cartApi.removeItem).mockResolvedValue({
      items: [cart.items[1]],
      totalItems: 1,
      total: 50.5,
    });
    renderWithProviders(<CartPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Phone' }));

    expect(cartApi.removeItem).toHaveBeenCalledWith(10);
    await vi.waitFor(() => expect(screen.queryByText('Phone')).not.toBeInTheDocument());
    expect(screen.getByTestId('cart-total')).toHaveTextContent('₹50.50');
  });

  it('shows the empty state', async () => {
    vi.mocked(cartApi.get).mockResolvedValue({ items: [], totalItems: 0, total: 0 });
    renderWithProviders(<CartPage />);

    expect(await screen.findByText(/Your cart is empty/)).toBeInTheDocument();
  });
});
