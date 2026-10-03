import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import BootstrapLoading from '../ui/BootstrapLoading.jsx';

/** Blocks unauthenticated users. This is a UX convenience only - the API enforces the real rule. */
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <BootstrapLoading />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
