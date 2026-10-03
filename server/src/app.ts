import express, { Express } from 'express';
import cors from 'cors';
import { Store } from './store';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { productRoutes } from './routes/products';
import { orderRoutes } from './routes/orders';
import { supportRoutes } from './routes/support';
import { returnRoutes } from './routes/returns';
import { dashboardRoutes } from './routes/dashboard';
import { uploadRoutes } from './routes/upload';
import { chatRoutes } from './routes/chat';
import { notificationRoutes } from './routes/notifications';
import { inventoryRoutes } from './routes/inventory';
import { errorHandler, notFoundHandler } from './middleware/error';
import { uploadsDir } from './lib/paths';
import helmet from 'helmet';
import { verifyToken } from './middleware/auth';
import { env } from './config/env';

export function createApp(store: Store): Express {
  const app = express();

  const allowedOrigins = env.WEB_BASE_URL.split(',').map((origin) => origin.trim()).filter(Boolean);
  app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)) }));
  app.use(helmet());
  app.use((req, res, next) => {
    const header = req.headers.authorization;
    if (!header) { next(); return; }
    if (!header.startsWith('Bearer ')) { res.status(401).json({ success: false, error: 'Invalid or expired token' }); return; }
    try {
      const claims = verifyToken(header.slice(7));
      void store.findUserById(claims.id).then((user) => {
        if (!user) { res.status(401).json({ success: false, error: 'Invalid or expired token' }); return; }
        if (user.role !== claims.role) { res.status(401).json({ success: false, error: 'Session is no longer valid' }); return; }
        req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
        next();
      }).catch(next);
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
  });
  app.use(express.json({ limit: '2mb' }));
  app.get('/uploads/:name', async (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Content-Disposition', 'attachment');
    try {
      const file = await store.getUploadFile(req.params.name);
      if (file) {
        res.setHeader('Content-Type', file.contentType);
        if (['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'].includes(file.contentType)) {
          res.setHeader('Content-Disposition', 'inline');
        }
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
  app.use('/api/dashboard', dashboardRoutes(store));
  app.use('/api/upload', uploadRoutes(store));
  app.use('/api/chat', chatRoutes(store));
  app.use('/api/notifications', notificationRoutes(store));
  app.use('/api/inventory', inventoryRoutes(store));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
