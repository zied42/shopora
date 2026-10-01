import express, { Express } from 'express';
import cors from 'cors';
import { Store } from './store';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { productRoutes } from './routes/products';
import { orderRoutes } from './routes/orders';
import { supportRoutes } from './routes/support';
import { returnRoutes } from './routes/returns';
import { chefRoutes } from './routes/chef';
import { stockingRoutes } from './routes/stocking';
import { dashboardRoutes } from './routes/dashboard';
import { uploadRoutes } from './routes/upload';
import { chatRoutes } from './routes/chat';
import { notificationRoutes } from './routes/notifications';
import { inventoryRoutes } from './routes/inventory';
import { batchRoutes } from './routes/batches';
import { staffRoutes } from './routes/staff';
import { apiKeyRoutes } from './routes/apiKeys';
import { apiV1Routes } from './routes/apiV1';
import { integrationRoutes } from './routes/integration';
import { flouciRoutes } from './routes/flouci';
import { confirmateurRoutes } from './routes/confirmateur';
import { errorHandler, notFoundHandler } from './middleware/error';
import { uploadsDir } from './lib/paths';

export function createApp(store: Store): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.get('/uploads/:name', async (req, res, next) => {
    try {
      const file = await store.getUploadFile(req.params.name);
      if (file) {
        res.setHeader('Content-Type', file.contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.end(file.data);
        return;
      }
    } catch {
      // fall through to the legacy disk copy below
    }
    express.static(uploadsDir)(req, res, next);
  });

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', store: 'ready' } });
  });

  app.use('/api/auth', authRoutes(store));
  app.use('/api/users', userRoutes(store));
  app.use('/api/products', productRoutes(store));
  app.use('/api/orders', orderRoutes(store));
  app.use('/api/support', supportRoutes(store));
  app.use('/api/returns', returnRoutes(store));
  app.use('/api/chef', chefRoutes(store));
  app.use('/api/stocking', stockingRoutes(store));
  app.use('/api/dashboard', dashboardRoutes(store));
  app.use('/api/upload', uploadRoutes(store));
  app.use('/api/chat', chatRoutes(store));
  app.use('/api/notifications', notificationRoutes(store));
  app.use('/api/inventory', inventoryRoutes(store));
  app.use('/api/batches', batchRoutes(store));
  app.use('/api/staff', staffRoutes(store));
  app.use('/api/keys', apiKeyRoutes(store));
  app.use('/api/integration', integrationRoutes(store));
  app.use('/api/flouci', flouciRoutes(store));
  app.use('/api/v1', apiV1Routes(store));
  app.use('/api/confirmateur', confirmateurRoutes(store));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}