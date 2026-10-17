const morgan = require('morgan');
const { redactLog } = require('./redactLog');

const isSilent = () => process.env.LOG_LEVEL === 'silent' ||
  (process.env.NODE_ENV === 'test' && process.env.LOG_LEVEL !== 'debug');

morgan.token('safe-url', (req) => {
  const pathOnly = String(req.originalUrl || req.url || '').split('?')[0];
  return pathOnly.replace(
    /^(\/api\/certificates\/verify\/share\/)[^/]+/,
    '$1[REDACTED]'
  );
});

const logger = morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length] ":user-agent"',
  { skip: isSilent }
);

const appLogger = Object.fromEntries(['log', 'info', 'warn', 'error', 'debug'].map(level => [level, (...values) => {
  if (isSilent() || (level === 'debug' && process.env.LOG_LEVEL !== 'debug')) return;
  console[level](JSON.stringify({ time: new Date().toISOString(), level: level === 'log' ? 'info' : level,
    details: redactLog(values) }));
}]));

const errorLogger = (err, req, res, next) => {
  appLogger.error('[Error]', err);
  next(err);
};

module.exports = {
  logger,
  appLogger,
  errorLogger
};
