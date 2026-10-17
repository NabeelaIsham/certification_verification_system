const requireDatabaseUri = (env = process.env) => {
  const uri = env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI must explicitly select a database; no local fallback is permitted.');
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)(?:\?.*)?$/);
  if (!match || !/^[a-zA-Z0-9_-]+$/.test(match[1]) || /^(admin|local|config)$/i.test(match[1])) {
    throw new Error('MONGODB_URI must include an application database name.');
  }
  if (env.DEPLOYMENT_ENV === 'staging' && !/^certverify_staging(?:_[a-z0-9_]+)?$/.test(match[1])) {
    throw new Error('Staging must use a dedicated certverify_staging database.');
  }
  if (env.DEPLOYMENT_ENV === 'production' && /^certverify_staging/i.test(match[1])) {
    throw new Error('Production cannot use a staging database.');
  }
  return uri;
};
module.exports = { requireDatabaseUri };
