import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
dotenv.config();

const num = (v: string | undefined, d: number) => (v ? Number(v) : d);
const str = (v: string | undefined, d: string) => v ?? d;

export const env = {
  PORT: num(process.env.PORT, 5000),
  JWT_SECRET: str(process.env.JWT_SECRET, 'dev_secret_change_me'),
  DB_DRIVER: str(process.env.DB_DRIVER, 'memory').toLowerCase(),
  DB_HOST: str(process.env.DB_HOST, 'localhost'),
  DB_PORT: num(process.env.DB_PORT, 3306),
  DB_USER: str(process.env.DB_USER, 'root'),
  DB_PASSWORD: str(process.env.DB_PASSWORD, 'root'),
  DB_NAME: str(process.env.DB_NAME, 'ecommerce42'),
  DB_SSL: /^(1|true|yes|on)$/i.test(str(process.env.DB_SSL, '0')),
  API_BASE_URL: str(process.env.API_BASE_URL, 'http://localhost:5000'),
  WEB_BASE_URL: str(process.env.WEB_BASE_URL, 'http://localhost:5173'),
};

function tidbCa(): string | undefined {
  try {
    return readFileSync(resolve(process.cwd(), 'certs', 'isrg-root-x1.pem'), 'utf8');
  } catch {
    return undefined;
  }
}

export function mysqlSsl(host: string = env.DB_HOST): { ca?: string; rejectUnauthorized: boolean } | undefined {
  const isTiDb = /\.tidbcloud\.com$/i.test(host);
  if (!env.DB_SSL && !isTiDb) return undefined;
  const ca = isTiDb ? tidbCa() : undefined;
  return { ...(ca ? { ca } : {}), rejectUnauthorized: !!ca };
}