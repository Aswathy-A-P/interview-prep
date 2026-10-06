import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { ErrorMessage } from '../../components/ErrorMessage';
import { formatMoney } from '../../lib/money';
import type { Order } from '../../lib/api/types';
import { usePayOrder } from '../orders/hooks';

const paymentSchema = z.object({
  cardNumber: z
    .string()
    .transform((value) => value.replace(/\s+/g, ''))
    .pipe(z.string().regex(/^\d{12,19}$/, 'Enter a 12 to 19 digit card number')),
});

type PaymentInput = z.input<typeof paymentSchema>;
type PaymentOutput = z.output<typeof paymentSchema>;

interface PaymentFormProps {
  order: Order;
  onPaid: (order: Order) => void;
}

export function PaymentForm({ order, onPaid }: PaymentFormProps) {
  const pay = usePayOrder();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentInput, unknown, PaymentOutput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { cardNumber: '' },
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(({ cardNumber }) => pay.mutate({ id: order.id, cardNumber }, { onSuccess: onPaid }))}
    >
      <p className="text-sm text-slate-600">
        Order #{order.id} total <span className="font-semibold text-slate-900">{formatMoney(order.total)}</span>
      </p>
      <Field
        label="Card number"
        htmlFor="cardNumber"
        error={errors.cardNumber?.message}
        hint="Test mode: any card number works, except one ending in 0000 which is declined."
      >
        <Input id="cardNumber" inputMode="numeric" autoComplete="cc-number" {...register('cardNumber')} />
      </Field>
      {pay.isError ? <ErrorMessage error={pay.error} /> : null}
      <Button type="submit" disabled={pay.isPending}>
        {pay.isPending ? 'Processing…' : `Pay ${formatMoney(order.total)}`}
      </Button>
    </form>
  );
}
