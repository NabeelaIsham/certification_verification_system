const fs = require('fs');
const path = require('path');
const app = require('./app');
const mongoose = require('mongoose');
const { initializeDatabase } = require('./config/database');

const PORT = process.env.PORT || 5000;
let server;
let shuttingDown = false;
let stopExpiryWorker = async () => {};

const startServer = async () => {
  try {
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
    await initializeDatabase();
    stopExpiryWorker = require('./services/subscriptionLifecycleService').startExpiryWorker();

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
  await stopExpiryWorker();
  await mongoose.connection.close(false);
  clearTimeout(forceExit);
  process.exit(0);
};

if (require.main === module) {
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  startServer();
}

module.exports = { app, startServer };
