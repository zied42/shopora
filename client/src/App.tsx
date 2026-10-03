import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminSupport from './pages/admin/Support';
import AdminInventory from './pages/admin/Inventory';
import DsDashboard from './pages/dropshipper/Dashboard';
import DsCatalog from './pages/dropshipper/Catalog';
import ProductPage from './pages/dropshipper/ProductPage';
import DsCommandes from './pages/dropshipper/Commandes';
import DsSupport from './pages/dropshipper/Support';
import Profile from './pages/Profile';

function HomeRedirect() {
  const { user } = useAuth();
  const destination = user?.role === 'admin' ? '/admin' : user?.role === 'customer' ? '/dropshipper' : '/login';
  return <Navigate to={user ? destination : '/login'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route element={<ProtectedRoute roles={['admin', 'customer']} />}>
                <Route path="/profile" element={<Profile />} />
              </Route>

              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/inventory" element={<AdminInventory />} />
                <Route path="/admin/support" element={<AdminSupport />} />
              </Route>

              <Route element={<ProtectedRoute roles={['customer']} />}>
                <Route path="/shop" element={<Navigate to="/dropshipper/store" replace />} />
                <Route path="/dropshipper" element={<DsDashboard />} />
                <Route path="/dropshipper/store" element={<DsCatalog />} />
                <Route path="/dropshipper/store/:id" element={<ProductPage />} />
                <Route path="/dropshipper/commandes/*" element={<DsCommandes />} />
                <Route path="/dropshipper/support" element={<DsSupport />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
