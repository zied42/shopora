import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiErrorMessage, apiPostRaw } from '../lib/api';
import { Button, Card, Spinner } from '../components/ui';

type Result = { success: boolean; data?: { status: 'paid' | 'pending' | 'failed' | 'expired' }; error?: string };

export default function PaymentResult() {
  const [params] = useSearchParams();
  const orderId = Number(params.get('order_id'));
  const [status, setStatus] = useState<'checking' | 'paid' | 'pending' | 'failed' | 'expired' | 'error'>('checking');
  const [error, setError] = useState('');

  const verify = async () => {
    if (!Number.isInteger(orderId) || orderId < 1) { setStatus('error'); setError('Missing order reference.'); return; }
    setStatus('checking');
    try {
      const result = await apiPostRaw<Result>('/payments/flouci/verify', { order_id: orderId });
      setStatus(result.data?.status ?? 'pending');
    } catch (e) {
      setStatus('error');
      setError(apiErrorMessage(e));
    }
  };

  useEffect(() => { void verify(); }, [orderId]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4">
      <Card className="w-full p-7 text-center">
        {status === 'checking' ? <Spinner /> : null}
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          {status === 'paid' ? 'Payment verified' : status === 'checking' ? 'Checking payment' : status === 'pending' ? 'Payment still pending' : status === 'expired' ? 'Payment session expired' : status === 'failed' ? 'Payment not completed' : 'Could not verify payment'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {status === 'paid' ? 'Flouci confirmed the payment and your order is marked paid.' : status === 'pending' ? 'The provider has not confirmed a successful payment yet. Your order remains unpaid.' : status === 'checking' ? 'We are asking Flouci to confirm the transaction.' : error || 'Your order remains unpaid until the provider confirms the transaction.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {status !== 'paid' && status !== 'checking' && <Button onClick={() => void verify()}>Check again</Button>}
          <Link className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" to="/orders">Back to orders</Link>
        </div>
      </Card>
    </main>
  );
}
