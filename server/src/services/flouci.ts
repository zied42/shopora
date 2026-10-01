const FLOUCI_BASE = 'https://developers.flouci.com/api/v2';

export interface FlouciGenerateInput {
  amount: number; // TND (converted to millimes server-side)
  developerTrackingId: string;
  acceptCard?: boolean;
  successLink: string;
  failLink: string;
  webhook?: string;
  sessionTimeoutSecs?: number;
  imageUrl?: string;
}

export interface FlouciGenerateResult {
  success: boolean;
  payment_id: string;
  link: string;
  developer_tracking_id: string;
}

export interface FlouciVerifyResult {
  success: boolean;
  status: 'SUCCESS' | 'PENDING' | 'EXPIRED' | 'FAILURE' | 'PREAUTH_SUCCESS' | 'SYSTEM_FAILURE' | (string & {});
  amount: number;
  type?: string;
  developer_tracking_id?: string | null;
  settlement_status?: string | null;
}

function flouciAuth(token?: string): { Authorization?: string; 'Content-Type': string } {
  const headers: { Authorization?: string; 'Content-Type': string } = { 'Content-Type': 'application/json' };
  if (token && token.includes(':')) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function flouciFetch<T>(token: string | undefined, path: string, init?: RequestInit): Promise<T> {
  const url = `${FLOUCI_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...flouciAuth(token),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text().catch(() => '');
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = {};
  }
  const result = (json.result ?? {}) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof result.message === 'string' ? result.message : typeof json.message === 'string' ? json.message : res.statusText;
    throw new Error(`Flouci API error ${res.status}: ${message || 'Unknown error'}`);
  }
  return json as unknown as T;
}

export async function flouciGeneratePayment(token: string, input: FlouciGenerateInput): Promise<FlouciGenerateResult> {
  const body: Record<string, unknown> = {
    amount: String(Math.round(input.amount * 1000)),
    developer_tracking_id: input.developerTrackingId,
    accept_card: input.acceptCard ?? true,
    success_link: input.successLink,
    fail_link: input.failLink,
  };
  if (input.webhook) body.webhook = input.webhook;
  if (input.sessionTimeoutSecs != null) body.session_timeout_secs = input.sessionTimeoutSecs;
  if (input.imageUrl) body.image_url = input.imageUrl;

  const payload = await flouciFetch<{ result: Partial<FlouciGenerateResult> }>(token, '/generate_payment', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const r = payload.result ?? {};
  if (r.success !== true || !r.payment_id) {
    throw new Error('Flouci did not return a payment_id');
  }
  return {
    success: true,
    payment_id: r.payment_id,
    link: r.link ?? '',
    developer_tracking_id: String(r.developer_tracking_id ?? ''),
  };
}

export async function flouciVerifyPayment(token: string, paymentId: string): Promise<FlouciVerifyResult> {
  const payload = await flouciFetch<{ success: boolean; result: Partial<FlouciVerifyResult>; status_code?: number }>(
    token,
    `/verify_payment/${encodeURIComponent(paymentId)}`,
    { method: 'GET' }
  );
  const r = payload.result ?? {};
  return {
    success: payload.success === true,
    status: r.status ?? 'PENDING',
    amount: Number(r.amount ?? 0),
    type: r.type,
    developer_tracking_id: r.developer_tracking_id ?? null,
    settlement_status: r.settlement_status ?? null,
  };
}