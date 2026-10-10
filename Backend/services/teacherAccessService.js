const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const OTP = require("../models/OTP");
const LoginChallenge = require("../models/LoginChallenge");
const email = require("../utils/emailService");
const { isValidPassword } = require("../utils/validators");
const fail = (status, message) => Object.assign(new Error(message), { status });
const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const HOURS = 24;

function frontendBase() {
  const value = process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw fail(
      503,
      "Password email links are not configured. Contact support.",
    );
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw fail(503, "Password email links are not configured.");
  return url.origin;
}

async function sendTeacherAccess(instituteId, teacherId, invitation = false) {
  const base = frontendBase();
  if (!mongoose.isObjectIdOrHexString(teacherId))
    throw fail(404, "Teacher not found.");
  const teacher = await User.findOne({
    _id: teacherId,
    instituteId,
    userType: "teacher",
  });
  if (!teacher) throw fail(404, "Teacher not found.");
  if (!teacher.isActive)
    throw fail(
      409,
      "Activate the teacher account before sending a password link.",
    );
  const institute = await User.findOne({
    _id: instituteId,
    userType: "institute",
    isActive: true,
  });
  if (!institute) throw fail(403, "Institute is unavailable.");
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hash(token);
  const now = new Date();
  const updated = await User.updateOne(
    {
      _id: teacher._id,
      instituteId,
      userType: "teacher",
      isActive: true,
      $or: [
        { "teacherPasswordSetup.requestedAt": { $exists: false } },
        {
          "teacherPasswordSetup.requestedAt": {
            $lte: new Date(now.getTime() - 60000),
          },
        },
      ],
    },
    {
      $set: {
        teacherPasswordSetup: {
          tokenHash,
          requestedAt: now,
          expiresAt: new Date(now.getTime() + HOURS * 3600000),
          sessionVersion: teacher.sessionVersion || 0,
        },
      },
    },
  );
  if (!updated.modifiedCount)
    throw fail(
      429,
      "Please wait one minute before sending another password link.",
    );
  try {
    await email.sendTeacherAccessEmail({
      to: teacher.email,
      name: teacher.firstName,
      instituteName: institute.instituteName,
      url: `${base}/teacher/set-password#token=${token}`,
      invitation,
      hours: HOURS,
    });
  } catch {
    await User.updateOne(
      { _id: teacher._id, "teacherPasswordSetup.tokenHash": tokenHash },
      { $unset: { teacherPasswordSetup: 1 } },
    );
    throw fail(
      503,
      "Email could not be sent. Check email settings and use Send reset link to try again.",
    );
  }
  return { emailSent: true };
}

async function resetTeacherPassword({
  token,
  instituteId,
  teacherId,
  newPassword,
}) {
  if (!isValidPassword(newPassword))
    throw fail(
      400,
      "Password must be 10-128 characters and include uppercase, lowercase, and a number.",
    );
  const byAdmin = !!instituteId;
  if (!byAdmin && (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)))
    throw fail(
      400,
      "This password link is invalid or expired. Ask your institute for a new link.",
    );
  if (byAdmin && !mongoose.isObjectIdOrHexString(teacherId))
    throw fail(404, "Teacher not found.");
  return mongoose.connection.transaction(async (session) => {
    const teacher = await User.findOne(
      byAdmin
        ? { _id: teacherId, instituteId, userType: "teacher" }
        : {
            userType: "teacher",
            isActive: true,
            "teacherPasswordSetup.tokenHash": hash(token),
            "teacherPasswordSetup.expiresAt": { $gt: new Date() },
          },
    )
      .select("+teacherPasswordSetup")
      .session(session);
    if (!teacher)
      throw fail(
        byAdmin ? 404 : 400,
        byAdmin
          ? "Teacher not found."
          : "This password link is invalid or expired. Ask your institute for a new link.",
      );
    if (
      !byAdmin &&
      teacher.teacherPasswordSetup.sessionVersion !==
        (teacher.sessionVersion || 0)
    )
      throw fail(
        400,
        "This password link is no longer valid. Ask your institute for a new link.",
      );
    if (
      !(await User.exists({
        _id: teacher.instituteId,
        userType: "institute",
        isActive: true,
      }).session(session))
    )
      throw fail(403, "Institute is unavailable.");
    teacher.password = newPassword;
    teacher.sessionVersion = (teacher.sessionVersion || 0) + 1;
    teacher.teacherPasswordSetup = undefined;
    if (!byAdmin) teacher.isEmailVerified = true;
    await teacher.save({ session });
    await OTP.deleteMany({
      email: teacher.email,
      type: "reset_password",
    }).session(session);
    await LoginChallenge.deleteMany({ userId: teacher._id }).session(session);
    await ActivityLog.create(
      [
        {
          user: byAdmin ? instituteId : teacher._id,
          userEmail: byAdmin ? undefined : teacher.email,
          action: byAdmin ? "RESET_USER_PASSWORD" : "PASSWORD_RESET",
          details: {
            teacherId: teacher._id,
            instituteId: teacher.instituteId,
            method: byAdmin ? "institute_admin" : "teacher_email_link",
          },
        },
      ],
      { session },
    );
    return { success: true };
  });
}
module.exports = { sendTeacherAccess, resetTeacherPassword };
