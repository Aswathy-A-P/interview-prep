import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import type { OrderStatus, ProductQuery, ProductRequest } from '../../lib/api/types';
import { adminApi } from './adminApi';

export function useAdminProducts(query: ProductQuery) {
  return useQuery({
    queryKey: queryKeys.adminProducts(query),
    queryFn: () => adminApi.products(query),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminProductsAll });
    void queryClient.invalidateQueries({ queryKey: queryKeys.productsAll });
    void queryClient.invalidateQueries({ queryKey: ['product'] });
  };
}

export function useSaveProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, body }: { id: number | null; body: ProductRequest }) =>
      id === null ? adminApi.createProduct(body) : adminApi.updateProduct(id, body),
    onSuccess: invalidate,
  });
}

export function useDeactivateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (id: number) => adminApi.deactivateProduct(id),
    onSuccess: invalidate,
  });
}

export function useAdminOrders(status: OrderStatus | undefined, page: number) {
  return useQuery({
    queryKey: queryKeys.adminOrders(status, page),
    queryFn: () => adminApi.orders(status, page),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) => adminApi.updateOrderStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminOrdersAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll });
    },
  });
}
