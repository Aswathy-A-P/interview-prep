import { api } from '../../lib/api/client';
import type { Category, Page, Product, ProductQuery } from '../../lib/api/types';

export const catalogApi = {
  categories: () => api.get<Category[]>('/categories'),
  products: (query: ProductQuery) => api.get<Page<Product>>('/products', { ...query }),
  product: (id: number) => api.get<Product>(`/products/${id}`),
};
