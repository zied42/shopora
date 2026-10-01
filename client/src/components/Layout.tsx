import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { apiErrorMessage, apiGet, apiPost, AppNotification, applyConfirmationService, getMyConfirmationStatus, ServiceInscription, Ticket, timeFmt } from '../lib/api';
import { ThemeToggle } from './ui';

const NEW_PRODUCT_TOAST_KEY = 'shopora.new_product_toast_id';
const STAFF_ROLES = ['admin'];

interface NavChild {
  to: string;
  label: string;
  end?: boolean;
  badge?: string;
  badgeTone?: 'red' | 'amber' | 'emerald' | 'blue';
  children?: NavChild[];
}

interface NavItem {
  to: string;
  label: string;
  icon: string;
  badge?: string;
  badgeTone?: 'red' | 'amber' | 'emerald' | 'blue';
  children?: NavChild[];
  disabled?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const FULFILLMENT_SECTION: NavSection = {
  label: 'Fulfillment',
  items: [
    {
      to: '/fournisseur/fulfillment/orders',
      label: 'Orders',
      icon: '',
      children: [
        { to: '/fournisseur/fulfillment/orders', label: 'All orders', end: true },
        { to: '/fournisseur/fulfillment/orders/new', label: 'New order' },
        { to: '/fournisseur/fulfillment/orders/returns', label: 'Returns' },
        { to: '/fournisseur/fulfillment/orders/exchanges', label: 'Exchanges' },
      ],
    },
    { to: '/fournisseur/fulfillment/products/add', label: 'Add product', icon: '' },
  ],
};

const NAV: Record<string, NavSection[]> = {
  admin: [
    {
      label: 'Overview',
      items: [
        { to: '/admin', label: 'Dashboard', icon: '' },
        { to: '/admin/users', label: 'Users', icon: '' },
        { to: '/admin/staff', label: 'Staff team', icon: '' },
      ],
    },
    {
      label: 'Management',
      items: [
        { to: '/admin/products', label: 'Products', icon: '' },
        { to: '/admin/orders', label: 'Orders', icon: '' },
        { to: '/admin/inventory', label: 'Inventory', icon: '' },
      ],
    },
    {
      label: 'Support',
      items: [
        { to: '/admin/support', label: 'Tickets', icon: '' },
        { to: '/admin/chat', label: 'Team chat', icon: '' },
      ],
    },
    {
      label: 'Developer',
      items: [
        { to: '/admin/integration', label: 'Integration', icon: '' },
      ],
    },
  ],
  chef: [
    {
      label: 'Operations',
      items: [
        { to: '/chef/tickets', label: 'Tickets', icon: '' },
        { to: '/chef/shipments', label: 'Shipments', icon: '' },
        { to: '/chef/returns', label: 'Returns', icon: '' },
        { to: '/chef/pickup-requests', label: 'Pickup requests', icon: '' },
        { to: '/chef/manifests', label: 'Manifests', icon: '' },
      ],
    },
    {
      label: 'Finance',
      items: [
        {
          to: '/chef/transactions',
          label: 'Transactions',
          icon: '',
          children: [{ to: '/chef/transactions', label: 'List', end: true }],
        },
        {
          to: '/chef/reconciliation-reviews',
          label: 'Cash Management',
          icon: '',
          children: [{ to: '/chef/reconciliation-reviews', label: 'Reconciliation Reviews', end: true }],
        },
      ],
    },
    {
      label: 'Sellers',
      items: [
        { to: '/chef/seller-organizations', label: 'Sellers', icon: '' },
        { to: '/chef/subscriptions', label: 'Product Subscriptions', icon: '' },
        { to: '/chef/products-collections', label: 'Collections', icon: '' },
      ],
    },
    {
      label: 'Suppliers',
      items: [
        { to: '/chef/supplier-organizations', label: 'Suppliers', icon: '' },
        { to: '/chef/products', label: 'Products', icon: '' },
        { to: '/chef/chat-threads', label: 'Chat Threads', icon: '' },
        { to: '/chef/warehouses', label: 'Warehouses', icon: '' },
        { to: '/chef/bins-inventory', label: 'Bins Inventory', icon: '' },
      ],
    },
    {
      label: 'Leads',
      items: [
        { to: '/chef/leads/list', label: 'List', icon: '' },
        { to: '/chef/leads/calling-session', label: 'Calling Session', icon: '' },
        { to: '/chef/leads/create', label: 'Create', icon: '' },
        { to: '/chef/leads/import', label: 'Import', icon: '' },
        { to: '/chef/leads/imports', label: 'Import History', icon: '' },
        { to: '/chef/leads/simulator', label: 'Ops Audit', icon: '' },
        { to: '/chef/leads/ad-performance', label: 'Ad Performance', icon: '' },
      ],
    },
    {
      label: 'Settings',
      items: [{ to: '/chef/find-products', label: 'Search Products', icon: '' }],
    },
    {
      label: 'Feedback',
      items: [{ to: '/chef/feedback/questionnaires', label: 'Questionnaires', icon: '' }],
    },
    {
      label: 'Wiki',
      items: [
        { to: '/chef/wiki', label: 'Tutorial', icon: '', badge: '6', badgeTone: 'red' },
        { to: '/chef/wiki/inbox', label: 'My Inbox', icon: '', badge: '6', badgeTone: 'red' },
      ],
    },
    {
      label: 'Dashboards',
      items: [
        { to: '/chef', label: 'Overview', icon: '' },
        { to: '/chef/ops-dashboard', label: 'Ops Dashboard', icon: '' },
        { to: '/chef/performance-dashboard', label: 'Performance Dashboard', icon: '' },
        { to: '/chef/seller-incubation-dashboard', label: 'Seller Incubation', icon: '' },
        { to: '/chef/supplier-incubation-dashboard', label: 'Supplier Incubation', icon: '' },
        { to: '/chef/products-dashboard', label: 'Products Dashboard', icon: '' },
        { to: '/chef/staff', label: 'Staff Team', icon: '' },
      ],
    },
  ],
  support: [
    {
      label: 'Support',
      items: [
        { to: '/support/inbox', label: 'Inbox', icon: '' },
        { to: '/support', label: 'Tickets', icon: '' },
        { to: '/support/find-products', label: 'Search Products', icon: '' },
        { to: '/support/seller-organizations', label: 'Sellers', icon: '' },
        { to: '/support/supplier-organizations', label: 'Suppliers', icon: '' },
        { to: '/support/services', label: 'Services', icon: '' },
        { to: '/support/commandes', label: 'Commandes', icon: '' },
        { to: '/support/chat', label: 'Team chat', icon: '' },
      ],
    },
  ],
  stocking: [
    {
      label: 'Overview',
      items: [
        { to: '/stocking', label: 'Dashboard', icon: '' },
        { to: '/stocking/inventory', label: 'Inventory', icon: '' },
      ],
    },
    {
      label: 'Tickets',
      items: [{ to: '/stocking/tickets', label: 'Tickets', icon: '' }],
    },
    {
      label: 'Operations',
      items: [
        { to: '/stocking/picks', label: 'Picks', icon: '' },
        { to: '/stocking/orders', label: 'Orders', icon: '' },
        { to: '/stocking/reservations', label: 'Reservations', icon: '' },
        { to: '/stocking/stock-returns', label: 'Stock Returns', icon: '' },
        { to: '/stocking/wholesale-orders', label: 'Wholesale orders', icon: '' },
        { to: '/stocking/stock-shipments', label: 'Stock Shipments', icon: '' },
      ],
    },
    {
      label: 'Stock Entities',
      items: [
        { to: '/stocking/stock-refill-requests', label: 'Stock refill requests', icon: '' },
        { to: '/stocking/storage-requests', label: 'Storage Requests', icon: '' },
        { to: '/stocking/delivery-returns', label: 'Delivery Returns', icon: '' },
        { to: '/stocking/canceled-shipments', label: 'Canceled shipments', icon: '' },
      ],
    },
    {
      label: 'Warehouses & Logistics',
      items: [
        { to: '/stocking/suppliers-inventory', label: 'Suppliers Inventory', icon: '' },
      ],
    },
  ],
  customer: [
    {
      label: 'Products',
      items: [
        { to: '/dropshipper/store', label: 'Marketplace', icon: '' },
        { to: '/dropshipper/trending', label: 'Trending', icon: '', badge: 'Hot', badgeTone: 'red' },
        {
          to: '/dropshipper/products',
          label: 'My products',
          icon: '⭐',
          children: [{ to: '/dropshipper/products', label: 'Products list', end: true }],
        },
      ],
    },
    {
      label: 'Orders',
      items: [
        {
          to: '/dropshipper/commandes',
          label: 'Orders',
          icon: '',
          children: [
            { to: '/dropshipper/commandes', label: 'All orders', end: true },
            { to: '/dropshipper/commandes/create', label: 'New order' },
            { to: '/dropshipper/commandes/retours', label: 'Returns' },
            { to: '/dropshipper/commandes/echange', label: 'Exchanges' },
          ],
        },
      ],
    },
    {
      label: 'Support',
      items: [
        { to: '/dropshipper/support', label: 'Tickets', icon: '' },
        { to: '/dropshipper/chat', label: 'Chat', icon: '' },
      ],
    },
    {
      label: 'Finance',
      items: [
        { to: '/dropshipper/payments', label: 'Payments', icon: '💳' },
      ],
    },
    {
      label: 'Analytics',
      items: [
        {
          to: '/dropshipper/dashboard',
          label: 'Dashboard',
          icon: '',
          children: [
            { to: '/dropshipper', label: 'Overview', end: true },
            { to: '/dropshipper/dashboard/delivery', label: 'Delivery' },
            { to: '/dropshipper/dashboard/confirmation', label: 'Confirmation' },
            { to: '/dropshipper/dashboard/internal-confirmation', label: 'Internal Confirmation' },
            { to: '/dropshipper/dashboard/products', label: 'Products' },
          ],
        },
      ],
    },
    {
      label: 'Integrations',
      items: [
        { to: '/dropshipper/integrations', label: 'Apps', icon: '' },
        { to: '/dropshipper/api', label: 'API', icon: '' },
      ],
    },
  ],
  seller: [
    {
      label: 'Analytics',
      items: [
        { to: '/fournisseur', label: 'Dashboard', icon: '' },
        { to: '/fournisseur/trending', label: 'Trending', icon: '', badge: 'Hot', badgeTone: 'red' },
      ],
    },
    {
      label: 'Support',
      items: [
        { to: '/fournisseur/support', label: 'Tickets', icon: '' },
        { to: '/fournisseur/chat', label: 'Chat', icon: '' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { to: '/fournisseur/orders', label: 'Orders', icon: '' },
        { to: '/fournisseur/manifests', label: 'Manifests', icon: '' },
        { to: '/fournisseur/wholesale-orders', label: 'Wholesale orders', icon: '' },
        { to: '/fournisseur/reservations', label: 'Reservations', icon: '' },
      ],
    },
    {
      label: 'Product Management',
      items: [
        { to: '/fournisseur/products', label: 'My products', icon: '' },
        { to: '/fournisseur/products/add', label: 'Add product', icon: '' },
      ],
    },
    {
      label: 'Stock Management',
      items: [
        { to: '/fournisseur/inventory', label: 'Stock inventory', icon: '' },
        { to: '/fournisseur/storage-requests', label: 'Storage requests', icon: '' },
      ],
    },
    {
      label: 'Warehouses & Logistics',
      items: [
        { to: '/fournisseur/warehouses', label: 'Warehouses', icon: '' },
        { to: '/fournisseur/packaging', label: 'Packaging', icon: '' },
      ],
    },
    {
      label: 'Affiliation',
      items: [{ to: '/fournisseur/affiliation', label: 'Affiliate programs', icon: '', badge: 'New', badgeTone: 'blue' }],
    },
  ],
  confirmateur: [
    {
      label: 'Orders',
      items: [
        { to: '/confirmateur', label: 'Pending orders', icon: '📤' },
      ],
    },
    {
      label: 'Dashboard',
      items: [
        { to: '/confirmateur/dashboard', label: 'All confirmations', icon: '📊' },
        { to: '/confirmateur/my-dashboard', label: 'My confirmations', icon: '👤' },
      ],
    },
  ],
};

NAV.admin = [...(NAV.admin ?? []), ...(NAV.chef ?? []), ...(NAV.support ?? []), ...(NAV.stocking ?? []), ...(NAV.confirmateur ?? [])];

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', customer: 'Customer', seller: 'Seller' };
const ROLE_TONE: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  customer: 'bg-emerald-100 text-emerald-700',
  seller: 'bg-sky-100 text-sky-700',
};
const BADGE_TONE: Record<string, string> = {
  red: 'bg-rose-500/10 text-rose-600 ring-rose-200',
  amber: 'bg-amber-500/10 text-amber-600 ring-amber-200',
  emerald: 'bg-emerald-500/10 text-emerald-600 ring-emerald-200',
  blue: 'bg-sky-500/10 text-sky-600 ring-sky-200',
};

function BellEyeIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
      <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z" />
    </svg>
  );
}

function VolumeXMarkIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
      <path d="M301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3zM425 167l55 55 55-55c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-55 55 55 55c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-55-55-55 55c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l55-55-55-55c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0z" />
    </svg>
  );
}

function VolumeHighIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
      <path d="M533.6 32.5C598.5 85.2 640 165.8 640 256s-41.5 170.7-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z" />
    </svg>
  );
}

function CommentDotsIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 448c141.4 0 256-93.1 256-208S397.4 32 256 32S0 125.1 0 240c0 45.1 17.7 86.8 47.7 120.9c-1.9 24.5-11.4 46.3-21.4 62.9c-5.5 9.2-11.1 16.6-15.2 21.6c-2.1 2.5-3.7 4.4-4.9 5.7c-.6 .6-1 1.1-1.3 1.4l-.3 .3 0 0 0 0 0 0 0 0c-4.6 4.6-5.9 11.4-3.4 17.4c2.5 6 8.3 9.9 14.8 9.9c28.7 0 57.6-8.9 81.6-19.3c22.9-10 42.4-21.9 54.3-30.6c31.8 11.5 67 17.9 104.1 17.9zM128 208a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm128 0a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm96 32a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z" />
    </svg>
  );
}

function BellIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M224 0c-17.7 0-32 14.3-32 32l0 19.2C119.5 66 64 130.6 64 208l0 18.8c0 47.1-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S19.4 416 32 416l384 0c12.6 0 24-7.4 29.2-18.9s3.1-25-5.3-34.4l-7.4-8.3C401.3 319.2 384 273.9 384 226.8l0-18.8c0-77.4-55.5-142-128-156.8L256 32c0-17.7-14.3-32-32-32zm45.3 493.3c12-12 18.7-28.3 18.7-45.3l-64 0-64 0c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7z" />
    </svg>
  );
}

