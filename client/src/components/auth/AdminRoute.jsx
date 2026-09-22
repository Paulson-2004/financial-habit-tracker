import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import Spinner from '../ui/Spinner.jsx';

/** Blocks non-admins. UX convenience only - /api/admin/* enforces the real rule server-side. */
export default function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
