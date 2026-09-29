const crypto = require('crypto');
const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');
const QRCode = require('qrcode');
const User = require('../models/User');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Template = require('../models/CertificateTemplate');
const Certificate = require('../models/Certificate');
const Operation = require('../models/CertificateIssuance');
const Lock = require('../models/IssuanceLock');
const Event = require('../models/IssuanceEvent');
const rendering = require('./certificateRenderingService');
const delivery = require('./certificateDeliveryService');
const { getPolicy } = require('../utils/settingsPolicy');
const { createSignedCredential, buildOnlineVerificationUrl } = require('../utils/credentialService');
const { generateCertificateCode } = require('../utils/CertificateCodeGenerator');

const LEASE_MS = 5 * 60 * 1000;
const fail = (status, message) => Object.assign(new Error(message), { status });
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const transaction = work => mongoose.connection.transaction(work, {
  readPreference: 'primary', readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }
});
const event = (op, kind, session, certificateId) => Event.create([{
  instituteId: op.instituteId, operationId: op._id, actorId: op.actorId,
  attempt: op.attempt, event: kind, certificateId
}], { session });

async function validateActor(actorId, courseId, session = null) {
  const actor = await User.findById(actorId).session(session);
  if (!actor?.isActive || !['institute', 'teacher'].includes(actor.userType)) throw fail(403, 'Issuance is not permitted.');
  const instituteId = actor.userType === 'institute' ? actor._id : actor.instituteId;
  const institute = await User.findOne({ _id: instituteId, userType: 'institute', isActive: true, isVerifiedByAdmin: true }).session(session);
  if (!institute) throw fail(403, 'Your institute is unavailable.');
  if (actor.userType === 'teacher' && (!actor.permissions?.canIssueCertificates ||
      !(actor.assignedCourses || []).some(id => String(id) === String(courseId)))) {
    throw fail(403, 'This course is outside your certificate issuance permissions.');
  }
  return { actor, institute, instituteId };
}

async function validateReferences(input, instituteId, session = null) {
  const course = await Course.findOne({ _id: input.courseId, instituteId, status: 'active' }).session(session);
  if (!course) throw fail(404, 'Course not found or inactive.');
  const student = await Student.findOne({ _id: input.studentId, instituteId, courseId: course._id, status: { $ne: 'inactive' } }).session(session);
  if (!student) throw fail(404, 'Student not found in this course.');
  const template = await Template.findOne({ _id: input.templateId, instituteId, courseId: course._id, isActive: true }).session(session);
  if (!template) throw fail(404, 'Active template not found for this course.');
  return { student, course, template };
}

function normalizeInput(input, legacyCertificateId) {
  for (const name of ['studentId', 'courseId', 'templateId']) {
    if (typeof input[name] !== 'string' || !/^[a-f\d]{24}$/i.test(input[name])) throw fail(400, `Invalid ${name}.`);
  }
  const awardDate = input.awardDate ? new Date(input.awardDate) : null;
  if (awardDate && !Number.isFinite(awardDate.getTime())) throw fail(400, 'Invalid award date.');
  return { studentId: input.studentId.toLowerCase(), courseId: input.courseId.toLowerCase(),
    templateId: input.templateId.toLowerCase(), awardDate: awardDate?.toISOString() || null,
    legacyCertificateId: legacyCertificateId ? String(legacyCertificateId) : null };
}

const lockId = (instituteId, input) => `${instituteId}:${input.studentId}:${input.courseId}`;

async function reserve({ actor, instituteId, input, key, fingerprint }) {
  return transaction(async session => {
    const now = new Date();
    let op = await Operation.findOne({ instituteId, key }).session(session);
    if (op && op.fingerprint !== fingerprint) throw fail(409, 'Idempotency key was already used for different certificate details.');
    if (op?.state === 'consumed') {
      const certificate = await Certificate.findOne({ _id: op.certificateId, instituteId }).session(session);
      if (!certificate) throw fail(409, 'Issued certificate is unavailable. Contact your administrator.');
      return { certificate, replayed: true };
    }
    if (op?.state === 'reserved' && op.leaseUntil > now) throw fail(409, 'Certificate issuance is in progress. Retry with the same key.');
    const duplicate = await Certificate.findOne({ instituteId, studentId: input.studentId, courseId: input.courseId,
      ...(input.legacyCertificateId ? { _id: { $ne: input.legacyCertificateId } } : {}),
      status: { $in: ['draft', 'issued', 'suspended'] } }).session(session);
    if (duplicate) throw fail(409, 'A certificate already exists for this student and course.');
    if (input.legacyCertificateId && !await Certificate.findOne({ _id: input.legacyCertificateId, instituteId, status: 'draft' }).session(session)) {
      throw fail(409, 'Only an existing draft can be issued.');
    }
    const pair = lockId(instituteId, input);
    const held = await Lock.findById(pair).session(session);
    if (held && held.leaseUntil > now) throw fail(409, 'Certificate issuance is in progress for this student and course.');
    if (held) {
      const expired = await Operation.findOneAndUpdate({ _id: held.operationId, attempt: held.attempt, state: 'reserved' },
        { $set: { state: 'released' } }, { new: true, session });
      if (expired) await event(expired, 'released', session);
    }
    if (!op) op = new Operation({ instituteId, key, fingerprint, studentId: input.studentId, courseId: input.courseId, attempt: 0, awardDate: input.awardDate || now });
    op.actorId = actor._id;
    op.attempt += 1;
    op.state = 'reserved';
    op.markModified('state');
    op.leaseUntil = new Date(now.getTime() + LEASE_MS);
    await op.save({ session });
    await Lock.updateOne({ _id: pair }, { $set: { operationId: op._id, attempt: op.attempt, leaseUntil: op.leaseUntil } }, { upsert: true, session });
    await event(op, 'reserved', session);
    return { op };
  });
}

