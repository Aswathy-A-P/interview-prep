import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorMessage } from '../../components/ErrorMessage';
import { Pagination } from '../../components/Pagination';
import { Spinner } from '../../components/Spinner';
import { formatMoney } from '../../lib/money';
import type { Product } from '../../lib/api/types';
import { useCategories, useProducts } from './hooks';
import { ProductFilters, type FilterValues } from './ProductFilters';
import { parseProductQuery, toSearchParams } from './productQuery';

function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <Link to={`/products/${product.id}`} className="block aspect-[4/3] bg-slate-100">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
        )}
      </Link>
      <CardContent className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Badge>{product.category.name}</Badge>
          {product.stock === 0 ? <Badge tone="danger">Out of stock</Badge> : null}
        </div>
        <Link to={`/products/${product.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
          {product.name}
        </Link>
        <p className="mt-auto text-lg font-semibold text-slate-900">{formatMoney(product.price)}</p>
      </CardContent>
    </Card>
  );
}

export function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseProductQuery(searchParams);
  const categories = useCategories();
  const products = useProducts(query);

  const applyFilters = (values: FilterValues) => {
    setSearchParams(toSearchParams({ ...values, page: undefined }));
  };

  const changePage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Products</h1>
      <ProductFilters
        key={searchParams.toString()}
        query={query}
        categories={categories.data ?? []}
        onApply={applyFilters}
        onReset={() => setSearchParams(new URLSearchParams())}
      />
      {products.isPending ? (
        <Spinner label="Loading products…" />
      ) : products.isError ? (
        <ErrorMessage error={products.error} onRetry={() => void products.refetch()} />
      ) : products.data.content.length === 0 ? (
        <EmptyState>No products match your filters.</EmptyState>
      ) : (
        <>
          <p className="text-sm text-slate-500">{products.data.totalElements} products</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.data.content.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination page={products.data.page} totalPages={products.data.totalPages} onPageChange={changePage} />
        </>
      )}
    </div>
  );
}
