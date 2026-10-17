// Express 5 forwards rejected async route handlers to this middleware.
module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const candidate = err.status || err.statusCode;
  const status = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599
    ? candidate : 500;
  const malformedJson = err.type === 'entity.parse.failed';
  const tooLarge = err.type === 'entity.too.large';
  res.status(status).json({
    success: false,
    code: malformedJson ? 'INVALID_JSON' : tooLarge ? 'PAYLOAD_TOO_LARGE' : status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
    message: malformedJson ? 'Request body must be valid JSON.' : tooLarge ? 'Request body is too large.' : 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};
