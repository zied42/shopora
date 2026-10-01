const FD_BASE = 'https://www.firstdeliverygroup.com/api/v2';

export interface FdClient {
  nom: string;
  locality_id?: number;
  gouvernerat: string;
  ville: string;
  adresse: string;
  telephone: string;
  telephone2?: string;
}

export interface FdProduct {
  prix: number;
  designation: string;
  nombreArticle: number;
  commentaire?: string;
  article?: string;
  nombreEchange?: number;
  estFragile?: 'oui' | 'non';
  ouvrirColis?: 'oui' | 'non';
}

export interface FdCreateOrderInput {
  Client: FdClient;
  Produit: FdProduct;
}

export interface FdOrderResponse {
  status: number;
  isError: boolean;
  message: string;
  result?: {
    barCode: string;
    [key: string]: unknown;
  };
}

export interface FdLocality {
  locality_id: number;
  locality_name: string;
  delegation_name: string;
  governorate_name: string;
}

export interface FdFilterInput {
  barCode?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  state?: number;
  pagination?: {
    pageNumber: number;
    limit: number;
  };
}

export interface FdOrderState {
  barCode: string;
  state: number;
  [key: string]: unknown;
}

async function fdFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const url = `${FD_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`First Delivery API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fdCreateOrder(token: string, input: FdCreateOrderInput): Promise<FdOrderResponse> {
  return fdFetch<FdOrderResponse>(token, '/create', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fdBulkCreate(token: string, inputs: FdCreateOrderInput[]): Promise<FdOrderResponse> {
  return fdFetch<FdOrderResponse>(token, '/bulk-create', {
    method: 'POST',
    body: JSON.stringify(inputs),
  });
}

export async function fdGetLocalities(token: string): Promise<{ status: number; isError: boolean; message: string; result: FdLocality[] }> {
  return fdFetch(token, '/localities', { method: 'GET' });
}

export async function fdGetOrderState(token: string, barCode: string): Promise<FdOrderState> {
  return fdFetch<FdOrderState>(token, '/etat', {
    method: 'POST',
    body: JSON.stringify({ barCode }),
  });
}

export async function fdFilterOrders(token: string, input: FdFilterInput): Promise<FdOrderResponse> {
  return fdFetch<FdOrderResponse>(token, '/filter', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fdCancelOrders(token: string, barCodes: string[]): Promise<FdOrderResponse> {
  return fdFetch<FdOrderResponse>(token, '/cancel-orders', {
    method: 'POST',
    body: JSON.stringify({ barCodes }),
  });
}

export async function fdCreatePickup(token: string, barCodes: string[]): Promise<FdOrderResponse> {
  return fdFetch<FdOrderResponse>(token, '/pickup', {
    method: 'POST',
    body: JSON.stringify({ barCodes }),
  });
}

export async function fdRequestPrintPickup(token: string, pickupId: string): Promise<FdOrderResponse> {
  return fdFetch<FdOrderResponse>(token, `/request-print/${pickupId}`, {
    method: 'POST',
  });
}
