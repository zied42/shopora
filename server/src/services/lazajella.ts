const LZ_BASE = process.env.LAZAJELLA_API_BASE ?? 'http://colis.lazajella.tn/api/api/StColis';

export interface LzAuth {
  uilisateur: string;
  pass: string;
}

export interface LzColis {
  reference?: string;
  client?: string;
  adresse?: string;
  code_postal?: string;
  nb_pieces?: number;
  prix?: number;
  tel1?: string;
  tel2?: string;
  designation?: string;
  commentaire?: string;
  type?: string;
  echange?: number;
  gouvernorat?: string;
  ville?: string;
}

export interface LzResult {
  ok: boolean;
  status: number;
  message?: string;
  data?: unknown;
}

export function parseLzCredentials(apiKey: string): LzAuth {
  const idx = apiKey.indexOf(':');
  if (idx > 0) return { uilisateur: apiKey.slice(0, idx).trim(), pass: apiKey.slice(idx + 1).trim() };
  return { uilisateur: 'clt_liv_15360', pass: apiKey.trim() };
}

function stripEmpty(colis: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(colis)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out;
}

async function lzPost(auth: LzAuth, action: string, body: Record<string, unknown>): Promise<LzResult> {
  const url = `${LZ_BASE}/${action}`;
  const payload = { Uilisateur: auth.uilisateur, Pass: auth.pass, ...stripEmpty(body) };
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, message };
  }
  const text = await res.text().catch(() => '');
  let data: unknown = text;
  let parsed: Record<string, unknown> | null = null;
  try { parsed = JSON.parse(text); data = parsed; } catch { /* keep raw text */ }
  if (res.ok) {
    return { ok: true, status: res.status, data };
  }
  if (typeof parsed?.Message === 'string') {
    return { ok: false, status: res.status, message: String(parsed.Message), data };
  }
  return { ok: false, status: res.status, message: text || res.statusText, data };
}

export async function lzCreateColis(auth: LzAuth, colis: LzColis): Promise<LzResult> {
  return lzPost(auth, 'AjouterVColis', colis as Record<string, unknown>);
}

export async function lzCreateColisBasic(auth: LzAuth, colis: LzColis): Promise<LzResult> {
  return lzPost(auth, 'AjouterColis', colis as Record<string, unknown>);
}

export async function lzGetColis(auth: LzAuth, codeBar: string): Promise<LzResult> {
  return lzPost(auth, 'getColis', { codeBar });
}

export async function lzListColis(auth: LzAuth, codeBar: string): Promise<LzResult> {
  return lzPost(auth, 'ListColis', { codeBar });
}

export async function lzCancelColis(auth: LzAuth, codeBar: string): Promise<LzResult> {
  return lzPost(auth, 'supprimerColis', { codeBar });
}

export async function lzModifyColis(auth: LzAuth, colis: LzColis & { codeBar: string }): Promise<LzResult> {
  return lzPost(auth, 'modifierColis', colis as unknown as Record<string, unknown>);
}

export async function lzPickup(auth: LzAuth): Promise<LzResult> {
  return lzPost(auth, 'demanderEnlevement', {});
}

export async function lzDownload(auth: LzAuth): Promise<LzResult> {
  return lzPost(auth, 'download', {});
}

export async function lzCities(auth: LzAuth): Promise<LzResult> {
  return lzPost(auth, 'listVilles', {});
}