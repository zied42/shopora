import { useRoutes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import NotFound from './pages/NotFound';
import AdminIntegration from './pages/admin/Integration';
import AdminStaffDashboard from './pages/admin/StaffDashboard';
import DsDashboard from './pages/dropshipper/Dashboard';
import DsCatalog from './pages/dropshipper/Catalog';
import DsProductPage from './pages/dropshipper/ProductPage';
import DsProducts from './pages/dropshipper/MyProducts';
import DsCommandes from './pages/dropshipper/Commandes';
import DsSupport from './pages/dropshipper/Support';
import DsTrending from './pages/dropshipper/Trending';
import DsApps from './pages/dropshipper/Apps';
import DsApiKeys from './pages/dropshipper/ApiKeys';
import DsApiDocs from './pages/dropshipper/ApiDocs';
import DsPayments from './pages/dropshipper/Payments';
import DsReservations from './pages/dropshipper/Reservations';
import FourDashboard from './pages/fournisseur/Dashboard';
import FourProducts from './pages/fournisseur/Products';
import FourProductPreview from './pages/fournisseur/ProductPreview';
import FourAddProduct from './pages/fournisseur/AddProduct';
import FourOrders from './pages/fournisseur/Orders';
import FourReservations from './pages/fournisseur/Reservations';
import FourOrderBatches from './pages/fournisseur/OrderBatches';
import FourManifests from './pages/fournisseur/Manifests';
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
import FourSupport from './pages/fournisseur/Support';
import { WholesaleOrders as FourWholesaleOrders, StockingWholesaleOrders } from './pages/fournisseur/WholesaleOrders';
import FulfillmentOrders from './pages/fournisseur/FulfillmentOrders';
import FulfillmentAddProduct from './pages/fournisseur/FulfillmentAddProduct';
import ChefOverview from './pages/chef/Overview';
import ChefCommandes from './pages/chef/Commandes';
import ChefShipments from './pages/chef/Shipments';
import ChefShipmentDetail from './pages/chef/ShipmentDetail';
import ChefReturns from './pages/chef/Returns';
import ChefReturnDetail from './pages/chef/ReturnDetail';
import ChefPickupRequests from './pages/chef/PickupRequests';
import ChefManifests from './pages/chef/Manifests';
import ChefManifestDetail from './pages/chef/ManifestDetail';
import ChefTransactions from './pages/chef/Transactions';
import ChefProducts from './pages/chef/Products';
import ChefProductPreview from './pages/chef/ProductPreview';
import ChefCollections from './pages/chef/Collections';
import ChefInventory from './pages/chef/Inventory';
import ChefWarehouses from './pages/chef/Warehouses';
import ChefTickets from './pages/chef/Tickets';
import ChefTicketDetail from './pages/chef/TicketDetail';
import ChefSubscriptions from './pages/chef/Subscriptions';
import ChefFindProducts from './pages/chef/FindProducts';
import ChefLeads from './pages/chef/Leads';
import ChefLeadCreate from './pages/chef/LeadCreate';
import ChefLeadImport from './pages/chef/LeadImport';
import ChefBinsInventory from './pages/chef/BinsInventory';
import ChefFulfillment from './pages/chef/Fulfillment';
import ChefPlatformProfit from './pages/chef/PlatformProfit';
import ChefReconciliation from './pages/chef/ReconciliationReviews';
import ChefPerformance from './pages/chef/PerformanceDashboard';
import ChefProductsDashboard from './pages/chef/ProductsDashboard';
import ChefOrganizations from './pages/chef/SellerOrganizations';
import ChefSupplierOrganizations from './pages/chef/SupplierOrganizations';
import ChefCollectionsEditor from './pages/chef/CollectionEditor';
import ChefWikiInbox from './pages/chef/WikiInbox';
import ChefChatThreads from './pages/chef/ChatThreads';
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
import StockingDashboard from './pages/stocking/Dashboard';
import StockingReservations from './pages/stocking/Reservations';
import StockingInventoryReservation from './pages/stocking/InventoryReservation';
import StockingDropshipperInventory from './pages/stocking/DropshipperReservedInventory';
import StockingInventory from './pages/stocking/Inventory';
import StockingStorageRequests from './pages/stocking/StorageRequests';
import StockingStorageRequestDetail from './pages/stocking/StorageRequestDetail';
import StockingSuppliersInventory from './pages/stocking/SuppliersInventory';
import StockingOrders from './pages/stocking/Orders';
import StockingPicks from './pages/stocking/Picks';
import StockingShipments from './pages/stocking/StockShipments';
import StockingRefillRequests from './pages/stocking/StockRefillRequests';
import StockingRefillRequestDetail from './pages/stocking/StockRefillRequestDetail';
import StockingCreateRefill from './pages/stocking/CreateStockRefillRequest';
import StockingCreateReservationRefill from './pages/stocking/CreateReservationRefillRequest';
import StockingReturns from './pages/stocking/StockReturns';
import StockingDeliveryReturns from './pages/stocking/DeliveryReturns';
import StockingCanceledShipments from './pages/stocking/CanceledShipments';
import StockingTickets from './pages/stocking/Tickets';
import StockingTicketDetail from './pages/stocking/TicketDetail';
import ConfirmateurPending from './pages/confirmateur/PendingOrders';
import ConfirmateurDashboard from './pages/confirmateur/Dashboard';
import ConfirmateurMyDashboard from './pages/confirmateur/MyDashboard';
import ChatPage from './pages/chat/Chat';

/** Restored role-specific portals from Lunexa, guarded by server-recognized roles. */
export default function RolePortals() {
  return useRoutes([
    { path: 'admin/integration', element: <ProtectedRoute roles={['admin']}><AdminIntegration /></ProtectedRoute> },
    { path: 'admin/staff', element: <ProtectedRoute roles={['admin']}><AdminStaffDashboard /></ProtectedRoute> },
    { path: 'admin/chat', element: <ProtectedRoute roles={['admin']}><ChatPage /></ProtectedRoute> },
    { path: 'dropshipper', element: <ProtectedRoute roles={['dropshipper']}><DsDashboard /></ProtectedRoute> },
    { path: 'dropshipper/store', element: <ProtectedRoute roles={['dropshipper']}><DsCatalog /></ProtectedRoute> },
    { path: 'dropshipper/store/:id', element: <ProtectedRoute roles={['dropshipper']}><DsProductPage /></ProtectedRoute> },
    { path: 'dropshipper/products', element: <ProtectedRoute roles={['dropshipper']}><DsProducts /></ProtectedRoute> },
    { path: 'dropshipper/commandes/*', element: <ProtectedRoute roles={['dropshipper']}><DsCommandes /></ProtectedRoute> },
    { path: 'dropshipper/support', element: <ProtectedRoute roles={['dropshipper']}><DsSupport /></ProtectedRoute> },
    { path: 'dropshipper/dashboard/*', element: <ProtectedRoute roles={['dropshipper']}><DsDashboard /></ProtectedRoute> },
    { path: 'dropshipper/trending', element: <ProtectedRoute roles={['dropshipper']}><DsTrending /></ProtectedRoute> },
    { path: 'dropshipper/integrations', element: <ProtectedRoute roles={['dropshipper']}><DsApps /></ProtectedRoute> },
    { path: 'dropshipper/api', element: <ProtectedRoute roles={['dropshipper']}><DsApiKeys /></ProtectedRoute> },
    { path: 'dropshipper/api/docs', element: <ProtectedRoute roles={['dropshipper']}><DsApiDocs /></ProtectedRoute> },
    { path: 'dropshipper/payments', element: <ProtectedRoute roles={['dropshipper']}><DsPayments /></ProtectedRoute> },
    { path: 'dropshipper/reservations', element: <ProtectedRoute roles={['dropshipper']}><DsReservations /></ProtectedRoute> },
    { path: 'dropshipper/chat/*', element: <ProtectedRoute roles={['dropshipper']}><ChatPage /></ProtectedRoute> },
    { path: 'fournisseur', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourDashboard /></ProtectedRoute> },
    { path: 'fournisseur/products', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourProducts /></ProtectedRoute> },
    { path: 'fournisseur/products/preview/:id', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourProductPreview /></ProtectedRoute> },
    { path: 'fournisseur/products/add', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourAddProduct /></ProtectedRoute> },
    { path: 'fournisseur/orders', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourOrders /></ProtectedRoute> },
    { path: 'fournisseur/orders-batches', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourOrderBatches /></ProtectedRoute> },
    { path: 'fournisseur/manifests', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourManifests /></ProtectedRoute> },
    { path: 'fournisseur/wholesale-orders', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourWholesaleOrders /></ProtectedRoute> },
    { path: 'fournisseur/reservations', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourReservations /></ProtectedRoute> },
    { path: 'fournisseur/inventory', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourStockInventory /></ProtectedRoute> },
    { path: 'fournisseur/storage-requests/*', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourStorageRequests /></ProtectedRoute> },
    { path: 'fournisseur/storage-requests/:id', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourStorageRequestDetail /></ProtectedRoute> },
    { path: 'fournisseur/warehouses', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourWarehouses /></ProtectedRoute> },
    { path: 'fournisseur/warehouses/add', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourAddNewWarehouse /></ProtectedRoute> },
    { path: 'fournisseur/warehouses/:id/edit', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourAddNewWarehouse /></ProtectedRoute> },
    { path: 'fournisseur/packaging', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourPackaging /></ProtectedRoute> },
    { path: 'fournisseur/subscriptions', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourSubscriptions /></ProtectedRoute> },
    { path: 'fournisseur/price-updates', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourPriceUpdates /></ProtectedRoute> },
    { path: 'fournisseur/stock-shipments/create', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourCreateStockShipment /></ProtectedRoute> },
    { path: 'fournisseur/stock-shipments', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourStockShipments /></ProtectedRoute> },
    { path: 'fournisseur/fulfillment/products/add', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FulfillmentAddProduct /></ProtectedRoute> },
    { path: 'fournisseur/fulfillment/orders/*', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FulfillmentOrders /></ProtectedRoute> },
    { path: 'fournisseur/support', element: <ProtectedRoute roles={['fournisseur', 'seller']}><FourSupport /></ProtectedRoute> },
    { path: 'fournisseur/chat/*', element: <ProtectedRoute roles={['fournisseur', 'seller']}><ChatPage /></ProtectedRoute> },
    { path: 'chef', element: <ProtectedRoute roles={['chef']}><ChefOverview /></ProtectedRoute> },
    { path: 'chef/performance-dashboard', element: <ProtectedRoute roles={['chef']}><ChefPerformance /></ProtectedRoute> },
    { path: 'chef/products-dashboard', element: <ProtectedRoute roles={['chef']}><ChefProductsDashboard /></ProtectedRoute> },
    { path: 'chef/commandes', element: <ProtectedRoute roles={['chef']}><ChefCommandes /></ProtectedRoute> },
    { path: 'chef/shipments/:id', element: <ProtectedRoute roles={['chef']}><ChefShipmentDetail /></ProtectedRoute> },
    { path: 'chef/shipments', element: <ProtectedRoute roles={['chef']}><ChefShipments /></ProtectedRoute> },
    { path: 'chef/returns/:id', element: <ProtectedRoute roles={['chef']}><ChefReturnDetail /></ProtectedRoute> },
    { path: 'chef/returns', element: <ProtectedRoute roles={['chef']}><ChefReturns /></ProtectedRoute> },
    { path: 'chef/pickup-requests', element: <ProtectedRoute roles={['chef']}><ChefPickupRequests /></ProtectedRoute> },
    { path: 'chef/manifests/:supplierId/:delivery', element: <ProtectedRoute roles={['chef']}><ChefManifestDetail /></ProtectedRoute> },
    { path: 'chef/manifests', element: <ProtectedRoute roles={['chef']}><ChefManifests /></ProtectedRoute> },
    { path: 'chef/transactions', element: <ProtectedRoute roles={['chef']}><ChefTransactions /></ProtectedRoute> },
    { path: 'chef/platform-profit', element: <ProtectedRoute roles={['chef']}><ChefPlatformProfit /></ProtectedRoute> },
    { path: 'chef/reconciliation-reviews', element: <ProtectedRoute roles={['chef']}><ChefReconciliation /></ProtectedRoute> },
    { path: 'chef/products/:id', element: <ProtectedRoute roles={['chef']}><ChefProductPreview /></ProtectedRoute> },
    { path: 'chef/products', element: <ProtectedRoute roles={['chef']}><ChefProducts /></ProtectedRoute> },
    { path: 'chef/products-collections/create', element: <ProtectedRoute roles={['chef']}><ChefCollectionsEditor /></ProtectedRoute> },
    { path: 'chef/products-collections/:id', element: <ProtectedRoute roles={['chef']}><ChefCollectionsEditor /></ProtectedRoute> },
    { path: 'chef/products-collections', element: <ProtectedRoute roles={['chef']}><ChefCollections /></ProtectedRoute> },
    { path: 'chef/bins-inventory', element: <ProtectedRoute roles={['chef']}><ChefBinsInventory /></ProtectedRoute> },
    { path: 'chef/fulfillment', element: <ProtectedRoute roles={['chef']}><ChefFulfillment /></ProtectedRoute> },
    { path: 'chef/inventory', element: <ProtectedRoute roles={['chef']}><ChefInventory /></ProtectedRoute> },
    { path: 'chef/warehouses', element: <ProtectedRoute roles={['chef']}><ChefWarehouses /></ProtectedRoute> },
    { path: 'chef/tickets/:id', element: <ProtectedRoute roles={['chef']}><ChefTicketDetail /></ProtectedRoute> },
    { path: 'chef/tickets', element: <ProtectedRoute roles={['chef']}><ChefTickets /></ProtectedRoute> },
    { path: 'chef/subscriptions', element: <ProtectedRoute roles={['chef']}><ChefSubscriptions /></ProtectedRoute> },
    { path: 'chef/find-products/:uuid', element: <ProtectedRoute roles={['chef']}><ChefProductPreview /></ProtectedRoute> },
    { path: 'chef/find-products', element: <ProtectedRoute roles={['chef']}><ChefFindProducts /></ProtectedRoute> },
    { path: 'chef/leads/create', element: <ProtectedRoute roles={['chef']}><ChefLeadCreate /></ProtectedRoute> },
    { path: 'chef/leads/import', element: <ProtectedRoute roles={['chef']}><ChefLeadImport /></ProtectedRoute> },
    { path: 'chef/leads/list', element: <ProtectedRoute roles={['chef']}><ChefLeads /></ProtectedRoute> },
    { path: 'chef/warehouses', element: <ProtectedRoute roles={['chef']}><ChefWarehouses /></ProtectedRoute> },
    { path: 'chef/organizations/sellers', element: <ProtectedRoute roles={['chef']}><ChefOrganizations /></ProtectedRoute> },
    { path: 'chef/organizations/suppliers', element: <ProtectedRoute roles={['chef']}><ChefSupplierOrganizations /></ProtectedRoute> },
    { path: 'chef/wiki/inbox', element: <ProtectedRoute roles={['chef']}><ChefWikiInbox /></ProtectedRoute> },
    { path: 'chef/chat-threads', element: <ProtectedRoute roles={['chef']}><ChefChatThreads /></ProtectedRoute> },
    { path: 'chef/chat/*', element: <ProtectedRoute roles={['chef']}><ChatPage /></ProtectedRoute> },
    { path: 'support/desk', element: <ProtectedRoute roles={['support']}><SupportInbox /></ProtectedRoute> },
    { path: 'support/desk/tickets/*', element: <ProtectedRoute roles={['support']}><SupportTickets /></ProtectedRoute> },
    { path: 'support/desk/ticket/:id', element: <ProtectedRoute roles={['support']}><SupportTicketDetail /></ProtectedRoute> },
    { path: 'support/desk/services/*', element: <ProtectedRoute roles={['support']}><SupportServices /></ProtectedRoute> },
    { path: 'support/desk/services/:id', element: <ProtectedRoute roles={['support']}><SupportServicesDetail /></ProtectedRoute> },
    { path: 'support/desk/commandes', element: <ProtectedRoute roles={['support']}><SupportCommandes /></ProtectedRoute> },
    { path: 'support/desk/find-products/:uuid', element: <ProtectedRoute roles={['support']}><SupportProductPreview /></ProtectedRoute> },
    { path: 'support/desk/find-products', element: <ProtectedRoute roles={['support']}><SupportFindProducts /></ProtectedRoute> },
    { path: 'support/desk/sellers/:id', element: <ProtectedRoute roles={['support']}><SupportSellerOrganizationDetail /></ProtectedRoute> },
    { path: 'support/desk/sellers', element: <ProtectedRoute roles={['support']}><SupportSellerOrganizations /></ProtectedRoute> },
    { path: 'support/desk/suppliers/:id', element: <ProtectedRoute roles={['support']}><SupportSupplierOrganizationDetail /></ProtectedRoute> },
    { path: 'support/desk/suppliers', element: <ProtectedRoute roles={['support']}><SupportSupplierOrganizations /></ProtectedRoute> },
    { path: 'support/desk/chat', element: <ProtectedRoute roles={['support']}><ChatPage /></ProtectedRoute> },
    { path: 'stocking', element: <ProtectedRoute roles={['stocking']}><StockingDashboard /></ProtectedRoute> },
    { path: 'stocking/reservations/new', element: <ProtectedRoute roles={['stocking']}><StockingCreateReservationRefill /></ProtectedRoute> },
    { path: 'stocking/reservations/inventory/:id', element: <ProtectedRoute roles={['stocking']}><StockingDropshipperInventory /></ProtectedRoute> },
    { path: 'stocking/reservations/inventory', element: <ProtectedRoute roles={['stocking']}><StockingInventoryReservation /></ProtectedRoute> },
    { path: 'stocking/reservations', element: <ProtectedRoute roles={['stocking']}><StockingReservations /></ProtectedRoute> },
    { path: 'stocking/stock-refill-requests/new', element: <ProtectedRoute roles={['stocking']}><StockingCreateRefill /></ProtectedRoute> },
    { path: 'stocking/stock-refill-requests/:id', element: <ProtectedRoute roles={['stocking']}><StockingRefillRequestDetail /></ProtectedRoute> },
    { path: 'stocking/stock-refill-requests', element: <ProtectedRoute roles={['stocking']}><StockingRefillRequests /></ProtectedRoute> },
    { path: 'stocking/storage-requests/:id', element: <ProtectedRoute roles={['stocking']}><StockingStorageRequestDetail /></ProtectedRoute> },
    { path: 'stocking/storage-requests', element: <ProtectedRoute roles={['stocking']}><StockingStorageRequests /></ProtectedRoute> },
    { path: 'stocking/suppliers-inventory', element: <ProtectedRoute roles={['stocking']}><StockingSuppliersInventory /></ProtectedRoute> },
    { path: 'stocking/inventory', element: <ProtectedRoute roles={['stocking']}><StockingInventory /></ProtectedRoute> },
    { path: 'stocking/orders', element: <ProtectedRoute roles={['stocking']}><StockingOrders /></ProtectedRoute> },
    { path: 'stocking/picks', element: <ProtectedRoute roles={['stocking']}><StockingPicks /></ProtectedRoute> },
    { path: 'stocking/stock-shipments', element: <ProtectedRoute roles={['stocking']}><StockingShipments /></ProtectedRoute> },
    { path: 'stocking/canceled-shipments', element: <ProtectedRoute roles={['stocking']}><StockingCanceledShipments /></ProtectedRoute> },
    { path: 'stocking/delivery-returns', element: <ProtectedRoute roles={['stocking']}><StockingDeliveryReturns /></ProtectedRoute> },
    { path: 'stocking/stock-returns', element: <ProtectedRoute roles={['stocking']}><StockingReturns /></ProtectedRoute> },
    { path: 'stocking/tickets/:id', element: <ProtectedRoute roles={['stocking']}><StockingTicketDetail /></ProtectedRoute> },
    { path: 'stocking/tickets', element: <ProtectedRoute roles={['stocking']}><StockingTickets /></ProtectedRoute> },
    { path: 'stocking/wholesale-orders', element: <ProtectedRoute roles={['stocking']}><StockingWholesaleOrders /></ProtectedRoute> },
    { path: 'confirmateur', element: <ProtectedRoute roles={['confirmateur']}><ConfirmateurPending /></ProtectedRoute> },
    { path: 'confirmateur/pending', element: <ProtectedRoute roles={['confirmateur']}><ConfirmateurPending /></ProtectedRoute> },
    { path: 'confirmateur/dashboard', element: <ProtectedRoute roles={['confirmateur']}><ConfirmateurDashboard /></ProtectedRoute> },
    { path: 'confirmateur/my-dashboard', element: <ProtectedRoute roles={['confirmateur']}><ConfirmateurMyDashboard /></ProtectedRoute> },
    { path: '*', element: <NotFound /> },
  ]);
}
