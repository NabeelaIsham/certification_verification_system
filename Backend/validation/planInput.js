function planInput(body) {
  const keys = ['name', 'priceMinor', 'limits', 'features', 'active', 'displayOrder', 'recommended'];
  if (!body || Object.keys(body).some(key => !keys.includes(key)) || typeof body.name !== 'string' || !Number.isSafeInteger(body.priceMinor) || body.priceMinor < 0 ||
      !body.limits || ['certificates', 'teachers', 'templates'].some(key => !Number.isSafeInteger(body.limits[key]) || body.limits[key] < (key === 'certificates' ? 1 : 0)) ||
      Object.keys(body.limits).some(key => !['certificates', 'teachers', 'templates'].includes(key)) ||
      ['active', 'recommended'].some(key => body[key] !== undefined && typeof body[key] !== 'boolean') ||
      (body.displayOrder !== undefined && !Number.isSafeInteger(body.displayOrder)) ||
      (body.features !== undefined && (!body.features || Object.entries(body.features).some(([key, value]) => !['bulkCertificateIssue', 'secureSharing'].includes(key) || typeof value !== 'boolean')))) {
    throw Object.assign(new Error('Valid plan name, integer prices/limits and boolean features required.'), { status: 400 });
  }
  return Object.fromEntries(keys.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
}

module.exports = planInput;
