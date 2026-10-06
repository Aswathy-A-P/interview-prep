import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import type { Category, ProductQuery } from '../../lib/api/types';
import { SORT_OPTIONS } from './productQuery';

const priceField = z
  .string()
  .trim()
  .refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0), 'Enter a valid price');

const filterSchema = z
  .object({
    q: z.string().trim().max(100, 'Search is too long'),
    categoryId: z.string(),
    minPrice: priceField,
    maxPrice: priceField,
    sort: z.string(),
  })
  .refine(
    (values) => values.minPrice === '' || values.maxPrice === '' || Number(values.minPrice) <= Number(values.maxPrice),
    { message: 'Max price must be at least the min price', path: ['maxPrice'] },
  );

export type FilterValues = z.infer<typeof filterSchema>;

interface ProductFiltersProps {
  query: ProductQuery;
  categories: Category[];
  onApply: (values: FilterValues) => void;
  onReset: () => void;
}

export function ProductFilters({ query, categories, onApply, onReset }: ProductFiltersProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      q: query.q ?? '',
      categoryId: query.categoryId !== undefined ? String(query.categoryId) : '',
      minPrice: query.minPrice !== undefined ? String(query.minPrice) : '',
      maxPrice: query.maxPrice !== undefined ? String(query.maxPrice) : '',
      sort: query.sort ?? SORT_OPTIONS[0].value,
    },
  });

  return (
    <form
      role="search"
      noValidate
      onSubmit={handleSubmit(onApply)}
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
    >
      <div className="lg:col-span-2">
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <Input id="q" placeholder="Search products" {...register('q')} />
        {errors.q ? <p role="alert" className="text-xs text-red-600">{errors.q.message}</p> : null}
      </div>
      <div>
        <label htmlFor="categoryId" className="sr-only">
          Category
        </label>
        <Select id="categoryId" {...register('categoryId')}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="minPrice" className="sr-only">
          Min price
        </label>
        <Input id="minPrice" inputMode="decimal" placeholder="Min ₹" {...register('minPrice')} />
        {errors.minPrice ? <p role="alert" className="text-xs text-red-600">{errors.minPrice.message}</p> : null}
      </div>
      <div>
        <label htmlFor="maxPrice" className="sr-only">
          Max price
        </label>
        <Input id="maxPrice" inputMode="decimal" placeholder="Max ₹" {...register('maxPrice')} />
        {errors.maxPrice ? <p role="alert" className="text-xs text-red-600">{errors.maxPrice.message}</p> : null}
      </div>
      <div>
        <label htmlFor="sort" className="sr-only">
          Sort
        </label>
        <Select id="sort" {...register('sort')}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-6 lg:justify-end">
        <Button type="button" variant="ghost" onClick={onReset}>
          Reset
        </Button>
        <Button type="submit">Apply filters</Button>
      </div>
    </form>
  );
}
