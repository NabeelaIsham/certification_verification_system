const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { initializeDatabase, loadModels } = require('./config/database');
const { assertProductionConfig, splitCsv } = require('./config/production');
const { createRateLimit } = require('./middleware/rateLimit');

dotenv.config();
assertProductionConfig();

loadModels();

const app = express();

const trustProxyValue = process.env.TRUST_PROXY;
if (trustProxyValue) {
  app.set('trust proxy', /^\d+$/.test(trustProxyValue) ? Number(trustProxyValue) : trustProxyValue);
}

const allowedOrigins = splitCsv(process.env.CORS_ORIGIN || process.env.FRONTEND_URL);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`Blocked CORS origin: ${origin}`);
    const error = new Error(`Origin is not allowed by CORS: ${origin}`);
    error.status = 403;
    return callback(error);
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: false,
  maxAge: 600
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  strictTransportSecurity: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true }
    : false
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_BODY_LIMIT || '2mb' }));

const generalApiRateLimit = createRateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.API_RATE_LIMIT_MAX || 1000),
  keyPrefix: 'general-api'
});
const authRateLimit = createRateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 60),
  message: 'Too many authentication attempts. Please try again later.',
  keyPrefix: 'authentication'
});

const uploadsDir = path.join(__dirname, 'uploads');
const uploadDirs = [
  uploadsDir,
  path.join(uploadsDir, 'certificates'),
  path.join(uploadsDir, 'generated'),
  path.join(uploadsDir, 'qrcodes'),
  path.join(uploadsDir, 'templates'),
  path.join(uploadsDir, 'template-assets'),
  path.join(uploadsDir, 'logos')
];

for (const dir of uploadDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Upload directory created: ${dir}`);
  }
}

app.use('/uploads', express.static(uploadsDir));

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const instituteRoutes = require('./routes/instituteRoutes');
const courseRoutes = require('./routes/courseRoutes');
const certificateTemplateRoutes = require('./routes/certificateTemplateRoutes');
const studentRoutes = require('./routes/studentRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const emailRoutes = require('./routes/emailRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const { logger, errorLogger } = require('./utils/logger');

app.use(logger);

app.use('/api', generalApiRateLimit);
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/institute', instituteRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/certificate-templates', certificateTemplateRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/certificates/verify', verificationRoutes);
app.use('/api/certificates', certificateRoutes);

app.get('/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.setHeader('Cache-Control', 'no-store');
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: databaseConnected ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'Certificate Verification System API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        'verify-email': 'POST /api/auth/verify-email',
        'verify-phone': 'POST /api/auth/verify-phone',
        'forgot-password': 'POST /api/auth/forgot-password',
        'reset-password': 'POST /api/auth/reset-password'
      },
      admin: {
        stats: 'GET /api/admin/stats',
        institutes: 'GET /api/admin/institutes',
        'pending-institutes': 'GET /api/admin/institutes/pending/list',
        'approve-institute': 'PUT /api/admin/institutes/:id/approve',
        'reject-institute': 'DELETE /api/admin/institutes/:id',
        'toggle-status': 'PUT /api/admin/institutes/:id/toggle-status',
        users: 'GET /api/admin/users',
        certificates: 'GET /api/admin/certificates',
        settings: 'GET /api/admin/settings',
        'update-settings': 'PUT /api/admin/settings'
      },
      institute: {
        dashboard: 'GET /api/institute/dashboard',
        stats: 'GET /api/institute/stats'
      },
      courses: {
        list: 'GET /api/courses',
        create: 'POST /api/courses',
        update: 'PUT /api/courses/:id',
        delete: 'DELETE /api/courses/:id'
      },
      students: {
        list: 'GET /api/students',
        create: 'POST /api/students',
        'bulk-upload': 'POST /api/students/bulk-upload',
        update: 'PUT /api/students/:id',
        delete: 'DELETE /api/students/:id'
      },
      certificates: {
        list: 'GET /api/certificates',
        issue: 'POST /api/certificates',
        'bulk-issue': 'POST /api/certificates/bulk-issue',
        verify: 'GET /api/certificates/verify/:code',
        'send-email': 'POST /api/certificates/:id/send-email'
      }
    }
  });
});

app.use(errorLogger);

app.use((err, req, res, next) => {
  console.error('Error:', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.url}`
  });
});

const PORT = process.env.PORT || 5000;
let server;
let shuttingDown = false;

const startServer = async () => {
  try {
    await initializeDatabase();

    server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API Documentation: http://localhost:${PORT}/api`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down gracefully.`);

  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out.');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.connection.close(false);
  clearTimeout(forceExit);
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
