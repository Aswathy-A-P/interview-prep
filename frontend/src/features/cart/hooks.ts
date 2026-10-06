import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import type { AddCartItemRequest, Cart } from '../../lib/api/types';
import { useAuth } from '../auth/useAuth';
import { cartApi } from './cartApi';

export function useCart() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.cart,
    queryFn: cartApi.get,
    enabled: isAuthenticated,
  });
}

function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart, cart);
    },
  });
}

export function useAddToCart() {
  return useCartMutation((body: AddCartItemRequest) => cartApi.addItem(body));
}

export function useUpdateCartItem() {
  return useCartMutation(({ productId, quantity }: { productId: number; quantity: number }) =>
    cartApi.updateItem(productId, quantity),
  );
}

export function useRemoveCartItem() {
  return useCartMutation((productId: number) => cartApi.removeItem(productId));
}
