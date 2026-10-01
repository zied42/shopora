import { Store } from './types';
import { createMemoryStore } from './memory';
import { createMysqlStore, MysqlConfig } from './mysql';
import { env } from '../config/env';

export async function createStore(silent = false): Promise<Store> {
  const driver = env.DB_DRIVER;

  if (driver === 'memory') {
    if (!silent) console.log('[store] Using in-memory demo store (set DB_DRIVER=mysql for MySQL)');
    return createMemoryStore();
  }

  if (driver === 'mysql') {
    const cfg: MysqlConfig = {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      ssl: env.DB_SSL,
    };
    if (!silent) console.log(`[store] Connecting to MySQL at ${cfg.host}:${cfg.port}/${cfg.database}`);
    return createMysqlStore(cfg);
  }

  // Supabase swap point (Phase 2): implement store/supabase.ts returning the same Store interface.
  throw new Error(`Unknown DB_DRIVER "${driver}". Supported: memory, mysql (supabase coming in Phase 2).`);
}

export type { Store };
export { StockError } from './types';
export type { StaffActivityInput, StaffActivityRow, StaffActivityType } from './types';