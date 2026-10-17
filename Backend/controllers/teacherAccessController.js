const service = require("../services/teacherAccessService");
const respond = (handler) => async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    await handler(req, res);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({
        success: false,
        message: error.status
          ? error.message
          : "Unable to complete the password request. Please try again.",
      });
  }
};
exports.sendLink = respond(async (req, res) => {
  await service.sendTeacherAccess(req.userId, req.params.id);
  res.json({
    success: true,
    message:
      "A password reset link has been emailed to the teacher. It expires in 24 hours.",
  });
});
exports.adminReset = respond(async (req, res) => {
  await service.resetTeacherPassword({
    instituteId: req.userId,
    teacherId: req.params.id,
    newPassword: req.body.newPassword,
  });
  res.json({
    success: true,
    message:
      "Teacher password updated. Existing sessions and password links have been revoked. Share the new password securely with the teacher.",
  });
});
exports.complete = respond(async (req, res) => {
  await service.resetTeacherPassword({
    token: req.body.token,
    newPassword: req.body.newPassword,
  });
  res.json({
    success: true,
    message:
      "Your password has been set. Sign in to access your teacher dashboard.",
  });
});
