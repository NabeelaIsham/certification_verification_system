const PLACEHOLDER_PATTERN = /replace|example|your[-_]|change[-_]|development|secret[-_]?here/i;

const splitCsv = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const validateSecret = (name, value, errors) => {
  if (!value || value.length < 32 || PLACEHOLDER_PATTERN.test(value)) {
    errors.push(`${name} must be a non-placeholder value of at least 32 characters`);
  }
};

const validateProductionConfig = (env = process.env) => {
  if (env.NODE_ENV !== 'production') return { valid: true, errors: [] };

  const errors = [];
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'CREDENTIAL_KEY_ENCRYPTION_SECRET',
    'VERIFICATION_PRIVACY_SECRET',
    'API_URL',
    'FRONTEND_URL',
    'CORS_ORIGIN',
    'TRUST_PROXY'
  ];
  for (const name of required) {
    if (!env[name]?.trim()) errors.push(`${name} is required in production`);
  }

  validateSecret('JWT_SECRET', env.JWT_SECRET, errors);
  validateSecret('CREDENTIAL_KEY_ENCRYPTION_SECRET', env.CREDENTIAL_KEY_ENCRYPTION_SECRET, errors);
  validateSecret('VERIFICATION_PRIVACY_SECRET', env.VERIFICATION_PRIVACY_SECRET, errors);

  const secrets = [
    env.JWT_SECRET,
    env.CREDENTIAL_KEY_ENCRYPTION_SECRET,
    env.VERIFICATION_PRIVACY_SECRET
  ].filter(Boolean);
  if (new Set(secrets).size !== secrets.length) {
    errors.push('JWT, credential encryption, and verification privacy secrets must be different');
  }

  for (const name of ['API_URL', 'FRONTEND_URL']) {
    try {
      const url = new URL(env[name]);
      if (url.protocol !== 'https:') errors.push(`${name} must use HTTPS in production`);
    } catch {
      errors.push(`${name} must be a valid absolute URL`);
    }
  }

  const origins = splitCsv(env.CORS_ORIGIN);
  if (origins.length === 0 || origins.includes('*')) {
    errors.push('CORS_ORIGIN must contain explicit trusted origins and cannot use *');
  }
  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (parsed.protocol !== 'https:') {
        errors.push(`CORS_ORIGIN entries must use HTTPS in production: ${origin}`);
      }
      if (parsed.origin !== origin.replace(/\/+$/, '')) {
        errors.push(`CORS_ORIGIN entry must be an origin without a path: ${origin}`);
      }
    } catch {
      errors.push(`Invalid CORS_ORIGIN entry: ${origin}`);
    }
  }

  const retentionDays = Number(env.VERIFICATION_LOG_RETENTION_DAYS || 180);
  if (!Number.isInteger(retentionDays) || retentionDays < 7 || retentionDays > 730) {
    errors.push('VERIFICATION_LOG_RETENTION_DAYS must be an integer from 7 to 730');
  }
  const shareRetentionDays = Number(env.SHARE_RECORD_RETENTION_DAYS || 30);
  if (!Number.isInteger(shareRetentionDays) || shareRetentionDays < 1 || shareRetentionDays > 365) {
    errors.push('SHARE_RECORD_RETENTION_DAYS must be an integer from 1 to 365');
  }

  const positiveIntegerSettings = [
    'API_RATE_LIMIT_WINDOW_MS',
    'API_RATE_LIMIT_MAX',
    'AUTH_RATE_LIMIT_WINDOW_MS',
    'AUTH_RATE_LIMIT_MAX',
    'VERIFY_RATE_LIMIT_WINDOW_MS',
    'VERIFY_RATE_LIMIT_MAX',
    'SHARE_RATE_LIMIT_WINDOW_MS',
    'SHARE_RATE_LIMIT_MAX'
  ];
  for (const name of positiveIntegerSettings) {
    if (env[name] !== undefined && (!Number.isInteger(Number(env[name])) || Number(env[name]) <= 0)) {
      errors.push(`${name} must be a positive integer`);
    }
  }

  return { valid: errors.length === 0, errors };
};

const assertProductionConfig = (env = process.env) => {
  const result = validateProductionConfig(env);
  if (!result.valid) {
    throw new Error(`Production configuration is invalid:\n- ${result.errors.join('\n- ')}`);
  }
  return result;
};

module.exports = {
  assertProductionConfig,
  splitCsv,
  validateProductionConfig
};
