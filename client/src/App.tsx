import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StaffLogin from './pages/StaffLogin';
import SceneSplash from './pages/SceneSplash';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminSupport from './pages/admin/Support';
import AdminInventory from './pages/admin/Inventory';
import AdminIntegration from './pages/admin/Integration';
import AdminStaffDashboard from './pages/admin/StaffDashboard';
import DsDashboard from './pages/dropshipper/Dashboard';
import DsCatalog from './pages/dropshipper/Catalog';
import ProductPage from './pages/dropshipper/ProductPage';
import DsProducts from './pages/dropshipper/MyProducts';
import DsCommandes from './pages/dropshipper/Commandes';
import DsTrending from './pages/dropshipper/Trending';
import DsSupport from './pages/dropshipper/Support';
import DsApps from './pages/dropshipper/Apps';
import DsApiKeys from './pages/dropshipper/ApiKeys';
import DsApiDocs from './pages/dropshipper/ApiDocs';
import DsPayments from './pages/dropshipper/Payments';
import FourDashboard from './pages/fournisseur/Dashboard';
import FourProducts from './pages/fournisseur/Products';
import FourProductPreview from './pages/fournisseur/ProductPreview';
import FourAddProduct from './pages/fournisseur/AddProduct';
import FourTrending from './pages/fournisseur/Trending';
import FourOrders from './pages/fournisseur/Orders';
import FourSupport from './pages/fournisseur/Support';
import FourOrderBatches from './pages/fournisseur/OrderBatches';
import FourManifests from './pages/fournisseur/Manifests';
import { WholesaleOrders, Reservations, StockingWholesaleOrders } from './pages/fournisseur/WholesaleOrders';
import FourStockInventory from './pages/fournisseur/StockInventory';
import FourStorageRequests from './pages/fournisseur/StorageRequests';
import FourStorageRequestDetail from './pages/fournisseur/StorageRequestDetail';
import FourStockShipments from './pages/fournisseur/StockShipments';
import FourCreateStockShipment from './pages/fournisseur/CreateStockShipment';
import FourWarehouses from './pages/fournisseur/Warehouses';
import FourAddNewWarehouse from './pages/fournisseur/AddNewWarehouse';
import FourPackaging from './pages/fournisseur/Packaging';
import FourSubscriptions from './pages/fournisseur/Subscriptions';
import FourPriceUpdates from './pages/fournisseur/PriceUpdates';
import FulfillmentOrders from './pages/fournisseur/FulfillmentOrders';
import FulfillmentAddProduct from './pages/fournisseur/FulfillmentAddProduct';
import ChefFulfillment from './pages/chef/Fulfillment';
import ChefInventory from './pages/chef/Inventory';
import ChefCommandes from './pages/chef/Commandes';
import ChefPlaceholder from './pages/chef/Placeholder';
import ChefTickets from './pages/chef/Tickets';
import ChefTicketDetail from './pages/chef/TicketDetail';
import ChefShipments from './pages/chef/Shipments';
import ChefShipmentDetail from './pages/chef/ShipmentDetail';
import ChefReturns from './pages/chef/Returns';
import ChefReturnDetail from './pages/chef/ReturnDetail';
import ChefPickupRequests from './pages/chef/PickupRequests';
import ChefManifests from './pages/chef/Manifests';
import ChefManifestDetail from './pages/chef/ManifestDetail';
import ChefTransactions from './pages/chef/Transactions';
import ChefReconciliationReviews from './pages/chef/ReconciliationReviews';
import ChefSellerOrganizations from './pages/chef/SellerOrganizations';
import ChefSellerOrganizationDetail from './pages/chef/SellerOrganizationDetail';
import ChefSupplierOrganizations from './pages/chef/SupplierOrganizations';
import ChefSupplierOrganizationDetail from './pages/chef/SupplierOrganizationDetail';
import ChefSubscriptions from './pages/chef/Subscriptions';
import ChefProducts from './pages/chef/Products';
import ChefCollections from './pages/chef/Collections';
import CollectionEditor from './pages/chef/CollectionEditor';
import ChefProductPreview from './pages/chef/ProductPreview';
import ChefBinsInventory from './pages/chef/BinsInventory';
import ChefLeadsList from './pages/chef/Leads';
import ChefWarehouses from './pages/chef/Warehouses';import ChefLeadCreate from './pages/chef/LeadCreate';
import ChefLeadImport from './pages/chef/LeadImport';
import ChefPackingBinCreate from './pages/chef/PackingBinCreate';
import ChefPackingBinEdit from './pages/chef/PackingBinEdit';
import ChefFindProducts from './pages/chef/FindProducts';
import ChefOverview from './pages/chef/Overview';
import ChefPerformanceDashboard from './pages/chef/PerformanceDashboard';
import ChefProductsDashboard from './pages/chef/ProductsDashboard';
import ChefSupplierIncubation from './pages/chef/SupplierIncubationDashboard';
import ChefSellerIncubation from './pages/chef/SellerIncubationDashboard';
import ChefChatThreads from './pages/chef/ChatThreads';
import PublicInventory from './pages/PublicInventory';
import BatchScan from './pages/BatchScan';
import Profile from './pages/Profile';
import SupportTickets from './pages/support/Tickets';
import SupportTicketDetail from './pages/support/TicketDetail';
import SupportInbox from './pages/support/Inbox';
import SupportFindProducts from './pages/support/FindProducts';
import SupportProductPreview from './pages/support/ProductPreview';
import SupportSellerOrganizations from './pages/support/SellerOrganizations';
import SupportSellerOrganizationDetail from './pages/support/SellerOrganizationDetail';
import SupportSupplierOrganizations from './pages/support/SupplierOrganizations';
import SupportSupplierOrganizationDetail from './pages/support/SupplierOrganizationDetail';
import SupportServices from './pages/support/Services';
import SupportServicesDetail from './pages/support/ServicesDetail';
import SupportCommandes from './pages/support/Commandes';
import StockingPlaceholder from './pages/stocking/Placeholder';
import StockingDashboard from './pages/stocking/Dashboard';
import StockRefillRequests from './pages/stocking/StockRefillRequests';
import CreateStockRefillRequest from './pages/stocking/CreateStockRefillRequest';
import StockRefillRequestDetail from './pages/stocking/StockRefillRequestDetail';
import StorageRequests from './pages/stocking/StorageRequests';
import StorageRequestDetail from './pages/stocking/StorageRequestDetail';
import SuppliersInventory from './pages/stocking/SuppliersInventory';
import StockShipments from './pages/stocking/StockShipments';
import Picks from './pages/stocking/Picks';
import StockingOrders from './pages/stocking/Orders';
import StockingTickets from './pages/stocking/Tickets';
import StockingTicketDetail from './pages/stocking/TicketDetail';
import CanceledShipments from './pages/stocking/CanceledShipments';
import DeliveryReturns from './pages/stocking/DeliveryReturns';
import StockReturns from './pages/stocking/StockReturns';
import Inventory from './pages/stocking/Inventory';
import ChatPage from './pages/chat/Chat';
import WikiInbox from './pages/chef/WikiInbox';
import ConfirmateurPending from './pages/confirmateur/PendingOrders';
import ConfirmateurDashboardPage from './pages/confirmateur/Dashboard';
import ConfirmateurMyDashboard from './pages/confirmateur/MyDashboard';

