import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Spinner } from '../../components/Spinner';
import { formatMoney } from '../../lib/money';
import { toNumber } from '../../lib/forms';
import type { Product } from '../../lib/api/types';
import { useAuth } from '../auth/useAuth';
import { useAddToCart } from '../cart/hooks';
import { useProduct } from './hooks';

function AddToCartForm({ product }: { product: Product }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const addToCart = useAddToCart();
  const schema = z.object({
    quantity: z
      .number({ error: 'Enter a quantity' })
      .int('Whole numbers only')
      .min(1, 'At least 1')
      .max(product.stock, `Only ${product.stock} in stock`),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { quantity: 1 } });

  if (product.stock === 0) {
    return <Badge tone="danger">Out of stock</Badge>;
  }

  const onSubmit = handleSubmit(({ quantity }) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    addToCart.mutate({ productId: product.id, quantity });
  });

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-3">
      <Field label="Quantity" htmlFor="quantity" error={errors.quantity?.message}>
        <Input
          id="quantity"
          type="number"
          min={1}
          max={product.stock}
          className="w-28"
          {...register('quantity', { setValueAs: toNumber })}
        />
      </Field>
      {addToCart.isError ? <ErrorMessage error={addToCart.error} /> : null}
      {addToCart.isSuccess ? (
        <p role="status" className="text-sm text-green-700">
          Added to cart.{' '}
          <Link to="/cart" className="font-medium underline">
            View cart
          </Link>
        </p>
      ) : null}
      <Button type="submit" disabled={addToCart.isPending}>
        {addToCart.isPending ? 'Adding…' : 'Add to cart'}
      </Button>
    </form>
  );
}

export function ProductDetailPage() {
  const { id } = useParams();
  const productId = Number(id);
  const product = useProduct(productId);

  if (product.isPending) {
    return <Spinner label="Loading product…" />;
  }
  if (product.isError) {
    return <ErrorMessage error={product.error} onRetry={() => void product.refetch()} />;
  }

  const item = product.data;
  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm text-indigo-600 hover:underline">
        ← Back to products
      </Link>
      <Card className="grid gap-6 overflow-hidden md:grid-cols-2">
        <div className="aspect-square bg-slate-100">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">No image</div>
          )}
        </div>
        <CardContent className="space-y-4 py-6">
          <Badge>{item.category.name}</Badge>
          <h1 className="text-2xl font-bold text-slate-900">{item.name}</h1>
          <p className="text-2xl font-semibold text-slate-900">{formatMoney(item.price)}</p>
          <p className="whitespace-pre-line text-slate-600">{item.description}</p>
          <p className="text-sm text-slate-500">{item.stock > 0 ? `${item.stock} in stock` : 'Currently unavailable'}</p>
          <AddToCartForm product={item} />
        </CardContent>
      </Card>
    </div>
  );
}
