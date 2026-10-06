import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import type { Page, Product } from '../../lib/api/types';
import { catalogApi } from './catalogApi';
import { ProductListPage } from './ProductListPage';

vi.mock('./catalogApi', () => ({
  catalogApi: {
    categories: vi.fn(),
    products: vi.fn(),
    product: vi.fn(),
  },
}));

const category = { id: 1, name: 'Electronics', slug: 'electronics' };

function page(content: Product[]): Page<Product> {
  return { content, page: 0, size: 12, totalElements: content.length, totalPages: content.length ? 1 : 0 };
}

const products: Product[] = [
  { id: 10, name: 'Phone', description: 'A phone', price: 19999, stock: 5, imageUrl: null, active: true, category },
  { id: 11, name: 'Laptop', description: 'A laptop', price: 74999.5, stock: 0, imageUrl: null, active: true, category },
];

describe('ProductListPage', () => {
  beforeEach(() => {
    vi.mocked(catalogApi.categories).mockResolvedValue([category]);
    vi.mocked(catalogApi.products).mockReset();
  });

  it('renders products returned by the api', async () => {
    vi.mocked(catalogApi.products).mockResolvedValue(page(products));
    renderWithProviders(<ProductListPage />);

    expect(await screen.findByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText('₹19,999.00')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('shows the empty state when nothing matches', async () => {
    vi.mocked(catalogApi.products).mockResolvedValue(page([]));
    renderWithProviders(<ProductListPage />);

    expect(await screen.findByText('No products match your filters.')).toBeInTheDocument();
  });

  it('passes the search term from the filter form to the api', async () => {
    vi.mocked(catalogApi.products).mockResolvedValue(page(products));
    renderWithProviders(<ProductListPage />);
    await screen.findByText('Phone');

    await userEvent.type(screen.getByPlaceholderText('Search products'), 'lap');
    await userEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    await vi.waitFor(() =>
      expect(catalogApi.products).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'lap', page: 0 })),
    );
  });
});