function HomeRedirect() {
  const { user } = useAuth();
  const destination = user?.role === 'customer' ? '/dropshipper' : user?.role === 'seller' ? '/fournisseur' : '/admin';
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
            <Route path="/staff-login" element={<StaffLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/intro" element={<SceneSplash />} />
              <Route path="/inv/:code" element={<PublicInventory />} />
              <Route path="/scan/batch/:code" element={<BatchScan />} />

            <Route element={<ProtectedRoute roles={['admin', 'customer', 'seller']} />}>
              <Route path="/profile" element={<Profile />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/support" element={<AdminSupport />} />
              <Route path="/admin/inventory" element={<AdminInventory />} />
              <Route path="/admin/integration" element={<AdminIntegration />} />
              <Route path="/admin/staff" element={<AdminStaffDashboard />} />
              <Route path="/admin/chat" element={<ChatPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['customer']} />}>
              <Route path="/dropshipper" element={<DsDashboard />} />
              <Route path="/dropshipper/dashboard/delivery" element={<DsDashboard />} />
              <Route path="/dropshipper/dashboard/confirmation" element={<DsDashboard />} />
              <Route path="/dropshipper/dashboard/internal-confirmation" element={<DsDashboard />} />
              <Route path="/dropshipper/dashboard/products" element={<DsDashboard />} />
              <Route path="/dropshipper/store" element={<DsCatalog />} />
              <Route path="/dropshipper/store/:id" element={<ProductPage />} />
              <Route path="/dropshipper/trending" element={<DsTrending />} />
              <Route path="/dropshipper/products" element={<DsProducts />} />
              <Route path="/dropshipper/commandes" element={<DsCommandes />} />
              <Route path="/dropshipper/commandes/create" element={<DsCommandes />} />
              <Route path="/dropshipper/commandes/retours" element={<DsCommandes />} />
              <Route path="/dropshipper/commandes/echange" element={<DsCommandes />} />
              <Route path="/dropshipper/commandes/echange/create" element={<DsCommandes />} />
              <Route path="/dropshipper/support" element={<DsSupport />} />
              <Route path="/dropshipper/chat" element={<ChatPage />} />
              <Route path="/dropshipper/chat/:convId" element={<ChatPage />} />
              <Route path="/dropshipper/integrations" element={<DsApps />} />
              <Route path="/dropshipper/api" element={<DsApiKeys />} />
              <Route path="/dropshipper/api/docs" element={<DsApiDocs />} />
              <Route path="/dropshipper/payments" element={<DsPayments />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/chef" element={<ChefOverview />} />
              <Route path="/chef/staff" element={<AdminStaffDashboard />} />
              <Route path="/chef/performance-dashboard" element={<ChefPerformanceDashboard />} />
              <Route path="/chef/products-dashboard" element={<ChefProductsDashboard />} />
              <Route path="/chef/supplier-incubation-dashboard" element={<ChefSupplierIncubation />} />
              <Route path="/chef/seller-incubation-dashboard" element={<ChefSellerIncubation />} />
              <Route path="/chef/commandes" element={<ChefCommandes />} />
              <Route path="/chef/shipments" element={<ChefShipments />} />
              <Route path="/chef/shipments/:id" element={<ChefShipmentDetail />} />
              <Route path="/chef/returns" element={<ChefReturns />} />
              <Route path="/chef/returns/:id" element={<ChefReturnDetail />} />
              <Route path="/chef/pickup-requests" element={<ChefPickupRequests />} />
              <Route path="/chef/manifests" element={<ChefManifests />} />
              <Route path="/chef/manifests/:supplierId/:delivery" element={<ChefManifestDetail />} />
              <Route path="/chef/chat-threads" element={<ChefChatThreads />} />
              <Route path="/chef/transactions" element={<ChefTransactions />} />
              <Route path="/chef/reconciliation-reviews" element={<ChefReconciliationReviews />} />
              <Route path="/chef/seller-organizations" element={<ChefSellerOrganizations />} />
              <Route path="/chef/seller-organizations/:id" element={<ChefSellerOrganizationDetail />} />
              <Route path="/chef/supplier-organizations" element={<ChefSupplierOrganizations />} />
              <Route path="/chef/supplier-organizations/:id" element={<ChefSupplierOrganizationDetail />} />
              <Route path="/chef/subscriptions" element={<ChefSubscriptions />} />
              <Route path="/chef/products" element={<ChefProducts />} />
              <Route path="/chef/products/:id" element={<ChefProductPreview />} />
              <Route path="/chef/products-collections" element={<ChefCollections />} />
              <Route path="/chef/products-collections/create" element={<CollectionEditor />} />
              <Route path="/chef/products-collections/:id" element={<CollectionEditor />} />
              <Route path="/chef/bins-inventory" element={<ChefBinsInventory />} />
              <Route path="/chef/leads/list" element={<ChefLeadsList />} />
              <Route path="/chef/leads/create" element={<ChefLeadCreate />} />
              <Route path="/chef/leads/import" element={<ChefLeadImport />} />
              <Route path="/chef/warehouses" element={<ChefWarehouses />} />
              <Route path="/chef/packing/bins/create" element={<ChefPackingBinCreate />} />
              <Route path="/chef/packing/bins/:id" element={<ChefPackingBinEdit />} />
              <Route path="/chef/find-products" element={<ChefFindProducts />} />
              <Route path="/chef/find-products/:uuid" element={<ChefProductPreview />} />
              <Route path="/chef/fulfillment" element={<ChefFulfillment />} />
              <Route path="/chef/inventory" element={<ChefInventory />} />
              <Route path="/chef/tickets" element={<ChefTickets />} />
              <Route path="/chef/tickets/:id" element={<ChefTicketDetail />} />
              <Route path="/chef/chat" element={<ChatPage />} />
              <Route path="/chef/wiki/inbox" element={<WikiInbox />} />
              <Route path="/chef/*" element={<ChefPlaceholder />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/support" element={<SupportTickets />} />
              <Route path="/support/find-products" element={<SupportFindProducts />} />
              <Route path="/support/find-products/:uuid" element={<SupportProductPreview />} />
              <Route path="/support/seller-organizations" element={<SupportSellerOrganizations />} />
              <Route path="/support/seller-organizations/:id" element={<SupportSellerOrganizationDetail />} />
              <Route path="/support/supplier-organizations" element={<SupportSupplierOrganizations />} />
              <Route path="/support/supplier-organizations/:id" element={<SupportSupplierOrganizationDetail />} />
              <Route path="/support/services" element={<SupportServices />} />
              <Route path="/support/services/:id" element={<SupportServicesDetail />} />
              <Route path="/support/tickets/:id" element={<SupportTicketDetail />} />
              <Route path="/support/inbox" element={<SupportInbox />} />
              <Route path="/support/commandes" element={<SupportCommandes />} />
              <Route path="/support/chat" element={<ChatPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['seller']} />}>
              <Route path="/fournisseur" element={<FourDashboard />} />
              <Route path="/fournisseur/trending" element={<FourTrending />} />
              <Route path="/fournisseur/products" element={<FourProducts />} />
              <Route path="/fournisseur/products/preview/:id" element={<FourProductPreview />} />
                            <Route path="/fournisseur/products/add" element={<FourAddProduct />} />
              <Route path="/fournisseur/inventory" element={<FourStockInventory />} />
              <Route path="/fournisseur/storage-requests" element={<FourStorageRequests />} />
              <Route path="/fournisseur/storage-requests/:id" element={<FourStorageRequestDetail />} />
              <Route path="/fournisseur/warehouses" element={<FourWarehouses />} />
              <Route path="/fournisseur/warehouses/add" element={<FourAddNewWarehouse />} />
              <Route path="/fournisseur/warehouses/:id/edit" element={<FourAddNewWarehouse />} />
              <Route path="/fournisseur/packaging" element={<FourPackaging />} />
              <Route path="/fournisseur/subscriptions" element={<FourSubscriptions />} />
              <Route path="/fournisseur/price-updates" element={<FourPriceUpdates />} />
              <Route path="/fournisseur/stock-shipments" element={<FourStockShipments />} />
              <Route path="/fournisseur/stock-shipments/create" element={<FourCreateStockShipment />} />
              <Route path="/fournisseur/orders" element={<FourOrders />} />
              <Route path="/fournisseur/orders-batches" element={<FourOrderBatches />} />
              <Route path="/fournisseur/manifests" element={<FourManifests />} />
              <Route path="/fournisseur/wholesale-orders" element={<WholesaleOrders />} />
              <Route path="/fournisseur/reservations" element={<Reservations />} />
              <Route path="/fournisseur/fulfillment/orders" element={<FulfillmentOrders />} />
              <Route path="/fournisseur/fulfillment/orders/new" element={<FulfillmentOrders />} />
              <Route path="/fournisseur/fulfillment/orders/returns" element={<FulfillmentOrders />} />
              <Route path="/fournisseur/fulfillment/orders/exchanges" element={<FulfillmentOrders />} />
              <Route path="/fournisseur/fulfillment/orders/exchanges/create" element={<FulfillmentOrders />} />
              <Route path="/fournisseur/fulfillment/products/add" element={<FulfillmentAddProduct />} />
              <Route path="/fournisseur/chat" element={<ChatPage />} />
              <Route path="/fournisseur/support" element={<FourSupport />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/stocking" element={<StockingDashboard />} />
              <Route path="/stocking/stock-refill-requests" element={<StockRefillRequests />} />
              <Route path="/stocking/stock-refill-requests/new" element={<CreateStockRefillRequest />} />
              <Route path="/stocking/stock-refill-requests/:id" element={<StockRefillRequestDetail />} />
              <Route path="/stocking/storage-requests" element={<StorageRequests />} />
              <Route path="/stocking/storage-requests/:id" element={<StorageRequestDetail />} />
              <Route path="/stocking/suppliers-inventory" element={<SuppliersInventory />} />
              <Route path="/stocking/inventory" element={<Inventory />} />
              <Route path="/stocking/orders" element={<StockingOrders />} />
              <Route path="/stocking/wholesale-orders" element={<StockingWholesaleOrders />} />
              <Route path="/stocking/canceled-shipments" element={<CanceledShipments />} />
              <Route path="/stocking/delivery-returns" element={<DeliveryReturns />} />
              <Route path="/stocking/stock-returns" element={<StockReturns />} />
              <Route path="/stocking/stock-shipments" element={<StockShipments />} />
              <Route path="/stocking/picks" element={<Picks />} />
              <Route path="/stocking/tickets" element={<StockingTickets />} />
              <Route path="/stocking/tickets/:id" element={<StockingTicketDetail />} />
              <Route path="/stocking/*" element={<StockingPlaceholder />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/confirmateur" element={<ConfirmateurPending />} />
              <Route path="/confirmateur/pending" element={<ConfirmateurPending />} />
              <Route path="/confirmateur/dashboard" element={<ConfirmateurDashboardPage />} />
              <Route path="/confirmateur/my-dashboard" element={<ConfirmateurMyDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
