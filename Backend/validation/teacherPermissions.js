const permissionNames = new Set([
  'canCreateStudents', 'canEditStudents', 'canDeleteStudents',
  'canIssueCertificates', 'canBulkUpload', 'canCreateCourses', 'canEditCourses'
]);

const isValidTeacherPermissions = permissions => permissions === undefined || (
  permissions !== null && typeof permissions === 'object' && !Array.isArray(permissions) &&
  Object.entries(permissions).every(([key, value]) => permissionNames.has(key) && typeof value === 'boolean')
);

module.exports = { isValidTeacherPermissions };
