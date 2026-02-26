const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/certverify', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Import routes (using require instead of import)
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const instituteRoutes = require('./routes/instituteRoutes');
const courseRoutes = require('./routes/courseRoutes');
const certificateTemplateRoutes = require('./routes/certificateTemplateRoutes');
const studentRoutes = require('./routes/studentRoutes');
const certificateRoutes = require('./routes/certificateRoutes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/institute', instituteRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/certificate-templates', certificateTemplateRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/certificates', certificateRoutes);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const certificatesDir = path.join(uploadsDir, 'certificates');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Uploads directory created');
}

if (!fs.existsSync(certificatesDir)) {
  fs.mkdirSync(certificatesDir, { recursive: true });
  console.log('✅ Certificates directory created');
}

// Initialize default settings if none exist
const Settings = require('./models/Settings');

const initializeSettings = async () => {
  try {
    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      await Settings.create({});
      console.log('✅ Default settings created');
    }
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
};

// Call this after your database connection
initializeSettings();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// API info endpoint
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.url}`
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/api`);
  console.log(`📧 Environment: ${process.env.NODE_ENV || 'development'}`);
});