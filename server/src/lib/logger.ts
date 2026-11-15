import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const MAX_LOG_BYTES = 10 * 1024 * 1024;
const MAX_LOG_BACKUPS = 3;

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function stamp() {
  return new Date().toISOString();
}

function appendLog(file: string, line: string) {
  ensureDir();
  const current = path.join(LOG_DIR, file);
  try {
    if (fs.statSync(current).size + Buffer.byteLength(line) > MAX_LOG_BYTES) {
      if (fs.existsSync(`${current}.${MAX_LOG_BACKUPS}`)) fs.unlinkSync(`${current}.${MAX_LOG_BACKUPS}`);
      for (let n = MAX_LOG_BACKUPS - 1; n >= 1; n--) {
        const from = `${current}.${n}`;
        const to = `${current}.${n + 1}`;
        if (fs.existsSync(from)) fs.renameSync(from, to);
      }
      fs.renameSync(current, `${current}.1`);
    }
  } catch { /* logging must not fail the request */ }
  fs.appendFileSync(current, line, 'utf-8');
}

const PRIVATE_FIELDS = /^(client|clientname|nom|name|adresse|address|tel|telephone|phone|commentaire|comment|api_key|token|password|secret)$/i;
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, PRIVATE_FIELDS.test(key) ? '[REDACTED]' : redact(item)]));
}

export function logFd(action: string, data: Record<string, unknown>) {
  const safe = redact(data);
  const line = JSON.stringify({ t: stamp(), action, ...safe as Record<string, unknown> });
  appendLog('fd.log', line + '\n');
  console.log(`[fd] ${action}`, JSON.stringify(safe, null, 0));
}

export function logLz(action: string, data: Record<string, unknown>) {
  const safe = redact(data);
  const line = JSON.stringify({ t: stamp(), action, ...safe as Record<string, unknown> });
  appendLog('lz.log', line + '\n');
  console.log(`[lz] ${action}`, JSON.stringify(safe, null, 0));
}
