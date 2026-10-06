import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { EmptyState, ErrorMessage } from '../../components/ErrorMessage';
import { Pagination } from '../../components/Pagination';
import { Spinner } from '../../components/Spinner';
import { formatMoney } from '../../lib/money';
import type { Product } from '../../lib/api/types';
import { useCategories } from '../catalog/hooks';
import { useAdminProducts, useDeactivateProduct } from './hooks';
import { ProductForm } from './ProductForm';

type Editing = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; product: Product };

export function AdminProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(0, Number(searchParams.get('page') ?? 0) || 0);
  const products = useAdminProducts({ page, size: 20, sort: 'createdAt,desc' });
  const categories = useCategories();
  const deactivate = useDeactivateProduct();
  const [editing, setEditing] = useState<Editing>({ mode: 'closed' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Manage products</h1>
        {editing.mode === 'closed' ? <Button onClick={() => setEditing({ mode: 'create' })}>New product</Button> : null}
      </div>

      {editing.mode !== 'closed' ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing.mode === 'create' ? 'New product' : `Edit ${editing.product.name}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductForm
              key={editing.mode === 'edit' ? editing.product.id : 'new'}
              product={editing.mode === 'edit' ? editing.product : null}
              categories={categories.data ?? []}
              onDone={() => setEditing({ mode: 'closed' })}
            />
          </CardContent>
        </Card>
      ) : null}

      {deactivate.isError ? <ErrorMessage error={deactivate.error} /> : null}

      {products.isPending ? (
        <Spinner label="Loading products…" />
      ) : products.isError ? (
        <ErrorMessage error={products.error} onRetry={() => void products.refetch()} />
      ) : products.data.content.length === 0 ? (
        <EmptyState>No products yet.</EmptyState>
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.data.content.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3">{product.category.name}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(product.price)}</td>
                    <td className="px-4 py-3 text-right">{product.stock}</td>
                    <td className="px-4 py-3">
                      {product.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}
                    </td>
                    <td className="space-x-2 px-4 py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setEditing({ mode: 'edit', product })}>
                        Edit
                      </Button>
                      {product.active ? (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={deactivate.isPending}
                          onClick={() => deactivate.mutate(product.id)}
                        >
                          Deactivate
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Pagination
            page={products.data.page}
            totalPages={products.data.totalPages}
            onPageChange={(next) => setSearchParams({ page: String(next) })}
          />
        </>
      )}
    </div>
  );
}
