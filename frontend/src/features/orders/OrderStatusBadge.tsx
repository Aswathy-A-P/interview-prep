import { Badge } from '../../components/ui/Badge';
import type { OrderStatus } from '../../lib/api/types';
import { STATUS_TONE } from './orderStatus';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
}
