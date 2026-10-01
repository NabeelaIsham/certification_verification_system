const fs = require('fs');
const path = require('path');

// Read-only: never repair or delete certificate history during application startup.
const auditDeploymentData = async (db, backendRoot = path.resolve(__dirname, '..')) => {
  const names = ['certificates', 'users', 'students', 'courses', 'certificatetemplates'];
  const [certificates, users, students, courses, templates] = await Promise.all(
    names.map(name => db.collection(name).find({}).toArray())
  );
  const byId = rows => new Map(rows.map(row => [String(row._id), row]));
  const maps = [byId(users), byId(students), byId(courses), byId(templates)];
  const issues = { missingReferences: 0, crossInstituteReferences: 0, absoluteFileReferences: 0, unsafeFileReferences: 0, missingFiles: 0 };
  const checkFile = (value, instituteId, folder) => {
    if (!value) return;
    if (typeof value !== 'string') { issues.unsafeFileReferences++; return; }
    const normalized = value.replace(/\\/g, '/');
    if (path.posix.isAbsolute(normalized) || path.win32.isAbsolute(value)) {
      issues.absoluteFileReferences++;
      return;
    }
    if (!normalized.startsWith(`uploads/${folder}/${instituteId}/`) || normalized.split('/').some(part => ['..', '.', ''].includes(part))) {
      issues.unsafeFileReferences++;
      return;
    }
    try {
      const root = fs.realpathSync(path.join(backendRoot, 'uploads', folder, String(instituteId)));
      const file = fs.realpathSync(path.resolve(backendRoot, normalized));
      const relative = path.relative(root, file);
      if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.statSync(file).isFile()) issues.unsafeFileReferences++;
    } catch { issues.missingFiles++; }
  };
  for (const certificate of certificates) {
    const ids = [certificate.instituteId, certificate.studentId, certificate.courseId, certificate.templateId];
    const related = ids.map((id, index) => maps[index].get(String(id)));
    if (related.some(row => !row)) issues.missingReferences++;
    if (related.slice(1).some(row => row && String(row.instituteId) !== String(certificate.instituteId))) issues.crossInstituteReferences++;
    checkFile(certificate.generatedCertificateImage, certificate.instituteId, 'generated');
    checkFile(certificate.qrCodeImage, certificate.instituteId, 'qrcodes');
  }
  for (const template of templates) {
    checkFile(template.templateImage, template.instituteId, 'templates');
    for (const image of template.imageFields || []) checkFile(image.imagePath, template.instituteId, 'template-assets');
  }
  return issues;
};

module.exports = { auditDeploymentData };
