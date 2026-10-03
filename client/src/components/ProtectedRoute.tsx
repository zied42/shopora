import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from './Layout';
import { Spinner } from './ui';

export function ProtectedRoute({ roles }: { roles: string[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    const destination = user.role === 'admin' ? '/admin' : user.role === 'customer' ? '/dropshipper' : '/login';
    return <Navigate to={destination} replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