async function release(op, input) {
  return transaction(async session => {
    const current = await Operation.findById(op._id).session(session);
    if (current?.state === 'consumed') {
      return Certificate.findOne({ _id: current.certificateId, instituteId: op.instituteId }).session(session);
    }
    const released = await Operation.findOneAndUpdate({ _id: op._id, attempt: op.attempt, state: 'reserved' },
      { $set: { state: 'released' } }, { new: true, session });
    if (released) {
      await Lock.deleteOne({ _id: lockId(op.instituteId, input), operationId: op._id, attempt: op.attempt }, { session });
      await event(op, 'released', session);
    }
    return null;
  });
}

async function issue({ actorId, input: rawInput, idempotencyKey, legacyCertificateId }) {
  const input = normalizeInput(rawInput, legacyCertificateId);
  if (idempotencyKey !== undefined && (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9:_-]{16,128}$/.test(idempotencyKey))) {
    throw fail(400, 'Idempotency-Key must contain 16-128 letters, numbers, colons, underscores or hyphens.');
  }
  const { actor, institute, instituteId } = await validateActor(actorId, input.courseId);
  const { student, course, template } = await validateReferences(input, instituteId);
  const fingerprint = hash(input);
  const key = idempotencyKey || `automatic:${fingerprint}`;
  let reservation;
  try {
    reservation = await reserve({ actor, instituteId, input, key, fingerprint });
  } catch (error) {
    if (error.code === 11000) throw fail(409, 'Concurrent issuance detected. Retry with the same key.');
    if (error.code === 20 || /Transaction numbers are only allowed/.test(error.message)) throw fail(503, 'Certificate issuance requires a MongoDB replica set or Atlas.');
    throw error;
  }
  if (reservation.replayed) return reservation;
  const { op } = reservation;
  const certificateCode = generateCertificateCode(institute.instituteName);
  const qrCodePath = path.resolve(__dirname, '../uploads/qrcodes', String(instituteId), `${certificateCode}.png`);
  const imagePath = path.resolve(__dirname, '../uploads/generated', String(instituteId), `${certificateCode}.jpg`);
  try {
    const policy = await getPolicy('certificate');
    const validUntil = new Date(op.awardDate.getTime() + policy.defaultValidity * 86400000);
    const credential = await createSignedCredential({ certificateCode, studentName: student.name, courseName: course.courseName,
      awardDate: op.awardDate, validUntil, institute });
    const verificationUrl = buildOnlineVerificationUrl(certificateCode);
    await fs.mkdir(path.dirname(qrCodePath), { recursive: true });
    await QRCode.toFile(qrCodePath, verificationUrl, { width: 360, margin: 1 });
    const generated = await rendering.generateCertificateImage({ template, studentName: student.name, studentEmail: student.email,
      studentPhone: student.phone, courseName: course.courseName, courseCode: course.courseCode, courseDuration: course.duration,
      awardDate: op.awardDate, certificateCode, qrCodeImage: qrCodePath, instituteId, instituteName: institute.instituteName });
    if (!generated) throw fail(500, 'Certificate image generation failed.');
    const certificate = await transaction(async session => {
      // Recheck permissions/references after rendering; do not publish under an expired lease.
      await validateActor(actorId, input.courseId, session);
      await validateReferences(input, instituteId, session);
      const held = await Lock.findOne({ _id: lockId(instituteId, input), operationId: op._id, attempt: op.attempt, leaseUntil: { $gt: new Date() } }).session(session);
      if (!held) throw fail(409, 'Issuance reservation expired. Retry with the same key.');
      const values = { instituteId, studentId: student._id, courseId: course._id, templateId: template._id, issuanceId: op._id,
        certificateCode, studentName: student.name, courseName: course.courseName, awardDate: op.awardDate, validUntil, credential,
        generatedCertificateImage: generated.replace(/\\/g, '/'), qrCodeImage: qrCodePath.replace(/\\/g, '/'), verificationUrl,
        status: 'issued', emailSent: false };
      const lifecycle = { action: 'issued', fromStatus: input.legacyCertificateId ? 'draft' : null, toStatus: 'issued',
        performedBy: actor._id, performedByType: actor.userType, createdAt: new Date() };
      let saved;
      if (input.legacyCertificateId) {
        saved = await Certificate.findOneAndUpdate({ _id: input.legacyCertificateId, instituteId, status: 'draft' },
          { $set: values, $push: { lifecycleEvents: lifecycle } }, { new: true, runValidators: true, session });
        if (!saved) throw fail(409, 'Draft has already changed.');
      } else {
        [saved] = await Certificate.create([{ ...values, lifecycleEvents: [lifecycle] }], { session });
      }
      const completed = await Operation.updateOne({ _id: op._id, attempt: op.attempt, state: 'reserved' },
        { $set: { state: 'consumed', certificateId: saved._id } }, { session });
      if (completed.modifiedCount !== 1) throw fail(409, 'Issuance reservation changed.');
      const updatedStudent = await Student.updateOne({ _id: student._id, instituteId, courseId: course._id }, { $set: { status: 'completed' } }, { session });
      if (updatedStudent.matchedCount !== 1) throw fail(409, 'Student enrollment changed.');
      await event(op, 'consumed', session, saved._id);
      await Lock.deleteOne({ _id: held._id, operationId: op._id, attempt: op.attempt }, { session });
      return saved;
    });
    certificate.$session(null);
    // Delivery is outside the transaction. A retry returns the saved certificate without sending twice.
    try {
      await delivery.sendIssuedCertificateNotification({ certificate, student, institute, baseUrl: process.env.API_URL || 'http://localhost:5000' });
    } catch (error) { console.error('Certificate email failed after issuance:', error.message); }
    return { certificate, replayed: false };
  } catch (error) {
    // Resolve uncertain commit outcomes before deleting files or releasing a reservation.
    let committed;
    try { committed = await release(op, input); }
    catch (recoveryError) {
      console.error('Issuance recovery is pending:', recoveryError.message);
      throw fail(503, 'Issuance outcome is pending. Retry with the same key.');
    }
    if (committed && path.resolve(committed.generatedCertificateImage) === imagePath) return { certificate: committed, replayed: true };
    await Promise.all([qrCodePath, imagePath].map(file => fs.unlink(file).catch(e => {
      if (e.code !== 'ENOENT') console.error('Issuance file cleanup failed:', e.message);
    })));
    if (committed) return { certificate: committed, replayed: true };
    throw error;
  }
}

