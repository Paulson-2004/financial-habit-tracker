import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import BootstrapLoading from '../ui/BootstrapLoading.jsx';

/** Blocks non-admins. UX convenience only - /api/admin/* enforces the real rule server-side. */
export default function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <BootstrapLoading />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
