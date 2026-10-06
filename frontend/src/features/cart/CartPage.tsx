import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { EmptyState, ErrorMessage } from '../../components/ErrorMessage';
import { Spinner } from '../../components/Spinner';
import { formatMoney } from '../../lib/money';
import { toNumber } from '../../lib/forms';
import type { CartItem } from '../../lib/api/types';
import { useCart, useRemoveCartItem, useUpdateCartItem } from './hooks';

const quantitySchema = z.object({
  quantity: z.number({ error: 'Enter a quantity' }).int('Whole numbers only').min(1, 'At least 1'),
});

type QuantityValues = z.infer<typeof quantitySchema>;

function CartLine({ item }: { item: CartItem }) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<QuantityValues>({ resolver: zodResolver(quantitySchema), values: { quantity: item.quantity } });

  const error = update.error ?? remove.error;

  return (
    <li className="flex flex-wrap items-center gap-4 py-4" data-testid={`cart-line-${item.productId}`}>
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-slate-100">
        {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-40 flex-1">
        <Link to={`/products/${item.productId}`} className="font-medium text-slate-900 hover:text-indigo-600">
          {item.name}
        </Link>
        <p className="text-sm text-slate-500">{formatMoney(item.unitPrice)} each</p>
        {errors.quantity ? (
          <p role="alert" className="text-xs text-red-600">
            {errors.quantity.message}
          </p>
        ) : null}
        {error ? <ErrorMessage error={error} /> : null}
      </div>
      <form
        noValidate
        className="flex items-center gap-2"
        onSubmit={handleSubmit(({ quantity }) => update.mutate({ productId: item.productId, quantity }))}
      >
        <label htmlFor={`qty-${item.productId}`} className="sr-only">
          Quantity for {item.name}
        </label>
        <Input
          id={`qty-${item.productId}`}
          type="number"
          min={1}
          className="w-20"
          {...register('quantity', { setValueAs: toNumber })}
        />
        <Button type="submit" variant="secondary" size="sm" disabled={!isDirty || update.isPending}>
          Update
        </Button>
      </form>
      <p className="w-28 text-right font-semibold text-slate-900">{formatMoney(item.lineTotal)}</p>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Remove ${item.name}`}
        disabled={remove.isPending}
        onClick={() => remove.mutate(item.productId)}
      >
        Remove
      </Button>
    </li>
  );
}

export function CartPage() {
  const cart = useCart();

  if (cart.isPending) {
    return <Spinner label="Loading cart…" />;
  }
  if (cart.isError) {
    return <ErrorMessage error={cart.error} onRetry={() => void cart.refetch()} />;
  }
  if (cart.data.items.length === 0) {
    return (
      <EmptyState>
        Your cart is empty.{' '}
        <Link to="/" className="text-indigo-600 hover:underline">
          Browse products
        </Link>
      </EmptyState>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your cart ({cart.data.totalItems} items)</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-slate-100">
          {cart.data.items.map((item) => (
            <CartLine key={item.productId} item={item} />
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-lg font-semibold text-slate-900">
            Total: <span data-testid="cart-total">{formatMoney(cart.data.total)}</span>
          </p>
          <Link
            to="/checkout"
            className="inline-flex h-10 items-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Proceed to checkout
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
