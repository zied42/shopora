import { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from './Layout';
import { Spinner } from './ui';

export function ProtectedRoute({ roles, children }: { roles: string[]; children?: ReactNode }) {
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
    const destination = user.role === 'admin' ? '/admin'
      : user.role === 'chef' ? '/chef'
      : user.role === 'support' ? '/support/desk'
      : user.role === 'stocking' ? '/stocking'
      : user.role === 'confirmateur' ? '/confirmateur'
      : user.role === 'fournisseur' || user.role === 'seller' ? '/fournisseur'
      : '/shop';
    return <Navigate to={destination} replace />;
  }

  return (
    <Layout>
      {children ?? <Outlet />}
    </Layout>
  );
}