function responseData(certificate) {
  return { ...certificate.toObject(), ...delivery.buildCertificateUrls({ baseUrl: process.env.API_URL || 'http://localhost:5000',
    instituteId: certificate.instituteId, certificateCode: certificate.certificateCode, generatedImagePath: certificate.generatedCertificateImage }) };
}
function errorResponse(res, error) {
  console.error('Certificate issuance failed:', error.message);
  return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Certificate issuance failed. Retry with the same key.' });
}
async function issueHttp(req, res) {
  try {
    const result = await issue({ actorId: req.userId, input: req.body, idempotencyKey: req.get('Idempotency-Key') });
    return res.status(result.replayed ? 200 : 201).json({ success: true, replayed: result.replayed,
      message: result.replayed ? 'Certificate already issued.' : 'Certificate issued successfully.', data: responseData(result.certificate) });
  } catch (error) { return errorResponse(res, error); }
}
async function bulkHttp(req, res) {
  try {
    const rows = req.body.certificates;
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 100) throw fail(400, 'Provide between 1 and 100 certificates.');
    const actor = await User.findById(req.userId);
    if (actor?.userType !== 'institute' || !actor.isActive) throw fail(403, 'Institute access required.');
    const batchKey = req.get('Idempotency-Key');
    if (batchKey !== undefined && !/^[A-Za-z0-9:_-]{16,128}$/.test(batchKey)) throw fail(400, 'Invalid Idempotency-Key.');
    const results = { successful: [], failed: [] };
    for (const [index, row] of rows.entries()) {
      try {
        if (!row || typeof row.studentEmail !== 'string' || typeof row.courseCode !== 'string') throw fail(400, 'Student email and course code are required.');
        const course = await Course.findOne({ instituteId: actor._id, courseCode: row.courseCode.trim().toUpperCase() });
        if (!course) throw fail(404, 'Course not found.');
        const student = await Student.findOne({ instituteId: actor._id, courseId: course._id, email: row.studentEmail.trim().toLowerCase() });
        if (!student) throw fail(404, 'Student not found in this course.');
        const result = await issue({ actorId: actor._id,
          input: { studentId: String(student._id), courseId: String(course._id), templateId: row.templateId, awardDate: row.awardDate },
          idempotencyKey: batchKey ? `bulk:${hash([batchKey, index])}` : undefined });
        results.successful.push({ studentEmail: student.email, courseCode: course.courseCode, status: result.certificate.status,
          certificateCode: result.certificate.certificateCode, replayed: result.replayed });
      } catch (error) { results.failed.push({ ...row, error: error.status ? error.message : 'Certificate issuance failed.', status: error.status || 500 }); }
    }
    return res.json({ success: true, message: `Bulk issuance completed: ${results.successful.length} successful, ${results.failed.length} failed.`, data: results });
  } catch (error) { return errorResponse(res, error); }
}

module.exports = { issue, issueHttp, bulkHttp, responseData, errorResponse };
