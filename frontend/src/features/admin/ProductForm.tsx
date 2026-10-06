import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { ErrorMessage } from '../../components/ErrorMessage';
import { applyServerFieldErrors, toNumber } from '../../lib/forms';
import type { Category, Product, ProductRequest } from '../../lib/api/types';
import { useSaveProduct } from './hooks';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'At most 200 characters'),
  description: z.string().max(2000, 'At most 2000 characters'),
  price: z
    .number({ error: 'Enter a price' })
    .positive('Price must be greater than 0')
    .refine((value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6, 'At most 2 decimal places'),
  stock: z.number({ error: 'Enter stock' }).int('Whole numbers only').min(0, 'Stock cannot be negative'),
  imageUrl: z.string().trim().max(500, 'At most 500 characters'),
  categoryId: z.number({ error: 'Choose a category' }).int().positive('Choose a category'),
  active: z.boolean(),
});

type ProductValues = z.infer<typeof productSchema>;

const FIELDS = ['name', 'description', 'price', 'stock', 'imageUrl', 'categoryId', 'active'] as const;

function toDefaults(product: Product | null): ProductValues {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price ?? Number.NaN,
    stock: product?.stock ?? 0,
    imageUrl: product?.imageUrl ?? '',
    categoryId: product?.category.id ?? Number.NaN,
    active: product?.active ?? true,
  };
}

function toRequest(values: ProductValues): ProductRequest {
  return {
    name: values.name,
    description: values.description || undefined,
    price: values.price,
    stock: values.stock,
    imageUrl: values.imageUrl || undefined,
    categoryId: values.categoryId,
    active: values.active,
  };
}

interface ProductFormProps {
  product: Product | null;
  categories: Category[];
  onDone: () => void;
}

export function ProductForm({ product, categories, onDone }: ProductFormProps) {
  const save = useSaveProduct();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProductValues>({ resolver: zodResolver(productSchema), defaultValues: toDefaults(product) });

  const onSubmit = handleSubmit((values) =>
    save.mutate(
      { id: product?.id ?? null, body: toRequest(values) },
      {
        onSuccess: onDone,
        onError: (error) => applyServerFieldErrors(error, setError, FIELDS),
      },
    ),
  );

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" {...register('name')} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Description" htmlFor="description" error={errors.description?.message}>
          <Textarea id="description" rows={3} {...register('description')} />
        </Field>
      </div>
      <Field label="Price (₹)" htmlFor="price" error={errors.price?.message}>
        <Input id="price" type="number" step="0.01" min="0" {...register('price', { setValueAs: toNumber })} />
      </Field>
      <Field label="Stock" htmlFor="stock" error={errors.stock?.message}>
        <Input id="stock" type="number" min="0" {...register('stock', { setValueAs: toNumber })} />
      </Field>
      <Field label="Category" htmlFor="categoryId" error={errors.categoryId?.message}>
        <Select id="categoryId" {...register('categoryId', { setValueAs: toNumber })}>
          <option value="">Choose…</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Image URL" htmlFor="imageUrl" error={errors.imageUrl?.message}>
        <Input id="imageUrl" {...register('imageUrl')} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" className="h-4 w-4" {...register('active')} />
        Active
      </label>
      {save.isError ? (
        <div className="sm:col-span-2">
          <ErrorMessage error={save.error} />
        </div>
      ) : null}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
