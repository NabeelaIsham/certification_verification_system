const jwt = require('jsonwebtoken');
const { getAllowedOrigins } = require('../config/production');

const cookieName = () => process.env.NODE_ENV === 'production' ? '__Secure-certiverxia_session' : 'certiverxia_session';
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api' });
const sessionToken = (req) => {
  const entry = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName()}=`));
  if (!entry) return undefined;
  try { return decodeURIComponent(entry.slice(entry.indexOf('=') + 1)); } catch { return undefined; }
};

// A custom header forces a CORS preflight. Exact origin checking also protects
// same-site sibling domains; SameSite alone is not our CSRF boundary.
const browserSession = (req, res, next) => {
  const browser = req.get('X-Client-Type') === 'browser';
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (unsafe && (browser || sessionToken(req))) {
    if (!browser || !getAllowedOrigins().includes(req.get('Origin'))) {
      return res.status(403).json({ success: false, code: 'CSRF_REJECTED', message: 'Untrusted browser request.' });
    }
  }
  if (browser) {
    const json = res.json.bind(res);
    res.json = (body) => {
      if (body?.success && body.token) {
        const claims = jwt.verify(body.token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        res.cookie(cookieName(), body.token, { ...cookieOptions(), maxAge: Math.max(0, claims.exp * 1000 - Date.now()) });
        const publicBody = { ...body };
        delete publicBody.token;
        res.set('Cache-Control', 'no-store');
        return json(publicBody);
      }
      return json(body);
    };
  }
  next();
};

const clearSession = (_req, res) => {
  res.clearCookie(cookieName(), cookieOptions());
  res.set('Cache-Control', 'no-store');
  res.json({ success: true });
};

module.exports = { browserSession, sessionToken, clearSession };
