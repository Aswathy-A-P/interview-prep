import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import type { Order } from '../../lib/api/types';
import { ordersApi } from './ordersApi';

export function useOrders(page: number) {
  return useQuery({
    queryKey: queryKeys.orders(page),
    queryFn: () => ordersApi.list(page),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => ordersApi.get(id),
    enabled: Number.isFinite(id),
  });
}

function useOrderUpdate() {
  const queryClient = useQueryClient();
  return (order: Order) => {
    queryClient.setQueryData(queryKeys.order(order.id), order);
    void queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll });
    void queryClient.invalidateQueries({ queryKey: queryKeys.productsAll });
  };
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const onOrder = useOrderUpdate();
  return useMutation({
    mutationFn: ({ shippingAddress, idempotencyKey }: { shippingAddress: string; idempotencyKey: string }) =>
      ordersApi.create({ shippingAddress }, idempotencyKey),
    onSuccess: (order) => {
      onOrder(order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    },
  });
}

export function usePayOrder() {
  const onOrder = useOrderUpdate();
  return useMutation({
    mutationFn: ({ id, cardNumber }: { id: number; cardNumber: string }) => ordersApi.pay(id, { cardNumber }),
    onSuccess: onOrder,
  });
}

export function useCancelOrder() {
  const onOrder = useOrderUpdate();
  return useMutation({
    mutationFn: (id: number) => ordersApi.cancel(id),
    onSuccess: onOrder,
  });
}
