// Stable route-facing exports; implementations are grouped by responsibility.
module.exports = {
  ...require('./admin/overview'),
  ...require('./admin/instituteDirectory'),
  ...require('./admin/instituteReview'),
  ...require('./admin/users'),
  ...require('./admin/certificates'),
  ...require('./admin/settings')
};
