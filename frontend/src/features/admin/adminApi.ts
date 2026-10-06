import { api } from '../../lib/api/client';
import type { AdminOrder, OrderStatus, Page, Product, ProductQuery, ProductRequest } from '../../lib/api/types';

export const adminApi = {
  products: (query: ProductQuery) => api.get<Page<Product>>('/admin/products', { ...query }),
  createProduct: (body: ProductRequest) => api.post<Product>('/admin/products', body),
  updateProduct: (id: number, body: ProductRequest) => api.put<Product>(`/admin/products/${id}`, body),
  deactivateProduct: (id: number) => api.delete<void>(`/admin/products/${id}`),
  orders: (status: OrderStatus | undefined, page: number) =>
    api.get<Page<AdminOrder>>('/admin/orders', { status, page, size: 20 }),
  updateOrderStatus: (id: number, status: OrderStatus) => api.patch<AdminOrder>(`/admin/orders/${id}/status`, { status }),
};
