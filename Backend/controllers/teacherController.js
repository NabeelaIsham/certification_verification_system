// Stable route-facing exports; implementations are grouped by responsibility.
module.exports = {
  ...require('./teachers/teacherCreation'),
  ...require('./teachers/teacherAdministration'),
  ...require('./teachers/teacherAuthentication'),
  ...require('./teachers/teacherProfile'),
  ...require('./teachers/teacherStudents'),
  ...require('./teachers/teacherCourses'),
  ...require('./teachers/teacherCertificates')
};
