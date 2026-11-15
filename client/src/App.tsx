import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminSupport from './pages/admin/Support';
import AdminInventory from './pages/admin/Inventory';
import DsCatalog from './pages/dropshipper/Catalog';
import ProductPage from './pages/dropshipper/ProductPage';
import DsCommandes from './pages/dropshipper/Commandes';
import DsSupport from './pages/dropshipper/Support';
import MyProducts from './pages/dropshipper/MyProducts';
import PaymentResult from './pages/PaymentResult';
import Profile from './pages/Profile';
import RolePortals from './RolePortals';

function HomeRedirect() {
  const { user } = useAuth();
  const destination = user?.role === 'admin' ? '/admin'
    : user?.role === 'chef' ? '/chef'
    : user?.role === 'support' ? '/support/desk'
    : user?.role === 'stocking' ? '/stocking'
    : user?.role === 'confirmateur' ? '/confirmateur'
    : user?.role === 'fournisseur' || user?.role === 'seller' ? '/fournisseur'
    : '/shop';
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
              <Route path="/staff-login" element={<Login staffOnly />} />
              <Route path="/register" element={<Register />} />

              <Route element={<ProtectedRoute roles={['admin', 'support', 'chef', 'stocking', 'confirmateur', 'dropshipper', 'fournisseur', 'customer', 'seller']} />}>
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

              <Route element={<ProtectedRoute roles={['customer', 'dropshipper']} />}>
                <Route path="/shop" element={<DsCatalog />} />
                <Route path="/shop/:id" element={<ProductPage />} />
                <Route path="/saved" element={<MyProducts />} />
                <Route path="/orders/*" element={<DsCommandes />} />
                <Route path="/support" element={<DsSupport />} />
                <Route path="/payment/result" element={<PaymentResult />} />
              </Route>
              <Route path="*" element={<RolePortals />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
