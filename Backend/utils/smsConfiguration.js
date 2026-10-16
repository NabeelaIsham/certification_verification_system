const resolveConfiguration = (env = process.env) => ({
  apiToken: (env.TEXTLK_API_TOKEN || '').trim(),
  senderId: (env.TEXTLK_SENDER_ID || '').trim(),
  endpoint: (env.TEXTLK_SMS_ENDPOINT || 'https://app.text.lk/api/v3/sms/send').trim(),
  authPrefix: (env.TEXTLK_AUTH_PREFIX || 'Bearer').trim(),
  timeout: Number(env.TEXTLK_TIMEOUT_MS || 10000)
});

// Return only fixed diagnostic text. Never include configured values in reports.
const validateTextLkConfiguration = (env = process.env) => {
  const config = resolveConfiguration(env);
  const errors = [];
  if (!config.apiToken) errors.push('Text.lk API token is not configured. Set TEXTLK_API_TOKEN.');
  if (!config.senderId) errors.push('Text.lk sender ID is not configured. Set TEXTLK_SENDER_ID to your approved sender.');
  if (env.DEPLOYMENT_ENV === 'production' && /^textlkdemo$/i.test(config.senderId)) {
    errors.push('TEXTLK_SENDER_ID must use an approved production sender, not TextLKDemo.');
  }
  try {
    const url = new URL(config.endpoint);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('endpoint');
  } catch {
    errors.push('TEXTLK_SMS_ENDPOINT must be a valid HTTPS URL without URL credentials.');
  }
  if (!Number.isSafeInteger(config.timeout) || config.timeout < 1 || config.timeout > 120000) {
    errors.push('TEXTLK_TIMEOUT_MS must be an integer from 1 to 120000 milliseconds.');
  }
  if (/[\r\n]/.test(config.apiToken + config.authPrefix)) {
    errors.push('Text.lk authentication settings cannot contain embedded line breaks.');
  }
  return { valid: errors.length === 0, errors };
};

const getTextLkConfiguration = (env = process.env) => {
  const result = validateTextLkConfiguration(env);
  if (!result.valid) throw Object.assign(new Error(result.errors.join(' ')), { code: 'SMS_CONFIGURATION_INVALID' });
  return resolveConfiguration(env);
};

module.exports = { validateTextLkConfiguration, getTextLkConfiguration };
