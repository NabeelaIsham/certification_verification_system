const crypto = require('crypto');

const stores = new Set();

const createRateLimit = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests. Please try again later.',
  keyPrefix = 'api'
} = {}) => {
  const store = new Map();
  stores.add(store);
  let lastCleanup = 0;

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastCleanup > windowMs) {
      for (const [key, value] of store.entries()) {
        if (value.resetAt <= now) store.delete(key);
      }
      lastCleanup = now;
    }

    const identity = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = crypto.createHash('sha256').update(`${keyPrefix}:${identity}`).digest('hex');
    const current = store.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 1, resetAt: now + windowMs }
      : { count: current.count + 1, resetAt: current.resetAt };
    store.set(key, entry);

    const remaining = Math.max(max - entry.count, 0);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
};

const resetRateLimitStores = () => {
  for (const store of stores) store.clear();
};

module.exports = {
  createRateLimit,
  resetRateLimitStores
};
