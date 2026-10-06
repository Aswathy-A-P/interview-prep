import type { OrderStatus, ProductQuery } from './api/types';

export const queryKeys = {
  categories: ['categories'] as const,
  productsAll: ['products'] as const,
  products: (query: ProductQuery) => ['products', query] as const,
  product: (id: number) => ['product', id] as const,
  cart: ['cart'] as const,
  ordersAll: ['orders'] as const,
  orders: (page: number) => ['orders', 'list', page] as const,
  order: (id: number) => ['orders', 'detail', id] as const,
  adminProductsAll: ['admin', 'products'] as const,
  adminProducts: (query: ProductQuery) => ['admin', 'products', query] as const,
  adminOrdersAll: ['admin', 'orders'] as const,
  adminOrders: (status: OrderStatus | undefined, page: number) => ['admin', 'orders', status ?? 'ALL', page] as const,
};
