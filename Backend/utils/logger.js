const morgan = require('morgan');

morgan.token('safe-url', (req) => {
  const pathOnly = String(req.originalUrl || req.url || '').split('?')[0];
  return pathOnly.replace(
    /^(\/api\/certificates\/verify\/share\/)[^/]+/,
    '$1[REDACTED]'
  );
});

const logger = morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
);

const errorLogger = (err, req, res, next) => {
  console.error('[Error]', err.stack || err);
  next(err);
};

module.exports = {
  logger,
  errorLogger
};
