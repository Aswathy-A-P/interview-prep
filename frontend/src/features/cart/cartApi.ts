import { api } from '../../lib/api/client';
import type { AddCartItemRequest, Cart } from '../../lib/api/types';

export const cartApi = {
  get: () => api.get<Cart>('/cart'),
  addItem: (body: AddCartItemRequest) => api.post<Cart>('/cart/items', body),
  updateItem: (productId: number, quantity: number) => api.put<Cart>(`/cart/items/${productId}`, { quantity }),
  removeItem: (productId: number) => api.delete<Cart>(`/cart/items/${productId}`),
  clear: () => api.delete<void>('/cart'),
};
