import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { config } from './config.js';
import { prisma } from './db.js';
import { errorHandler, notFound } from './http.js';
import { authRouter } from './routes/auth.js';
import { messRouter } from './routes/messes.js';
import { dishRouter } from './routes/dishes.js';
import { checkinRouter } from './routes/checkins.js';
import { favouriteRouter } from './routes/favourites.js';
import { ownerRouter } from './routes/owner.js';
import { adminRouter } from './routes/admin.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.clientOrigins, credentials: false }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/uploads', express.static(path.resolve(config.UPLOAD_DIR), { maxAge: '7d', index: false }));

  // Liveness: confirms the API process is running without depending on external services.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Readiness: checks whether PostgreSQL is reachable before serving database-backed requests.
  app.get('/api/health/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ready', database: 'connected', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'not_ready', database: 'unavailable', time: new Date().toISOString() });
    }
  });
  app.use('/api/auth', authRouter);
  app.use('/api/messes', messRouter);
  app.use('/api/dishes', dishRouter);
  app.use('/api/checkins', checkinRouter);
  app.use('/api/favourites', favouriteRouter);
  app.use('/api/owner', ownerRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
