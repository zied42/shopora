import { useEffect, useState } from 'react';
import { apiErrorMessage, apiGet, apiPost } from '../../lib/api';
import { PageHeader, Card, Badge, Spinner } from '../../components/ui';

interface IntegrationItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  category: string;
}

interface DeliveryCompany {
  id: string;
  name: string;
  logo: string;
  description: string;
  active: boolean;
  has_key: boolean;
}

interface SettingsMap {
  [companyId: string]: { enabled: boolean; has_key: boolean };
}

const DELIVERY_COMPANIES_META: Array<Omit<DeliveryCompany, 'active' | 'has_key'>> = [
  { id: 'navex', name: 'Navex', logo: '/navex.jpg', description: 'Fast express delivery across all 24 governorates' },
  { id: 'first-delivery', name: 'First Delivery', logo: '/first_delivery.png', description: 'Reliable standard delivery with tracking support' },
  { id: 'jetpack', name: 'Jetpack', logo: '/jetpack.jpg', description: 'Premium same-day delivery for major cities' },
  { id: 'intigo', name: 'Intigo', logo: '/intigo.png', description: 'Economical bulk shipping for high-volume orders' },
  { id: 'kamatcho', name: 'Kamatcho', logo: '/kamatcho.png', description: 'Local last-mile delivery specialist' },
  { id: 'lazajella', name: 'LaZajella', logo: '/zajella.png', description: 'Dedicated nationwide delivery partner' },
];

const INTEGRATIONS: IntegrationItem[] = [
  { id: 'sms-tunisie', name: 'SMS Tunisie', icon: '📱', description: 'SMS notifications for order status updates to customers', status: 'disconnected', category: 'Notifications' },
  { id: 'whatsapp-business', name: 'WhatsApp Business', icon: '💬', description: 'Automated WhatsApp messages for delivery confirmations', status: 'disconnected', category: 'Notifications' },
  { id: 'google-sheets', name: 'Google Sheets', icon: '📊', description: 'Export orders and financial reports to Google Sheets', status: 'disconnected', category: 'Data Export' },
  { id: 'zapier', name: 'Zapier', icon: '⚡', description: 'Connect to 5000+ apps with automated workflows', status: 'disconnected', category: 'Automation' },
];

const STATUS_META: Record<string, { tone: 'green' | 'amber' | 'red' | 'slate'; label: string }> = {
  connected: { tone: 'green', label: 'Connected' },
  disconnected: { tone: 'slate' as const, label: 'Disconnected' },
  error: { tone: 'red', label: 'Error' },
};

const CATEGORIES = [...new Set(INTEGRATIONS.map((i) => i.category))];

interface FlouciState {
  enabled: boolean;
  has_key: boolean;
}

