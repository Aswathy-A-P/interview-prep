import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useAuth } from '../features/auth/useAuth';
import { useCart } from '../features/cart/hooks';
import { Button } from './ui/Button';

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'rounded-md px-3 py-2 text-sm font-medium',
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100',
  );
}

function CartLink() {
  const cart = useCart();
  const count = cart.data?.totalItems ?? 0;
  return (
    <NavLink to="/cart" className={navClass}>
      Cart
      {count > 0 ? (
        <span aria-label={`${count} items in cart`} className="ml-1 rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">
          {count}
        </span>
      ) : null}
    </NavLink>
  );
}

export function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <NavLink to="/" className="mr-4 text-lg font-bold text-indigo-700">
            ShopLite
          </NavLink>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            <NavLink to="/" end className={navClass}>
              Products
            </NavLink>
            {user ? (
              <>
                <CartLink />
                <NavLink to="/orders" className={navClass}>
                  Orders
                </NavLink>
              </>
            ) : null}
            {isAdmin ? (
              <>
                <NavLink to="/admin/products" className={navClass}>
                  Admin products
                </NavLink>
                <NavLink to="/admin/orders" className={navClass}>
                  Admin orders
                </NavLink>
              </>
            ) : null}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-slate-600">{user.fullName}</span>
                <Button variant="secondary" size="sm" onClick={() => void onLogout()}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClass}>
                  Log in
                </NavLink>
                <NavLink to="/register" className={navClass}>
                  Register
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
