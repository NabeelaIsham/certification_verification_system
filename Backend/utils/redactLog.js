const sensitiveKey = /authorization|cookie|password|passwd|secret|token|api[-_]?key|private[-_]?key|otp|recovery[-_]?codes/i;

const redactLog = (value) => {
  const secrets = Object.entries(process.env)
    .filter(([key, entry]) => sensitiveKey.test(key) && entry && entry.trim().length >= 8)
    .map(([, entry]) => entry.trim());
  const seen = new WeakSet();
  const cleanText = (input) => {
    let text = input;
    for (const secret of secrets) text = text.split(secret).join('[REDACTED]');
    return text
      .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, '[REDACTED_DATABASE_URI]')
      .replace(/\bBearer\s+[^\s,;"']+/gi, 'Bearer [REDACTED]')
      .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_TOKEN]');
  };
  const visit = (entry, depth = 0) => {
    if (typeof entry === 'string') return cleanText(entry);
    if (entry === null || entry === undefined || typeof entry === 'boolean' || typeof entry === 'number') return entry;
    if (typeof entry !== 'object') return `[${typeof entry}]`;
    if (seen.has(entry)) return '[Circular]';
    if (depth > 6) return '[Truncated]';
    seen.add(entry);
    if (entry instanceof Error) {
      // Axios/Nodemailer errors can contain requests, credentials and provider
      // bodies. Keep diagnostic fields only, never serialize the whole error.
      return visit({ name: entry.name, message: entry.message, code: entry.code,
        status: entry.status || entry.response?.status,
        ...(process.env.NODE_ENV !== 'production' && { stack: entry.stack }) }, depth + 1);
    }
    if (Array.isArray(entry)) return entry.map(item => visit(item, depth + 1));
    return Object.fromEntries(Object.entries(entry).map(([key, item]) => [
      key, sensitiveKey.test(key) ? '[REDACTED]' : visit(item, depth + 1)
    ]));
  };
  return visit(value);
};

module.exports = { redactLog };
