// server/index.js – PointzPlus API server (wiring only: middleware + routers).
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { pool, testConnection } from './db.js';
import { startSyncWorker, stopSyncWorker } from './workers/syncWorker.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { rateLimit } from './lib/rateLimit.js';
import authRoutes from './routes/auth.js';
import accountsRoutes from './routes/accounts.js';
import programsRoutes from './routes/programs.js';
import emailSyncRoutes from './routes/emailSync.js';
import smsRoutes from './routes/sms.js';
import notificationsRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import dealsRoutes from './routes/deals.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
// Explicit origin allowlist (never wildcard + credentials). Configure via CORS_ORIGINS.
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  'http://localhost:8081,http://localhost:19006,http://localhost:3000'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      // Native apps send no Origin header; allow those, plus the allowlist & local dev origins.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      if (
        process.env.NODE_ENV !== 'production' &&
        /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
          origin
        )
      ) {
        return cb(null, true);
      }
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
// HTTP request logging: verbose only in development (guardrail §4).
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Baseline API limiter (auth routes add a stricter credential limiter on top).
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: 'api',
  message: 'Too many requests. Please slow down.',
});
app.use('/api', apiLimiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/programs', programsRoutes);
app.use('/api/email-sync', emailSyncRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/deals', dealsRoutes);
// Same router serves both original URLs: /api/analytics/* and /api/alerts/*.
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', analyticsRoutes);

// Terminal handlers: unknown routes → 404, thrown ApiErrors → coded envelope.
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer() {
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('❌ Cannot start server without database connection');
    console.log('Make sure PostgreSQL is running and credentials are correct in .env');
    process.exit(1);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`PointzPlus API server listening on http://0.0.0.0:${PORT} (db: connected)`);
  });

  // Background Gmail sync worker. Jobs are claimed from sync_jobs with
  // FOR UPDATE SKIP LOCKED, so extra API instances can each run their own
  // worker without ever double-processing a job.
  if (process.env.SYNC_WORKER_ENABLED !== 'false') {
    startSyncWorker();
  }

  // Stop accepting connections and stop polling for work. Any job already
  // in flight is recovered by the stale-lock reaper on the next boot.
  const shutdown = (signal) => {
    console.log(`\n${signal} received – shutting down gracefully`);
    stopSyncWorker();
    server.close(() => process.exit(0));
    // Don't hang forever on a stuck connection.
    setTimeout(() => process.exit(0), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer();
