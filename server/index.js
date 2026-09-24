// server/index.js – PointzPlus Local API Server
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { pool, testConnection, query } from './db.js';
import { authenticate } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import accountsRoutes from './routes/accounts.js';
import programsRoutes from './routes/programs.js';
import emailSyncRoutes from './routes/emailSync.js';
import couponsRoutes from './routes/coupons.js';
import smsRoutes from './routes/sms.js';
import notificationsRoutes from './routes/notifications.js';

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
      // Native apps send no Origin header; allow those, plus the allowlist.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/coupons', couponsRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Analytics endpoints (scoped to the authenticated user – no IDOR via :userId)
app.get('/api/analytics/portfolio', authenticate, async (req, res) => {
  try {
    const result = await query(`    
      SELECT 
        COUNT(*) as total_accounts,
        COALESCE(SUM(current_balance), 0) as total_points,
        COALESCE(SUM(expiring_points), 0) as expiring_points,
        MAX(last_synced_at) as last_sync
      FROM linked_accounts 
      WHERE user_id = $1 AND is_active = true
    `, [req.userId]);

    // Category breakdown
    const categoryResult = await query(`
      SELECT 
        lp.category,
        COUNT(DISTINCT la.id) as brand_count,
        COALESCE(SUM(la.current_balance), 0) as total_points,
        COALESCE(SUM(la.expiring_points), 0) as expiring_points
      FROM linked_accounts la
      JOIN loyalty_programs lp ON la.program_id = lp.id
      WHERE la.user_id = $1 AND la.is_active = true
      GROUP BY lp.category
      ORDER BY total_points DESC
    `, [req.userId]);

    res.json({
      summary: result.rows[0],
      categories: categoryResult.rows
    });
  } catch (err) {
    console.error('Portfolio analytics error:', err);
    res.status(500).json({ error: 'Failed to load portfolio analytics' });
  }
});

// Expiry alerts (scoped to the authenticated user – no IDOR via :userId)
app.get('/api/alerts/expiring', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        la.id,
        lp.name as program_name,
        lp.category,
        la.current_balance,
        la.expiring_points,
        la.expiry_date,
        lp.point_value_inr
      FROM linked_accounts la
      JOIN loyalty_programs lp ON la.program_id = lp.id
      WHERE la.user_id = $1 
        AND la.is_active = true 
        AND la.expiring_points > 0
        AND la.expiry_date IS NOT NULL
        AND la.expiry_date <= NOW() + INTERVAL '90 days'
      ORDER BY la.expiry_date ASC
    `, [req.userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Expiry alerts error:', err);
    res.status(500).json({ error: 'Failed to load expiry alerts' });
  }
});

// Start server
async function startServer() {
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('❌ Cannot start server without database connection');
    console.log('Make sure PostgreSQL is running and credentials are correct in .env');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 PointzPlus API Server                                ║
║                                                           ║
║   Local:    http://localhost:${PORT}                        ║
║   Database: PostgreSQL (local)                            ║
║                                                           ║
║   Endpoints:                                              ║
║   • POST   /api/auth/register                            ║
║   • POST   /api/auth/login                               ║
║   • GET    /api/accounts (user's linked accounts)        ║
║   • POST   /api/accounts (add new account)               ║
║   • DELETE /api/accounts/:id                             ║
║   • GET    /api/programs (all loyalty programs)          ║
║   • GET    /api/email-sync/google/url                    ║
║   • POST   /api/email-sync/scan                          ║
║   • POST   /api/email-sync/google/watch                  ║
║   • GET    /api/coupons                                  ║
║   • POST   /api/sms/detect                               ║
║   • GET    /api/analytics/portfolio              ║
║   • GET    /api/alerts/expiring                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

startServer();