import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '../../components/Spinner';
import { EmptyState } from '../../components/ErrorMessage';
import { useAuth } from './useAuth';

export function RequireAuth() {
  const { user, initializing } = useAuth();
  const location = useLocation();
  if (initializing) {
    return <Spinner label="Restoring session…" />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, initializing } = useAuth();
  const location = useLocation();
  if (initializing) {
    return <Spinner label="Restoring session…" />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (user.role !== 'ADMIN') {
    return <EmptyState>You do not have access to this page.</EmptyState>;
  }
  return <Outlet />;
}
