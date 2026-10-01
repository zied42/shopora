import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiDelete, apiErrorMessage, apiGet, apiPost, timeFmt } from '../../lib/api';
import { Badge, Button, ButtonGhost, Card, EmptyState, Input, Modal, PageHeader, Spinner } from '../../components/ui';

type ApiKeyEntry = {
  id: number;
  name: string;
  prefix: string;
  status: 'active' | 'revoked';
  last_used_at: string | null;
  created_at: string;
};

export default function ApiKeys() {
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ApiKeyEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      setKeys(await apiGet<ApiKeyEntry[]>('/keys'));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await apiPost<{ plaintext: string; key: ApiKeyEntry }>('/keys', { name: name.trim() || 'Default key' });
      setGenerateOpen(false);
      setName('');
      setPlaintext(res.plaintext);
      setCopied(false);
      await load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const copyKey = async () => {
    if (!plaintext) return;
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = plaintext;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
    }
  };

  const revoke = async (id: number) => {
    if (!window.confirm('Revoke this API key? Existing integrations using it will stop working.')) return;
    try {
      await apiDelete(`/keys/${id}`);
      await load();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="API"
        subtitle="Generate and manage API keys used to connect your store to our public API"
        actions={
          <>
            <ButtonGhost onClick={() => navigate('/dropshipper/api/docs')}>📘 View API Documentation</ButtonGhost>
            <Button onClick={() => setGenerateOpen(true)}>＋ Generate API Key</Button>
          </>
        }
      />

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h6 className="text-sm font-bold text-slate-800">API Keys</h6>
          <span className="text-xs text-slate-500">Send it as <code className="rounded bg-slate-200/70 px-1.5 py-0.5 text-xs">Authorization: Bearer YOUR_API_KEY</code></span>
        </div>

        {keys === null ? (
          <Spinner />
        ) : keys.length === 0 ? (
          <EmptyState icon="🔑" title="No API keys" hint="Generate a key to connect your store to our API." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Key prefix</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5">Created</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-800">{k.name}</td>
                    <td className="px-3 py-3">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{k.prefix}…</code>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Badge tone={k.status === 'active' ? 'green' : 'red'}>{k.status === 'active' ? 'Active' : 'Revoked'}</Badge>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{timeFmt(k.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {k.status === 'active' ? (
                        <ButtonGhost className="!px-2.5 !py-1 !text-xs !text-rose-600 hover:!bg-rose-50" onClick={() => revoke(k.id)}>
                          Revoke
                        </ButtonGhost>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={generateOpen} onClose={() => setGenerateOpen(false)} title="Generate API Key">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Name this key to remember where it is used. The secret is <span className="font-semibold text-rose-600">shown only once</span> — copy it now.
          </p>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Key name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Shopify store" autoFocus />
          </div>
          <div className="flex justify-end gap-2">
            <ButtonGhost onClick={() => setGenerateOpen(false)}>Cancel</ButtonGhost>
            <Button disabled={busy} onClick={() => void generate()}>{busy ? 'Generating…' : 'Generate'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={plaintext !== null} onClose={() => setPlaintext(null)} title="API key created — copy it now" wide>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This is the only time the full key is shown. We store only a hash, so it cannot be recovered later.
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-900 p-4">
            <code className="min-w-0 flex-1 break-all font-mono text-sm text-emerald-300">{plaintext}</code>
            <div className="flex items-center gap-2">
              <Button className="!px-3 !py-1.5 !text-xs" onClick={() => void copyKey()}>{copied ? '✓ Copied!' : 'Copy'}</Button>
              <ButtonGhost className="!px-3 !py-1.5 !text-xs" onClick={() => setPlaintext(null)}>Done</ButtonGhost>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Try it: <code className="rounded bg-slate-100 px-1.5 py-0.5">curl -H "Authorization: Bearer {plaintext?.slice(0, 18)}…" {window.location.origin}/api/v1/me</code>
          </p>
        </div>
      </Modal>
    </div>
  );
}