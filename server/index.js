import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import monthsRouter from './routes/months.js';
import integrationRouter from './routes/integration.js';
import financierMappingRouter from './routes/financierMapping.js';
import externalSalesRouter from './routes/externalSales.js';

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not set. Add it to your .env file (see .env.example).');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

const PgSession = connectPgSimple(session);

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));

app.use(
  session({
    store: new PgSession({ pool, tableName: 'session', createTableIfMissing: false }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);

app.use('/api/auth', authRouter);
app.use('/api/users', requireAuth, requireAdmin, usersRouter);
app.use('/api/months', requireAuth, monthsRouter);
app.use('/api/integration', requireAuth, integrationRouter);
app.use('/api/financier-mapping', requireAuth, financierMappingRouter);
app.use('/api/external-sales', requireAuth, externalSalesRouter);

app.use(express.static(distDir));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'internal error' });
});

// API_PORT takes priority so local dev doesn't collide with the frontend dev
// server's PORT (Railway/production only ever sets PORT, not API_PORT).
const port = process.env.API_PORT || process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
