import { useState } from 'react';
import { Badge, Button, ButtonGhost, Card, Field, Input, Modal, PageHeader, Select } from '../../components/ui';

const PLATFORMS = ['Shopify', 'WooCommerce', 'PrestaShop', 'Magento', 'Wix', 'Custom'];

type Integration = {
  id: number;
  name: string;
  desc: string;
  platform: string;
  sync: 'Synced' | 'Not synced' | 'Syncing…';
  lastActivity: string | null;
  updates: number;
  status: 'active' | 'paused';
  icon: string;
};

const ICONS = ['🔌', '🛒', '📦', '🌐', '🤖'];

let uid = 100;

function fmtName(platform: string, i: number): string {
  const firstLetter = platform.charAt(0).toUpperCase();
  const rest = platform.slice(1).toLowerCase().replace(/[^a-z]/g, '');
  return `${firstLetter}${rest} ${i}`;
}

export default function Apps() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState(PLATFORMS[0]);

  const add = () => {
    const n = name.trim() || fmtName(platform, integrations.length + 1);
    const icon = ICONS[integrations.length % ICONS.length];
    setIntegrations((prev) => [
      ...prev,
      { id: ++uid, name: n, desc: `Connected store on ${platform}`, platform, sync: 'Not synced', lastActivity: null, updates: 0, status: 'active', icon },
    ]);
    setAddOpen(false);
    setName('');
  };

  const toggle = (id: number) =>
    setIntegrations((prev) => prev.map((it) => (it.id === id ? { ...it, status: it.status === 'active' ? 'paused' : 'active' } : it)));

  const remove = (id: number) => setIntegrations((prev) => prev.filter((it) => it.id !== id));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Apps"
        subtitle="Connect third-party apps and services to your store"
        actions={
          <Button onClick={() => setAddOpen(true)}>＋ Add New Integration</Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h6 className="text-sm font-bold text-slate-800">Integrations</h6>
          <Button className="!px-3 !py-1.5 !text-xs" onClick={() => setAddOpen(true)}>
            ＋ Add New Integration
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="px-4 py-2.5">Details</th>
                <th className="px-3 py-2.5 text-center">Platform</th>
                <th className="px-3 py-2.5 text-center">Sync Status</th>
                <th className="px-3 py-2.5 text-center">Last Activity</th>
                <th className="px-3 py-2.5 text-center">Status updates</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-right">Toolbar</th>
              </tr>
            </thead>
            <tbody>
              {integrations.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">🔌</div>
                      <p className="text-sm font-semibold text-slate-700">No integrations yet</p>
                      <p className="text-xs text-slate-400">Connect your first store to start syncing products and orders.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                integrations.map((it) => (
                  <tr key={it.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base">{it.icon}</span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{it.name}</p>
                          <p className="truncate text-xs text-slate-500">{it.desc}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-slate-700">{it.platform}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge tone={it.sync === 'Synced' ? 'green' : it.sync === 'Syncing…' ? 'blue' : 'amber'}>{it.sync}</Badge>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600">{it.lastActivity ?? '—'}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{it.updates}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge tone={it.status === 'active' ? 'green' : 'slate'}>{it.status === 'active' ? 'Active' : 'Paused'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <ButtonGhost className="!px-2.5 !py-1 !text-xs" onClick={() => toggle(it.id)}>
                          {it.status === 'active' ? 'Pause' : 'Resume'}
                        </ButtonGhost>
                        <ButtonGhost className="!px-2.5 !py-1 !text-xs !text-rose-600 hover:!bg-rose-50" onClick={() => remove(it.id)}>
                          Remove
                        </ButtonGhost>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none" defaultValue="10">
              {[5, 10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <ButtonGhost className="!px-3 !py-1 !text-xs" disabled>
              Previous
            </ButtonGhost>
            <ButtonGhost className="!px-3 !py-1 !text-xs" disabled>
              Next
            </ButtonGhost>
          </div>
        </div>
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Integration">
        <div className="space-y-4">
          <Field label="Integration name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My store" />
          </Field>
          <Field label="Platform">
            <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <ButtonGhost onClick={() => setAddOpen(false)}>Cancel</ButtonGhost>
            <Button onClick={add}>Add integration</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}