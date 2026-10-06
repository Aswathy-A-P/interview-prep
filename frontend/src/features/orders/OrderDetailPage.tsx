import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Spinner } from '../../components/Spinner';
import { formatDate, formatMoney } from '../../lib/money';
import { PaymentForm } from '../checkout/PaymentForm';
import { useCancelOrder, useOrder } from './hooks';
import { canCancel } from './orderStatus';
import { OrderStatusBadge } from './OrderStatusBadge';

export function OrderDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const order = useOrder(orderId);
  const cancel = useCancelOrder();

  if (order.isPending) {
    return <Spinner label="Loading order…" />;
  }
  if (order.isError) {
    return <ErrorMessage error={order.error} onRetry={() => void order.refetch()} />;
  }

  const data = order.data;
  return (
    <div className="space-y-6">
      <Link to="/orders" className="text-sm text-indigo-600 hover:underline">
        ← All orders
      </Link>
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CardTitle>Order #{data.id}</CardTitle>
            <OrderStatusBadge status={data.status} />
          </div>
          {canCancel(data.status) ? (
            <Button variant="danger" size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate(data.id)}>
              {cancel.isPending ? 'Cancelling…' : 'Cancel order'}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {cancel.isError ? <ErrorMessage error={cancel.error} /> : null}
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Placed</dt>
              <dd>{formatDate(data.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Payment reference</dt>
              <dd>{data.paymentReference ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Shipping address</dt>
              <dd className="whitespace-pre-line">{data.shippingAddress}</dd>
            </div>
          </dl>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Unit price</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((item) => (
                <tr key={item.productId}>
                  <td className="py-2">{item.productName}</td>
                  <td className="py-2 text-right">{formatMoney(item.unitPrice)}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{formatMoney(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-right text-lg font-semibold">Total: {formatMoney(data.total)}</p>
        </CardContent>
      </Card>
      {data.status === 'PENDING' ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Pay for this order</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentForm order={data} onPaid={() => undefined} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