function useSupportUnread() {
  const [n, setN] = useState(0);
  const load = () => {
    apiGet<Ticket[]>('/support')
      .then((t) => setN(t.filter((x) => x.status !== 'closed').length))
      .catch(() => setN(0));
  };
  useEffect(() => {
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, []);
  return n;
}

function useChatUnread() {
  const { user } = useAuth();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!user || !['admin', 'customer', 'seller'].includes(user.role)) {
      setN(0);
      return;
    }
    const load = () => {
      apiGet<{ count: number }>('/chat/unread')
        .then((d) => setN(d.count))
        .catch(() => setN(0));
    };
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);
  return n;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [count, setCount] = useState(0);
  const [muted, setMuted] = useState(() => localStorage.getItem('shopora.notif_muted') === '1');
  const [callsChatsOn, setCallsChatsOn] = useState(() => localStorage.getItem('shopora.notif_calls_chats') !== '0');

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      localStorage.setItem('shopora.notif_muted', next ? '1' : '0');
      return next;
    });
  };
  const toggleCallsChats = () => {
    setCallsChatsOn((c) => {
      const next = !c;
      localStorage.setItem('shopora.notif_calls_chats', next ? '1' : '0');
      return next;
    });
  };

  const loadCount = () => {
    apiGet<{ count: number }>('/notifications/unread')
      .then((d) => setCount(d.count))
      .catch(() => setCount(0));
  };
  useEffect(() => {
    const t = setTimeout(loadCount, 3000);
    const iv = setInterval(loadCount, 20000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const all = await apiGet<AppNotification[]>('/notifications');
        setItems(all);
      } catch {
        setItems([]);
      }
      try {
        await apiPost('/notifications/read', {});
      } catch {
        /* ignore */
      }
      loadCount();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        title="Notifications"
        aria-label="Notifications"
        className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 ${open ? 'bg-slate-100 text-brand-600' : ''}`}
      >
        <BellIcon />
        {count > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-3 bottom-3 z-[60] flex max-h-[65vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:end-0 sm:mt-2 sm:max-h-[calc(100vh-8rem)] sm:w-[20rem]">
            {/* card-header */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
              <Link to="/notifications" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-brand-600">
                <BellEyeIcon className="text-slate-500" />
                View all
              </Link>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title={muted ? 'Unmute notifications' : 'Mute notifications'}
                  onClick={toggleMute}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
                    muted ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                  }`}
                >
                  {muted ? <VolumeXMarkIcon /> : <VolumeHighIcon />}
                </button>
                <button
                  type="button"
                  title={callsChatsOn ? 'Turn calls & chats off' : 'Turn calls & chats on'}
                  onClick={toggleCallsChats}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                    callsChatsOn ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <CommentDotsIcon />
                  Calls & chats: {callsChatsOn ? 'on' : 'off'}
                </button>
              </div>
            </div>
            {/* card-body with scrollable list */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-4 py-6 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-50 to-violet-50 text-4xl">�Y"�</span>
                  <p className="text-sm font-medium text-slate-500">You have no notifications yet.</p>
                </div>
              ) : (
                items.map((n) => (
                  <div key={n.id} className="border-b border-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{n.body}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{timeFmt(n.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ProfileMenu() {
  const { user, logout, impersonator, exitImpersonation } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const displayUser = impersonator ?? user;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-xl p-1 transition hover:bg-slate-100 sm:p-2"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-400 bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white shadow">
          {displayUser.photo ? (
            <img src={displayUser.photo} alt="" className="h-full w-full object-cover" />
          ) : (
            displayUser.name.slice(0, 1).toUpperCase()
          )}
        </span>
        <span className="hidden min-w-0 max-w-[12rem] text-start sm:block">
          <p className="truncate text-sm font-semibold text-slate-800">{displayUser.name}</p>
        </span>
        <ChevronDownIcon className={`hidden shrink-0 text-slate-400 transition-transform sm:block ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white shadow">
                {displayUser.photo ? (
                  <img src={displayUser.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  displayUser.name.slice(0, 1).toUpperCase()
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{displayUser.name}</p>
                <p className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ROLE_TONE[displayUser.role]}`}>{ROLE_LABEL[displayUser.role]}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                navigate('/profile');
              }}
              className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-start text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              My Profile
            </button>
            <button
              onClick={() => {
                setOpen(false);
                if (impersonator) {
                  exitImpersonation();
                  navigate('/chef');
                } else {
                  logout();
                  navigate(STAFF_ROLES.includes(user.role) ? '/staff-login' : '/login');
                }
              }}
              className="w-full px-4 py-2.5 text-start text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
            >
              {impersonator ? "Back to my account" : "Sign out"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type NewProductToast = {
  id: number;
  productId: number;
  title: string;
  body: string;
  image_url: string | null;
  leaving?: boolean;
};

const NEW_PRODUCT_TITLE = 'New product available';
const NEW_PRODUCT_BODY = 'A new product is available in the store" check it out!';
const NEW_PRODUCT_DURATION = 20000;

function DismissIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function NewProductBar({ t, onClose, onOpen }: { t: NewProductToast; onClose: (id: number) => void; onOpen: (t: NewProductToast) => void }) {
  const [phase, setPhase] = useState<'hidden' | 'shown' | 'leaving'>('hidden');

  useEffect(() => {
    const id = requestAnimationFrame(() => setPhase('shown'));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (t.leaving) setPhase('leaving');
  }, [t.leaving]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(t)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(t);
        }
      }}
      className={`flex cursor-pointer items-center gap-3 rounded-xl bg-green-500 px-4 py-3 text-white shadow-xl shadow-green-900/25 transition-all duration-500 ease-out will-change-transform ${
        phase === 'shown' ? 'translate-x-0 opacity-100' : 'translate-x-[130%] opacity-0'
      }`}
    >
      {t.image_url ? (
        <img src={t.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg border-2 border-white/50 object-cover" />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-white/50 bg-white/20 text-xl">�Y"�</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-snug">{t.title}</p>
        <p className="text-xs text-emerald-50 opacity-95">{t.body}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose(t.id);
        }}
        className="ms-2 shrink-0 rounded-full p-1.5 text-white/90 transition hover:bg-white/15 hover:text-white"
        aria-label="Close notification"
      >
        <DismissIcon />
      </button>
    </div>
  );
}

function NewProductToasts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<NewProductToast[]>([]);
  const lastSeenRef = useRef<number>(Number(localStorage.getItem(NEW_PRODUCT_TOAST_KEY) || 0));

  const dismiss = (id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 500);
  };

  useEffect(() => {
    if (user?.role !== 'customer') return;

    let disposed = false;

    const load = async () => {
      try {
        const all = await apiGet<AppNotification[]>('/notifications');
        if (disposed) return;
        const newProducts = all.filter((n) => n.type === 'new_product' && n.product_id != null);
        if (newProducts.length === 0) return;

        const highest = Math.max(...newProducts.map((n) => n.id));

        if (localStorage.getItem(NEW_PRODUCT_TOAST_KEY) === null) {
          lastSeenRef.current = highest;
          localStorage.setItem(NEW_PRODUCT_TOAST_KEY, String(highest));
          return;
        }

        const fresh = newProducts.filter((n) => n.id > lastSeenRef.current);
        if (fresh.length === 0) return;

        lastSeenRef.current = highest;
        localStorage.setItem(NEW_PRODUCT_TOAST_KEY, String(highest));

        const added: NewProductToast[] = fresh.map((n) => ({
          id: n.id,
          productId: n.product_id!,
          title: n.title || NEW_PRODUCT_TITLE,
          body: n.body || NEW_PRODUCT_BODY,
          image_url: n.image_url ?? null,
        }));
        setToasts((prev) => [...added, ...prev]);
        added.forEach((t) => setTimeout(() => dismiss(t.id), NEW_PRODUCT_DURATION));
      } catch {
        /* ignore */
      }
    };

    load();
    const iv = setInterval(load, 10000);
    return () => {
      disposed = true;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  if (user?.role !== 'customer' || toasts.length === 0) return null;

  return (
    <div className="fixed end-4 top-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2">
      {toasts.map((t) => (
        <NewProductBar
          key={t.id}
          t={t}
          onClose={dismiss}
          onOpen={(toast) => {
            navigate(`/dropshipper/store/${toast.productId}`);
            dismiss(toast.id);
          }}
        />
      ))}
    </div>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="mx-auto my-3 h-px w-8 bg-slate-200" />;
  }
  return (
    <div className="mt-5 flex items-center gap-3 px-3 first:mt-2">
      <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const options = [
    { id: 'en' as const, label: 'English' },
    { id: 'fr' as const, label: 'Français' },
    { id: 'ar' as const, label: 'العربية' },
  ];
  const current = options.find((option) => option.id === language) ?? options[0];

  const flag = (id: 'en' | 'fr' | 'ar') => id === 'en' ? (
    <svg viewBox="0 0 24 16" className="h-4 w-6 overflow-hidden rounded-sm" aria-hidden="true">
      <rect width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12, 14].map((y) => <rect key={y} y={y} width="24" height="1.23" fill="#b22234" />)}
      <rect width="10.5" height="8.6" fill="#3c3b6e" />
    </svg>
  ) : id === 'fr' ? (
    <svg viewBox="0 0 24 16" className="h-4 w-6 overflow-hidden rounded-sm" aria-hidden="true">
      <rect width="8" height="16" fill="#111" />
      <rect x="8" width="8" height="16" fill="#f8d21c" />
      <rect x="16" width="8" height="16" fill="#ed2939" />
    </svg>
  ) : (
    <svg width="24px" height="24px" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" preserveAspectRatio="xMidYMid meet">
      <path fill="#E70013" d="M32 5H4a4 4 0 0 0-4 4v18a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4z"></path>
      <circle fill="#FFF" cx="18" cy="18" r="6.5"></circle>
      <path fill="#E70013" d="M15.4 18a3.9 3.9 0 0 1 6.541-2.869a4.875 4.875 0 1 0 0 5.738A3.9 3.9 0 0 1 15.4 18z"></path>
      <path fill="#E70013" d="M19.645 16.937l-1.249-1.719v2.125L16.375 18l2.021.657v2.125l1.249-1.719l2.021.656L20.417 18l1.249-1.719z"></path>
    </svg>
  );

  return (
    <div className="relative">
      <button type="button" title="Change language" aria-label="Change language" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-slate-100">
        {flag(current.id)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-50 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            {options.map((option) => (
              <button key={option.id} type="button" onClick={() => { setLanguage(option.id); setOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition ${language === option.id ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'}`}>
                {flag(option.id)}
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DsPromoCards() {
  const [inscription, setInscription] = useState<ServiceInscription | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    getMyConfirmationStatus()
      .then(setInscription)
      .catch(() => setInscription(null));
  }, []);

  const apply = async () => {
    if (applying) return;
    setApplying(true);
    try {
      setInscription(await applyConfirmationService());
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setApplying(false);
    }
  };

  const isConfirmed = inscription?.status === 'confirmed';
  const isPending = inscription?.status === 'pending';

  return (
    <div className="mx-3 mt-0 space-y-2">
      <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-slate-100 p-3 text-center">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${isConfirmed ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : isPending ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-rose-50 text-rose-600 ring-rose-200'}`}>
          <span>{isConfirmed ? '✅' : isPending ? '⏳' : '🚫'}</span> {isConfirmed ? 'Active' : isPending ? 'Waiting confirmation' : 'Not active'}
        </span>
        <div className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-slate-700">
          <span>🎧</span> Confirmation service
        </div>
        <button
          type="button"
          onClick={apply}
          disabled={isConfirmed || isPending || applying}
          className="mt-2 rounded-lg bg-emerald-600 px-4 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isConfirmed ? 'Confirmed' : isPending ? 'Waiting…' : applying ? 'Submitting…' : 'Apply now'}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
            <span className="text-slate-400"></span> No tier yet
          </span>
          <button title="Refresh" className="text-[10px] text-slate-400 hover:text-slate-600">
          </button>
        </div>
        <hr className="my-2 border-slate-100" />
        <p className="text-[11px] text-slate-600">
          Unlock <span className="font-bold text-slate-900">Bronze</span> next month
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-700">
          <span className="text-brand-600"></span><span className="font-bold">10%</span> off dropshipping fee
        </p>
        <div className="mt-1 text-[11px]">
          <span className="font-bold text-slate-900">0</span>
          <span className="text-slate-400">/</span>
          <span className="font-semibold text-slate-600">100</span>
          <span className="ms-1 text-slate-500">(100 left)</span>
        </div>
        <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-900" style={{ width: '0%' }} />
        </div>
        <div className="mt-1.5 text-end">
          <span className="text-[11px] font-semibold text-brand-600">Learn more</span>
        </div>
      </div>
    </div>
  );
}

function FourPromoCard() {
  return (
    <div className="mx-3 mt-0 space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-slate-100 p-3 text-center">
        <div className="pointer-events-none absolute -end-6 -top-8 h-20 w-20 rounded-full bg-brand-100/40 blur-2xl" />
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 ring-1 ring-rose-200">
          Not eligible
        </span>
        <div className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-slate-700">
          <span></span> Sell dropshipping
        </div>
        <button className="mt-2 rounded-lg border border-slate-300 bg-white px-4 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50">
          Apply now
        </button>
      </div>
    </div>
  );
}

const FOUR_BADGES = ['Up to Date Stock', 'Quality Products', 'Reliable Fulfillment'];

function FourBadges() {
  return (
    <div className="mx-3 mb-2 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5 opacity-70 grayscale">
      {FOUR_BADGES.map((b) => (
        <span key={b} className="rounded-lg px-1.5 py-1 text-center text-[8.5px] font-bold leading-tight text-slate-500">
          {b}
        </span>
      ))}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, impersonator } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const logo = theme === 'dark' ? '/shopora-white.svg' : '/shopora.svg';
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('shopora.sidebar.collapsed') === '1');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const unreadCount = useSupportUnread();
  const chatUnread = useChatUnread();

  useEffect(() => {
    localStorage.setItem('shopora.sidebar.collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);
  if (!user) return null;

  const sections = (() => {
    const base = NAV[user.role] ?? [];
    if (user.role !== 'seller') return base;
    const idx = base.findIndex((s) => s.label === 'Operations');
    const out = [...base];
    out.splice(idx === -1 ? 1 : idx + 1, 0, FULFILLMENT_SECTION);
    return out;
  })();
  const home = user.role === 'customer' ? '/dropshipper' : user.role === 'seller' ? '/fournisseur' : '/admin';

  const childActive = (c: NavChild): boolean => {
    if (c.end) return location.pathname === c.to;
    if (location.pathname === c.to || location.pathname.startsWith(c.to + '/')) return true;
    return !!c.children?.some(childActive);
  };

  const hasActiveChild = (item: NavItem) => !!item.children?.some((c) => childActive(c));

  const isGroupOpen = (item: NavItem) => {
    if (collapsed) return false;
    if (item.to in openGroups) return openGroups[item.to];
    return hasActiveChild(item);
  };

  const toggleGroup = (item: NavItem) => setOpenGroups((g) => ({ ...g, [item.to]: !(g[item.to] ?? hasActiveChild(item)) }));

  const toggleIcon = (
    <button
      onClick={() => setCollapsed((c) => !c)}
      aria-label="Toggle sidebar"
      className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 lg:inline-flex"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {collapsed ? <path d="M17 8l-4 4 4 4" /> : <path d="M7 8l4 4-4 4" />}
        <path d="M3 6h18M3 12h18M3 18h18" opacity="0.4" />
      </svg>
    </button>
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      {/* brand */}
      <div className={`flex items-center gap-2 px-4 py-1 ${collapsed ? 'justify-between' : 'justify-between'}`}>
        {collapsed ? (
          <button onClick={() => setCollapsed(false)} className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-sm font-black text-white">
            S
          </button>
        ) : (
          <img src={logo} alt="shopora" className="h-16 w-45 object-contain" />
        )}
        {toggleIcon}
      </div>

      {!collapsed && user.role === 'customer' && <DsPromoCards />}
      {!collapsed && user.role === 'seller' && <FourPromoCard />}

      <nav className={`min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4 ${collapsed ? 'space-y-2' : ''}`}>
        {sections.map((section) => (
          <div key={section.label}>
            <SectionLabel label={section.label} collapsed={collapsed} />
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const matchesPath = (to: string) => location.pathname === to || location.pathname.startsWith(to + '/');
                const active = hasActiveChild(item) || (!item.children && location.pathname === item.to) || (item.to !== home && !item.children && item.to !== '/admin' && item.to !== '/chef' && item.to !== '/support' && item.to !== '/fournisseur' && item.to !== '/dropshipper' && matchesPath(item.to));
                const open = isGroupOpen(item);
                return (
                  <div key={item.to}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (item.children) {
                          toggleGroup(item);
                        } else if (!item.disabled) {
                          navigate(item.to);
                        }
                      }}
                      title={collapsed || item.disabled ? item.label : undefined}
                      className={`group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        collapsed ? 'justify-center' : ''
                      } ${
                        item.disabled
                          ? 'cursor-not-allowed text-slate-400 opacity-70'
                          : active
                            ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-md shadow-brand-600/25'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1">{t(item.label)}</span>
                          {item.badge && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${BADGE_TONE[item.badgeTone ?? 'red']} ${active ? '!bg-white/20 !text-white !ring-white/30' : ''}`}>
                              {item.badge}
                            </span>
                          )}
                          {item.label === 'Tickets' && unreadCount > 0 && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-white/25 text-white' : 'bg-rose-500 text-white'}`}>{unreadCount}</span>
                          )}
                          {(item.label === 'Team chat' || item.label === 'Chat') && chatUnread > 0 && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-white/25 text-white' : 'bg-rose-500 text-white'}`}>{chatUnread}</span>
                          )}
                          {item.children && (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              className={`transition-transform ${open ? 'rotate-180' : ''}`}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          )}
                        </>
                      )}
                      {collapsed && (
                        <span className={`absolute start-14 z-50 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg group-hover:block`}>
                          {item.label}
                        </span>
                      )}
                    </div>
                    {item.children && open && !collapsed && (
                      <div className="ms-5 mt-1 space-y-0.5 border-s border-slate-200 ps-3">
                        {item.children.map((c) => (
                          <div key={c.to}>
                            {c.children && c.children.length > 0 ? (
                              <>
                                <p className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{c.label}</p>
                                <div className="space-y-0.5">
                                  {c.children.map((cc) => (
                                    <NavLink
                                      key={cc.to}
                                      to={cc.to}
                                      end={cc.end}
                                      onClick={() => setMobileOpen(false)}
                                      className={({ isActive }) =>
                                        `block rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                                          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                        }`
                                      }
                                    >
                                      {t(cc.label)}
                                    </NavLink>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <NavLink
                                to={c.to}
                                end={c.end}
                                onClick={() => setMobileOpen(false)}
                                className={({ isActive }) =>
                                  `block rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                  }`
                                }
                              >
                                  {t(c.label)}
                              </NavLink>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* footer */}
      {!collapsed && user.role === 'seller' && (
        <div className="border-t border-slate-100 p-3">
          <FourBadges />
        </div>
      )}
    </div>
  );

  if (impersonator) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NewProductToasts />

        {/* Chef main navbar (top) */}
        <header className="sticky top-0 z-40 border-b border-amber-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
            <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-sky-500 text-sm font-bold text-white">{user.photo ? <img src={user.photo} alt="" className="h-full w-full object-cover" /> : user.name.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{user.name}</p>
                <span className="inline-block rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-sky-700">Fournisseur</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <ThemeToggle iconOnly />
              <NotificationBell />
              <ProfileMenu />
            </div>
          </div>
        </header>

        {/* fournisseur scrollable area (sidebar + horizontal navbar + content) */}
        <div className="flex">
          {/* Fournisseur vertical sidebar */}
          <aside className={`sticky top-16 hidden h-[calc(100vh-4rem)] border-e border-slate-200 bg-white lg:block ${collapsed ? 'w-16' : 'w-64'}`}>{sidebar}</aside>

          <div className={`min-w-0 flex-1 ${collapsed ? 'lg:pe-16' : ''}`}>

            {/* mobile sidebar overlay */}
            {mobileOpen && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
<aside className="absolute inset-y-0 start-0 w-64 bg-white shadow-2xl">{sidebar}</aside>
              </div>
            )}
            {location.pathname === '/dropshipper/store' && (
              <div className="mb-5">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <img src="/homey.png?v=2" alt="Home banner" className="aspect-[720/265] w-full object-cover object-center" />
                </div>
              </div>
            )}
            <main className="mx-auto max-w-7xl p-4 lg:p-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">{children}</div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="corner corner-tl"><span /><span /><span /></div>
      <div className="corner corner-tr"><span /><span /><span /></div>
      <div className="corner corner-bl"><span /><span /><span /></div>
      <div className="corner corner-br"><span /><span /><span /></div>
      <div className="corner corner-tl"><span /><span /><span /></div>
      <div className="corner corner-tr"><span /><span /><span /></div>
      <div className="corner corner-bl"><span /><span /><span /></div>
      <div className="corner corner-br"><span /><span /><span /></div>
      <NewProductToasts />

      {/* desktop sidebar */}
      <aside className={`fixed inset-y-0 start-0 z-40 hidden border-e border-slate-200 bg-white transition-all duration-200 lg:block ${collapsed ? 'w-16' : 'w-64'}`}>{sidebar}</aside>

      {/* mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-64 bg-white shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className={`transition-all duration-200 ${collapsed ? 'lg:ps-16' : 'lg:ps-64'}`}>
        {/* desktop horizontal navbar */}
<header className="sticky top-0 z-40 hidden items-center justify-end gap-2 border-b
           border-slate-200 bg-white px-4 py-2 dark:bg-slate-950 lg:flex">
          <LanguageSelector />
          <ThemeToggle iconOnly />
          <NotificationBell />
          <ProfileMenu />
        </header>

        {/* mobile topbar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:bg-slate-950 lg:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <img src={logo} alt="shopora" className="h-10 w-45 object-contain" />
          </div>
          <div className="flex items-center gap-1">
            <LanguageSelector />
            <NotificationBell />
            <ThemeToggle iconOnly />
            <ProfileMenu />
          </div>
        </header>

        {/* marketplace home banner */}
        {location.pathname === '/dropshipper/store' && (
          <div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img
                src="/homey.png?v=2"
                alt="Home banner"
                className="aspect-[720/265] w-full object-cover object-center"
              />
            </div>
          </div>
        )}

        <main className="mx-auto max-w-7xl p-4 lg:p-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