export default function AdminIntegration() {
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [flouci, setFlouci] = useState<FlouciState>({ enabled: false, has_key: false });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [filter, setFilter] = useState('All');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [companyKeyValue, setCompanyKeyValue] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [editFlouciKeys, setEditFlouciKeys] = useState(false);
  const [flouciPublic, setFlouciPublic] = useState('');
  const [flouciPrivate, setFlouciPrivate] = useState('');

  useEffect(() => {
    apiGet<SettingsMap>('/integration/settings')
      .then((data) => {
        setCompanies(
          DELIVERY_COMPANIES_META.map((c) => ({
            ...c,
            active: data[c.id]?.enabled ?? false,
            has_key: data[c.id]?.has_key ?? false,
          }))
        );
        setFlouci({ enabled: data.flouci?.enabled ?? false, has_key: data.flouci?.has_key ?? false });
        setSettingsLoaded(true);
      })
      .catch(() => {
        setCompanies(DELIVERY_COMPANIES_META.map((c) => ({ ...c, active: false, has_key: false })));
        setFlouci({ enabled: false, has_key: false });
        setSettingsLoaded(true);
      });
  }, []);

  const filtered = filter === 'All' ? integrations : integrations.filter((i) => i.category === filter);

  const toggleConnection = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: i.status === 'connected' ? 'disconnected' : 'connected' }
          : i
      )
    );
  };

  const toggleDeliveryCompany = async (id: string) => {
    const company = companies.find((c) => c.id === id);
    if (!company) return;
    const newEnabled = !company.active;
    setSaving(id);
    try {
      await apiPost('/integration/settings', { company_id: id, enabled: newEnabled });
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, active: newEnabled } : c))
      );
    } catch (e) {
      console.warn(apiErrorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  const saveCompanyKey = async (id: string) => {
    setSaving(id);
    try {
      await apiPost('/integration/settings', { company_id: id, api_key: companyKeyValue });
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, has_key: true, active: true } : c))
      );
      setEditingCompany(null);
      setCompanyKeyValue('');
    } catch (e) {
      console.warn(apiErrorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  const toggleFlouci = async () => {
    setSaving('flouci');
    try {
      const next = !flouci.enabled;
      await apiPost('/integration/settings', { company_id: 'flouci', enabled: next });
      setFlouci((prev) => ({ ...prev, enabled: next }));
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  const saveFlouciKeys = async () => {
    if (!flouciPublic.trim() || !flouciPrivate.trim()) return;
    setSaving('flouci-keys');
    try {
      await apiPost('/integration/settings', {
        company_id: 'flouci',
        api_key: `${flouciPublic.trim()}:${flouciPrivate.trim()}`,
        enabled: true,
      });
      setFlouci({ enabled: true, has_key: true });
      setEditFlouciKeys(false);
      setFlouciPublic('');
      setFlouciPrivate('');
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Integration"
        subtitle="Manage third-party services, API keys, and webhooks"
      />

      <div className="space-y-6">
        {/* Payment Gateways */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payment Gateways</h3>
              <p className="mt-1 text-xs text-slate-500">Connect online payment gateways. Dropshippers link their account here so you can pay them.</p>
            </div>
            <Badge tone={flouci.enabled && flouci.has_key ? 'green' : 'slate'}>
              {flouci.enabled && flouci.has_key ? 'Connected' : 'Not connected'}
            </Badge>
          </div>

          {!settingsLoaded ? (
            <div className="flex items-center justify-center py-8"><Spinner /></div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div
                className={`relative rounded-xl border-2 p-4 transition ${
                  flouci.enabled && flouci.has_key
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img src="/flouci.png" alt="Flouci" className="h-8 w-8 rounded-lg bg-white object-contain ring-1 ring-slate-200" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Flouci</h4>
                      <p className="text-[11px] text-slate-500 leading-snug">Online payment gateway for payouts to dropshipper wallets.</p>
                    </div>
                  </div>
                  {flouci.has_key && <Badge tone="green">Keys set</Badge>}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving === 'flouci'}
                    onClick={toggleFlouci}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                      flouci.enabled
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {saving === 'flouci' ? '...' : flouci.enabled ? '✓ Active' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditFlouciKeys((v) => !v);
                      setFlouciPublic('');
                      setFlouciPrivate('');
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {editFlouciKeys ? '✕ Close' : '⚙️ API Keys'}
                  </button>
                </div>

                {editFlouciKeys && (
                  <div className="mt-3 border-t border-slate-200 pt-3 space-y-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Public Token</label>
                      <input
                        type="password"
                        value={flouciPublic}
                        onChange={(e) => setFlouciPublic(e.target.value)}
                        placeholder="e.g. f3fbf84b-... (developers / prod)"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-700 outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Private Token</label>
                      <input
                        type="password"
                        value={flouciPrivate}
                        onChange={(e) => setFlouciPrivate(e.target.value)}
                        placeholder="Secret — used only on the server"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-700 outline-none focus:border-brand-500"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!flouciPublic.trim() || !flouciPrivate.trim() || saving === 'flouci-keys'}
                      onClick={saveFlouciKeys}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {saving === 'flouci-keys' ? '...' : 'Save keys'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
        {/* Delivery Companies */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Delivery Companies</h3>
              <p className="mt-1 text-xs text-slate-500">Enable and configure delivery partners. Toggle a company to make it available for order fulfillment.</p>
            </div>
            <Badge tone="green">{companies.filter((c) => c.active).length} active</Badge>
          </div>

          {!settingsLoaded ? (
            <div className="flex items-center justify-center py-8"><Spinner /></div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className={`relative rounded-xl border-2 p-4 transition ${
                    company.active
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img src={company.logo} alt={company.name} className="h-8 w-8 rounded-lg object-cover" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{company.name}</h4>
                        <p className="text-[11px] text-slate-500 leading-snug">{company.description}</p>
                      </div>
                    </div>
                    {company.has_key && <Badge tone="green">Key set</Badge>}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={saving === company.id}
                      onClick={() => toggleDeliveryCompany(company.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                        company.active
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {saving === company.id ? '...' : company.active ? '✓ Active' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCompany(editingCompany === company.id ? null : company.id);
                        setCompanyKeyValue('');
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      {editingCompany === company.id ? '✕ Close' : '⚙️ API Key'}
                    </button>
                  </div>

                  {editingCompany === company.id && (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bearer Token</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="password"
                          value={companyKeyValue}
                          onChange={(e) => setCompanyKeyValue(e.target.value)}
                          placeholder="Paste your First Delivery API token"
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-700 outline-none focus:border-brand-500"
                        />
                        <button
                          type="button"
                          disabled={!companyKeyValue || saving === company.id}
                          onClick={() => saveCompanyKey(company.id)}
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                          {saving === company.id ? '...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* API Key */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900">Platform API Key</h3>
          <p className="mt-1 text-xs text-slate-500">Use this key to authenticate requests to the D42 API from external services.</p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey || 'd42_sk_live_xxxxxxxxxxxxxxxxxxxxxxxx'}
              onChange={(e) => setApiKey(e.target.value)}
              readOnly={!showKey}
              className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 outline-none focus:border-brand-500"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              {showKey ? '🙈 Hide' : '👁️ Show'}
            </button>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(apiKey || 'd42_sk_live_xxxxxxxxxxxxxxxxxxxxxxxx'); }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              📋 Copy
            </button>
          </div>
        </Card>

        {/* Webhook URL */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900">Webhook Endpoint</h3>
          <p className="mt-1 text-xs text-slate-500">POST requests will be sent to this URL when events occur (order created, shipped, delivered, etc.).</p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="https://your-server.com/webhook"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-500"
            />
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
            >
              Save
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['order.created', 'order.shipped', 'order.delivered', 'order.cancelled', 'order.returned', 'product.approved'].map((evt) => (
              <span key={evt} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {evt}
              </span>
            ))}
          </div>
        </Card>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {['All', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === cat
                  ? 'bg-brand-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Integration Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const meta = STATUS_META[item.status];
            return (
              <Card key={item.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{item.category}</span>
                    </div>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <p className="mt-3 text-xs text-slate-500 leading-relaxed">{item.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => toggleConnection(item.id)}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                      item.status === 'connected'
                        ? 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                  >
                    {item.status === 'connected' ? 'Disconnect' : 'Connect'}
                  </button>
                  {item.status === 'connected' && (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      ⚙️ Settings
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
