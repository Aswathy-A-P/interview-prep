import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Textarea } from '../../components/ui/Input';
import { EmptyState, ErrorMessage } from '../../components/ErrorMessage';
import { Spinner } from '../../components/Spinner';
import { formatMoney } from '../../lib/money';
import { applyServerFieldErrors } from '../../lib/forms';
import type { Order } from '../../lib/api/types';
import { useCart } from '../cart/hooks';
import { useCreateOrder } from '../orders/hooks';
import { PaymentForm } from './PaymentForm';

const addressSchema = z.object({
  shippingAddress: z
    .string()
    .trim()
    .min(1, 'Shipping address is required')
    .max(500, 'Address must be at most 500 characters'),
});

type AddressValues = z.infer<typeof addressSchema>;

function AddressStep({ onCreated }: { onCreated: (order: Order) => void }) {
  const cart = useCart();
  const createOrder = useCreateOrder();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AddressValues>({ resolver: zodResolver(addressSchema), defaultValues: { shippingAddress: '' } });

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

  const onSubmit = handleSubmit(({ shippingAddress }) =>
    createOrder.mutate(
      { shippingAddress, idempotencyKey },
      {
        onSuccess: onCreated,
        onError: (error) => applyServerFieldErrors(error, setError, ['shippingAddress']),
      },
    ),
  );

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle>1. Shipping address</CardTitle>
        </CardHeader>
        <CardContent>
          <form noValidate className="space-y-4" onSubmit={onSubmit}>
            <Field label="Shipping address" htmlFor="shippingAddress" error={errors.shippingAddress?.message}>
              <Textarea id="shippingAddress" rows={4} {...register('shippingAddress')} />
            </Field>
            {createOrder.isError ? <ErrorMessage error={createOrder.error} /> : null}
            <Button type="submit" disabled={createOrder.isPending}>
              {createOrder.isPending ? 'Placing order…' : 'Place order'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="space-y-1">
            {cart.data.items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-2">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
            <span>Total</span>
            <span>{formatMoney(cart.data.total)}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
      {order === null ? (
        <AddressStep onCreated={setOrder} />
      ) : (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>2. Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PaymentForm order={order} onPaid={(paid) => navigate(`/orders/${paid.id}`, { replace: true })} />
            <Link to={`/orders/${order.id}`} className="block text-sm text-indigo-600 hover:underline">
              Pay later — view order
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
