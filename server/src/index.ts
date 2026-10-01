import { createApp } from './app';
import { createStore } from './store';
import { env } from './config/env';

async function main() {
  const store = await createStore();
  const app = createApp(store);

  const server = app.listen(env.PORT, () => {
    console.log(`[server] API listening on http://localhost:${env.PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[server] Port ${env.PORT} is already in use — another server instance is running.`);
      console.error(`[server] Stop the existing one first (e.g. "netstat -ano | findstr :${env.PORT}"), or just use the one that is already running.`);
      process.exit(1);
    }
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  });
}

main().catch((e) => {
  console.error('[server] Failed to start:', e.message);
  process.exit(1);
});