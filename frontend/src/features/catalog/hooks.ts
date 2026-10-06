import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import type { ProductQuery } from '../../lib/api/types';
import { catalogApi } from './catalogApi';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: catalogApi.categories,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProducts(query: ProductQuery) {
  return useQuery({
    queryKey: queryKeys.products(query),
    queryFn: () => catalogApi.products(query),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => catalogApi.product(id),
    enabled: Number.isFinite(id),
  });
}
