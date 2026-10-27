// server.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import verifyRoutes from './routes/verify.js';
import paymentsRoutes from './routes/payments.js';
import vehiclesRouter from './routes/vehicles.js';
import ordersRoutes from './routes/orders.js';
import agentsRoutes from './routes/agents.js';
import messagesRoutes from './routes/messages.js';
import pricesRoutes from './routes/prices.js';
import { bootstrapSuperAdmin } from './services/bootstrapSuperAdmin.js';
import { corsOptionsDelegate } from './src/corsConfig.js';

console.log('JWT_SECRET loaded?', !!process.env.JWT_SECRET);
console.log('STAFF_JWT_SECRET loaded?', !!process.env.STAFF_JWT_SECRET);
console.log('RESEND_API_KEY loaded?', !!process.env.RESEND_API_KEY);
console.log('NODE_ENV:', process.env.NODE_ENV);

const app = express();

// __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── CORS ──────────────────────────────────────────────────────────────────────
// Which browser origins may call this API is decided in src/corsConfig.js
// (FRONTEND_URLS + FRONTEND_URL, www and non-www treated as the same site).
app.use(cors(corsOptionsDelegate()));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

// ── API routes — must come BEFORE the static/catch-all ───────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/verify',   verifyRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/orders',   ordersRoutes);
app.use('/api/agents',   agentsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/prices',   pricesRoutes);

// ── JWT middleware (used by /api/profile below) ───────────────────────────────
const customProtect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verify error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ── Profile route ─────────────────────────────────────────────────────────────
app.get('/api/profile', customProtect, (req, res) => {
  const user = req.user;
  res.json({
    message: 'Profile fetched successfully',
    user: {
      id:           user.id,
      email:        user.email,
      first_name:   user.first_name   || null,
      last_name:    user.last_name    || null,
      plate_number: user.plate_number || null,
      created_at:   user.created_at   || null,
    },
  });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '🚗 CAREAL Backend Running!' });
});

// ── Unmatched /api/* → JSON 404 (never index.html) ──────────────────────────
// Without this, in production the SPA fallback below answers a mistyped or
// missing /api path with index.html and HTTP 200, which a frontend then fails
// to parse as JSON ("Unexpected token '<'") and hides the real mistake.
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found', path: req.originalUrl });
});

// ── Serve React frontend in production ────────────────────────────────────────
// Single host on Render: Express serves the Vite build AND handles all API routes
// Separate host later:   Remove this block; frontend lives on its own Render service
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');

  // Serve static assets (JS, CSS, images)
  app.use(express.static(clientDist));

  // Any non-/api route returns index.html so React Router works on hard refresh
app.use((req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});


} else {
  // Development: simple root response (Vite dev server handles the frontend)
  app.get('/', (req, res) => {
    res.send('🚗 CAREAL Backend Running! (development mode)');
  });

  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });
}

// ── Error handler: always JSON, never an HTML stack page ─────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('Unhandled error:', err.message);
  res.status(status).json({ message: status === 400 ? 'Malformed request body' : 'Server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
bootstrapSuperAdmin().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
});
