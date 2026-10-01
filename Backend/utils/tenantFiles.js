const fs = require('fs');
const path = require('path');
const backendRoot = path.resolve(__dirname, '..');

const tenantFile = (file, instituteId, folders) => {
  if (typeof file !== 'string' || !/^[a-f\d]{24}$/i.test(String(instituteId))) {
    throw Object.assign(new Error('Invalid institute file'), { status: 403 });
  }
  const candidate = path.resolve(backendRoot, file);
  const inside = folders.some(folder => {
    const root = path.join(backendRoot, 'uploads', folder, String(instituteId));
    const relative = path.relative(root, candidate);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  });
  if (!inside) throw Object.assign(new Error('File does not belong to this institute'), { status: 403 });
  if (fs.existsSync(candidate)) {
    const real = fs.realpathSync(candidate);
    if (real !== candidate) throw Object.assign(new Error('Linked files are not allowed'), { status: 403 });
  }
  return candidate;
};
module.exports = { tenantFile };
