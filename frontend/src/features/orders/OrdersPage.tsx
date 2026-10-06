import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorMessage } from '../../components/ErrorMessage';
import { Pagination } from '../../components/Pagination';
import { Spinner } from '../../components/Spinner';
import { formatDate, formatMoney } from '../../lib/money';
import { useOrders } from './hooks';
import { OrderStatusBadge } from './OrderStatusBadge';

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(0, Number(searchParams.get('page') ?? 0) || 0);
  const orders = useOrders(page);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My orders</h1>
      {orders.isPending ? (
        <Spinner label="Loading orders…" />
      ) : orders.isError ? (
        <ErrorMessage error={orders.error} onRetry={() => void orders.refetch()} />
      ) : orders.data.content.length === 0 ? (
        <EmptyState>You have not placed any orders yet.</EmptyState>
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Placed</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.data.content.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3">
                      <Link to={`/orders/${order.id}`} className="font-medium text-indigo-600 hover:underline">
                        #{order.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Pagination
            page={orders.data.page}
            totalPages={orders.data.totalPages}
            onPageChange={(next) => setSearchParams({ page: String(next) })}
          />
        </>
      )}
    </div>
  );
}
