import type { ProductQuery } from '../../lib/api/types';

export const PAGE_SIZE = 12;

export const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest' },
  { value: 'price,asc', label: 'Price: low to high' },
  { value: 'price,desc', label: 'Price: high to low' },
  { value: 'name,asc', label: 'Name: A to Z' },
] as const;

function optionalNumber(value: string | null): number | undefined {
  if (value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseProductQuery(params: URLSearchParams): ProductQuery {
  return {
    q: params.get('q') ?? undefined,
    categoryId: optionalNumber(params.get('categoryId')),
    minPrice: optionalNumber(params.get('minPrice')),
    maxPrice: optionalNumber(params.get('maxPrice')),
    sort: params.get('sort') ?? undefined,
    page: optionalNumber(params.get('page')) ?? 0,
    size: PAGE_SIZE,
  };
}

export function toSearchParams(values: Record<string, string | number | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  return params;
}
