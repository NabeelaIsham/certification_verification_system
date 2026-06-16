const morgan = require('morgan');
const logger = morgan('combined');

const errorLogger = (err, req, res, next) => {
  console.error('[Error]', err.stack || err);
  next(err);
};

module.exports = {
  logger,
  errorLogger
};
