require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const User = require('./models/User');
const { ROLES } = require('./config/constants');

const ON_VERCEL = !!process.env.VERCEL;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Add it to server/.env or your hosting environment variables.');
  if (!ON_VERCEL) process.exit(1);
}

// ---------------- Database (connect once, reuse across serverless invocations)
async function bootstrapAdmin() {
  if (await User.exists({})) return;
  const mobile = process.env.ADMIN_MOBILE || '9999999999';
  await User.create({
    name: process.env.ADMIN_NAME || 'HQ Administrator',
    mobile,
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    role: ROLES.HQ,
    designation: 'System Administrator',
  });
  console.log(`Created first HQ admin — login ${mobile}. Change the password after first login.`);
}

let dbReady = null;
function ensureDB() {
  if (!dbReady) {
    dbReady = connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/upliftment_monitor')
      .then(bootstrapAdmin)
      .catch((e) => {
        dbReady = null; // retry on the next request
        throw e;
      });
  }
  return dbReady;
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(compression());
const origins = (process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('tiny'));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

// Every API request waits for the database connection
app.use('/api', (req, res, next) => {
  ensureDB()
    .then(() => next())
    .catch((e) => {
      console.error('MongoDB connection failed:', e.message);
      res.status(503).json({ message: 'Database is not reachable. Check MONGO_URI and the Atlas network access list.' });
    });
});

app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));

// ---------------- API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/public'));
app.use('/api/org', require('./routes/org'));
app.use('/api/users', require('./routes/users'));
app.use('/api/households', require('./routes/households'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/inbox', require('./routes/inbox'));
app.use('/api/portal', require('./routes/portal'));
const files = require('./routes/uploads');
app.use('/api/uploads', files.uploadRouter); // upload evidence (stored in MongoDB)
app.use('/api/files', files.fileRouter); // view evidence (staff only, ?t=token)

app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));

// ---------------- Frontend when self-hosted (on Vercel the client is its own service)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (!ON_VERCEL && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '1h', index: false }));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// ---------------- Errors
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  if (err.name === 'CastError') return res.status(400).json({ message: `Invalid value for ${err.path}` });
  if (err.code === 11000) return res.status(400).json({ message: `Duplicate value: ${Object.keys(err.keyValue || {}).join(', ')}` });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Each file must be under 4 MB' });
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

// ---------------- Long-running server (VPS / Render / local). Vercel uses the exported app.
if (!ON_VERCEL) {
  const PORT = process.env.PORT || 5000;
  ensureDB()
    .then(() => {
      // Early warnings are also refreshed live whenever the dashboard or case list loads
      const { recomputeAll } = require('./routes/dashboard');
      setInterval(() => recomputeAll().catch(console.error), 24 * 60 * 60 * 1000);
      app.listen(PORT, () => console.log(`Upliftment Monitor running on port ${PORT}`));
    })
    .catch((e) => {
      console.error('Could not connect to MongoDB:', e.message);
      process.exit(1);
    });
}

module.exports = app;
