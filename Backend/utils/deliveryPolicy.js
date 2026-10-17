// A restored database may contain live SMTP settings. Enforce the environment
// boundary before constructing a transporter or invoking an SMS provider.
const assertDeliveryAllowed = (channel, recipients, env = process.env) => {
  if (!['staging', 'production'].includes(env.DEPLOYMENT_ENV) && env.DEPLOYMENT_ENV) throw new Error('Unknown deployment environment');
  const mode = env.OUTBOUND_DELIVERY_MODE || (env.DEPLOYMENT_ENV === 'staging' ? 'disabled' : 'live');
  if (mode === 'disabled') throw new Error('Outbound delivery is disabled in this environment.');
  if (mode === 'allowlist') {
    const allowed = new Set(String(env[channel === 'email' ? 'STAGING_EMAIL_ALLOWLIST' : 'STAGING_SMS_ALLOWLIST'] || '')
      .split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
    const values = Array.isArray(recipients) ? recipients : [recipients];
    if (!values.length || values.some(value => typeof value !== 'string' || !allowed.has(value.trim().toLowerCase()))) {
      throw new Error('Recipient is not in the environment delivery allowlist.');
    }
    return;
  }
  if (mode !== 'live' || env.DEPLOYMENT_ENV === 'staging') throw new Error('Live delivery is forbidden in staging.');
};
module.exports = { assertDeliveryAllowed };
