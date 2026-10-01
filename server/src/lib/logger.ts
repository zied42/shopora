import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function stamp() {
  return new Date().toISOString();
}

export function logFd(action: string, data: Record<string, unknown>) {
  ensureDir();
  const line = JSON.stringify({ t: stamp(), action, ...data });
  fs.appendFileSync(path.join(LOG_DIR, 'fd.log'), line + '\n', 'utf-8');
  console.log(`[fd] ${action}`, JSON.stringify(data, null, 0));
}

export function logLz(action: string, data: Record<string, unknown>) {
  ensureDir();
  const line = JSON.stringify({ t: stamp(), action, ...data });
  fs.appendFileSync(path.join(LOG_DIR, 'lz.log'), line + '\n', 'utf-8');
  console.log(`[lz] ${action}`, JSON.stringify(data, null, 0));
}
