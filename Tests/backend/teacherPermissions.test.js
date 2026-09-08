jest.mock('../../Backend/models/User', () => ({ findOne: jest.fn() }));
jest.mock('../../Backend/models/Student', () => ({ findOne: jest.fn() }));
jest.mock('../../Backend/models/Course', () => ({ find: jest.fn() }));
const User = require('../../Backend/models/User');
const Student = require('../../Backend/models/Student');
const permission = require('../../Backend/middleware/teacherPermission');
const course = '507f1f77bcf86cd799439011';
const student = '507f1f77bcf86cd799439012';
const run = async (key, enabled, body = {}, params = {}, action = true) => {
  const req = { user: { userType: 'teacher', instituteId: 'institute', permissions: { [key]: enabled }, assignedCourses: [course] }, body, params };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }; const next = jest.fn();
  await permission(key, action)(req, res, next); return { req, res, next };
};
beforeEach(() => { jest.clearAllMocks(); User.findOne.mockResolvedValue({ isActive: true }); Student.findOne.mockResolvedValue({ courseId: course }); });
test.each(['canCreateStudents', 'canEditStudents', 'canDeleteStudents', 'canIssueCertificates', 'canBulkUpload', 'canCreateCourses'])('%s rejects disabled permission', async key => {
  const { res, next } = await run(key, false); expect(res.status).toHaveBeenCalledWith(403); expect(next).not.toHaveBeenCalled();
});
test.each(['canCreateStudents', 'canEditStudents', 'canDeleteStudents', 'canIssueCertificates', 'canBulkUpload', 'canCreateCourses'])('%s allows granted permission in own scope', async key => {
  const { req, next } = await run(key, true); expect(next).toHaveBeenCalled(); expect(req.instituteId).toBe('institute'); expect(req.allowedCourseIds).toEqual([course]);
});
test('rejects unassigned destination course', async () => {
  const { res, next } = await run('canEditStudents', true, { courseId: 'other' }, { id: student });
  expect(res.status).toHaveBeenCalledWith(403); expect(next).not.toHaveBeenCalled();
});
test('rejects a student outside the institute or assigned courses', async () => {
  Student.findOne.mockResolvedValue(null);
  const { res, next } = await run('canDeleteStudents', true, {}, { id: student });
  expect(Student.findOne).toHaveBeenCalledWith({ _id: student, instituteId: 'institute', courseId: { $in: [course] } });
  expect(res.status).toHaveBeenCalledWith(404); expect(next).not.toHaveBeenCalled();
});
test('ignores forged institute and privileged fields', async () => {
  const { req, next } = await run('canCreateStudents', true, { name: 'Student', courseId: course, instituteId: 'other', permissions: { all: true } });
  expect(next).toHaveBeenCalled(); expect(req.body).toEqual({ name: 'Student', courseId: course });
});
test('inactive institute blocks even permitted teachers', async () => {
  User.findOne.mockResolvedValue(null);
  const { res, next } = await run('canCreateCourses', true); expect(res.status).toHaveBeenCalledWith(403); expect(next).not.toHaveBeenCalled();
});
test('bulk upload only looks up courses assigned to the teacher', async () => {
  const Course = require('../../Backend/models/Course');
  Course.find.mockResolvedValue([]);
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await require('../../Backend/controllers/studentController').bulkUploadStudents({ user: { id: 'teacher' }, instituteId: 'institute', allowedCourseIds: [course], body: { students: [{ name: 'Ada', email: 'ada@example.com', courseCode: 'UNASSIGNED' }] } }, res);
  expect(Course.find).toHaveBeenCalledWith({ instituteId: 'institute', _id: { $in: [course] } });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ successful: [], failed: [expect.objectContaining({ email: 'ada@example.com' })] }) }));
});
