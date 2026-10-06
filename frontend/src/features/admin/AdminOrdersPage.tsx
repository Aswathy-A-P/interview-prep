import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { EmptyState, ErrorMessage } from '../../components/ErrorMessage';
import { Pagination } from '../../components/Pagination';
import { Spinner } from '../../components/Spinner';
import { formatDate, formatMoney } from '../../lib/money';
import { ORDER_STATUSES, type AdminOrder, type OrderStatus } from '../../lib/api/types';
import { nextStatuses } from '../orders/orderStatus';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { useAdminOrders, useUpdateOrderStatus } from './hooks';

const ACTION_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Mark pending',
  PAID: 'Mark paid',
  SHIPPED: 'Mark shipped',
  DELIVERED: 'Mark delivered',
  CANCELLED: 'Cancel',
};

function parseStatus(value: string | null): OrderStatus | undefined {
  return ORDER_STATUSES.find((status) => status === value);
}

function OrderActions({ order }: { order: AdminOrder }) {
  const update = useUpdateOrderStatus();
  const options = nextStatuses(order.status);
  if (options.length === 0) {
    return <span className="text-xs text-slate-400">No actions</span>;
  }
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {options.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === 'CANCELLED' ? 'danger' : 'secondary'}
          disabled={update.isPending}
          onClick={() => update.mutate({ id: order.id, status })}
        >
          {ACTION_LABELS[status]}
        </Button>
      ))}
      {update.isError ? (
        <div className="w-full">
          <ErrorMessage error={update.error} />
        </div>
      ) : null}
    </div>
  );
}

export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = parseStatus(searchParams.get('status'));
  const page = Math.max(0, Number(searchParams.get('page') ?? 0) || 0);
  const orders = useAdminOrders(status, page);

  const changeStatus = (value: string) => {
    setSearchParams(value ? { status: value } : {});
  };

  const changePage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(next));
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Manage orders</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="statusFilter" className="text-sm text-slate-600">
            Status
          </label>
          <Select id="statusFilter" className="w-40" value={status ?? ''} onChange={(e) => changeStatus(e.target.value)}>
            <option value="">All</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {orders.isPending ? (
        <Spinner label="Loading orders…" />
      ) : orders.isError ? (
        <ErrorMessage error={orders.error} onRetry={() => void orders.refetch()} />
      ) : orders.data.content.length === 0 ? (
        <EmptyState>No orders found.</EmptyState>
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Placed</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.data.content.map((order) => (
                  <tr key={order.id} data-testid={`admin-order-${order.id}`}>
                    <td className="px-4 py-3 font-medium">#{order.id}</td>
                    <td className="px-4 py-3">{order.customerEmail}</td>
                    <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-right">{formatMoney(order.total)}</td>
                    <td className="px-4 py-3">
                      <OrderActions order={order} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Pagination page={orders.data.page} totalPages={orders.data.totalPages} onPageChange={changePage} />
        </>
      )}
    </div>
  );
}
