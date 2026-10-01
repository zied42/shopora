import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, apiGet, apiPost, apiUpload, apiUploadVideo, dateFmt, Order, ReturnRequest } from '../../lib/api';
import { Badge, Button, ButtonGhost, Card, EmptyState, Field, Select, Spinner, Textarea, orderStatusTone } from '../../components/ui';

const STATUS_TONE: Record<string, 'amber' | 'green' | 'red' | 'blue'> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  processed: 'blue',
};

export default function ReturnsTab({ type, orderFilter, exchangeCreateTo }: { type: 'retour' | 'echange'; orderFilter?: (o: Order) => boolean; exchangeCreateTo?: string }) {
  const navigate = useNavigate();
  const [list, setList] = useState<ReturnRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([apiGet<ReturnRequest[]>('/returns'), apiGet<Order[]>('/orders')])
      .then(([r, o]) => {
        setList(r);
        setOrders(o);
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  useEffect(() => {
    const id = setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, []);

  const filtered = list.filter((r) => r.type === type);
  const returned = type === 'retour' ? orders.filter((o) => o.status === 'retour' && (!orderFilter || orderFilter(o))) : [];
  const requestableOrders = (type === 'echange' ? orders.filter((o) => o.status === 'delivered') : orders).filter((o) => !orderFilter || orderFilter(o));

  const submit = async () => {
    if (!orderId) {
      alert('Pick a commande');
      return;
    }
    if (reason.trim().length < 3) {
      alert('Please describe the reason');
      return;
    }
    setSaving(true);
    try {
      await apiPost('/returns', { order_id: Number(orderId), type, reason, attachments });
      setOpen(false);
      setReason('');
      setOrderId('');
      setAttachments([]);
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await apiUpload(file);
      setAttachments((a) => [...a, url]);
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await apiUploadVideo(file);
      setAttachments((a) => [...a, url]);
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {type === 'retour' ? 'Request a refund or return for a delivered order.' : 'Exchange one order for another product.'}
        </p>
        <Button onClick={() => setOpen(true)}>{type === 'retour' ? 'Request a return' : 'Request an exchange'}</Button>
      </div>

      {open && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {type === 'retour' ? '↩' : '⇄'}
            </span>
            <p className="text-sm font-bold text-slate-900">{type === 'retour' ? 'New return request' : 'New exchange request'}</p>
          </div>
          <div className="space-y-3 p-5">
            <Field label="Order">
              <Select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                <option value="">Select an order...</option>
                {requestableOrders.map((o) => (
                  <option key={o.id} value={o.id}>{o.order_number} · {o.customer_name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Reason"><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why do you want to return / exchange?" /></Field>
            <Field label="Attachments (image or video)">
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                  📷 Add photo
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploading} />
                </label>
                <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                  🎥 Add video
                  <input type="file" accept="video/*" className="hidden" onChange={handleVideoChange} disabled={uploading} />
                </label>
                {uploading && <Spinner />}
              </div>
              {attachments.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {attachments.map((url, i) => {
                    const isVideo = /\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(url) || url.includes('/uploads/vid-');
                    return (
                      <div key={i} className="relative overflow-hidden rounded-xl border border-slate-200">
                        {isVideo ? (
                          <video src={url} controls className="h-32 w-full object-cover" />
                        ) : (
                          <img src={url} alt="" className="h-32 w-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => setAttachments((a) => a.filter((_, x) => x !== i))}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-xs text-white hover:bg-slate-900"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Field>
            <div className="flex justify-end gap-2">
              <ButtonGhost onClick={() => setOpen(false)}>Cancel</ButtonGhost>
              <Button onClick={submit} disabled={saving}>{saving ? 'Sending...' : 'Submit request'}</Button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 && returned.length === 0 ? (
        <Card><EmptyState icon="🔁" title={`No ${type} requests`} hint="Requests you submit will appear here with their status." /></Card>
      ) : (
        <div className="space-y-3">
          {returned.map((o) => (
            <Card key={`ret-${o.id}`} className="overflow-hidden rounded-2xl border-purple-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100 bg-purple-50/60 px-5 py-3.5">
                <p className="text-sm font-bold text-slate-900">↩️ {o.order_number}</p>
                <Badge tone={orderStatusTone(o.status)}>{o.status}</Badge>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm font-semibold text-slate-800">{o.customer_name}</p>
                <p className="mt-0.5 text-xs text-slate-500">The parcel was scanned back at the warehouse — processed as a retour.</p>
              </div>
            </Card>
          ))}
          {filtered.map((r) => (
            <Card key={r.id} className="overflow-hidden rounded-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{r.order_number}</p>
                  <span className="text-xs text-slate-400">{dateFmt(r.created_at)}</span>
                </div>
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-600">{r.reason}</p>
                  {(r.attachments?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.attachments.map((url, i) => {
                        const isVideo = /\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(url) || url.includes('/uploads/vid-');
                        return isVideo ? (
                          <video key={i} src={url} controls className="h-20 w-28 rounded-xl border border-slate-200 object-cover" />
                        ) : (
                          <img key={i} src={url} alt="" className="h-20 w-28 rounded-xl border border-slate-200 object-cover" />
                        );
                      })}
                    </div>
                  )}
                  {r.reply && (
                    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">🗨 Admin reply: </span>
                      {r.reply}
                    </p>
                  )}
                </div>
                {type === 'echange' && r.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => navigate(exchangeCreateTo ?? '/dropshipper/commandes/echange/create')}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
                  >
                    Create échange commande
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}