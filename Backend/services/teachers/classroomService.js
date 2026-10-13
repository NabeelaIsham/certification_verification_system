const User = require('../../models/User');
const Course = require('../../models/Course');
const Student = require('../../models/Student');
const Certificate = require('../../models/Certificate');
const { appLogger } = require('../../utils/logger');
async function listTeacherCourses(teacherId) {
  const teacher = await User.findById(teacherId);
  if (!teacher || teacher.userType !== 'teacher') {
    throw Object.assign(new Error('Teacher not found'), {
      status: 404
    });
  }
  if (!teacher.assignedCourses || teacher.assignedCourses.length === 0) {
    return {
      success: true,
      data: []
    };
  }

  // Get detailed course information for assigned courses
  const courses = await Course.find({
    _id: {
      $in: teacher.assignedCourses
    },
    instituteId: teacher.instituteId,
    status: 'active'
  }).select('courseName courseCode description');

  // Get student count and certificate count for each course
  const coursesWithStats = await Promise.all(
    courses.map(async (course) => {
      const studentCount = await Student.countDocuments({
        instituteId: teacher.instituteId,
        courseId: course._id
      });
      const certificateCount = await Certificate.countDocuments({
        instituteId: teacher.instituteId,
        courseId: course._id,
        status: 'issued'
      });
      return {
        ...course.toObject(),
        studentCount,
        certificateCount,
        pendingCount: studentCount - certificateCount
      };
    })
  );
  return {
    success: true,
    data: coursesWithStats
  };
}
async function listTeacherStudents(teacherId) {
  const teacher = await User.findById(teacherId);
  if (!teacher || teacher.userType !== 'teacher') {
    throw Object.assign(new Error('Teacher not found'), {
      status: 404
    });
  }
  appLogger.log('Teacher institute ID:', teacher.instituteId);
  appLogger.log('Teacher assigned courses:', teacher.assignedCourses);

  // If no courses assigned, return empty array
  if (!teacher.assignedCourses || teacher.assignedCourses.length === 0) {
    return {
      success: true,
      data: [],
      message: 'No courses assigned to you'
    };
  }

  // Get students that belong to:
  // 1. The same institute as the teacher
  // 2. Courses that are in the teacher's assignedCourses array
  const students = await Student.find({
    instituteId: teacher.instituteId,
    // CRITICAL: Filter by institute
    courseId: {
      $in: teacher.assignedCourses
    } // CRITICAL: Filter by assigned courses
  }).populate({
    path: 'courseId',
    select: 'courseName courseCode'
  });
  appLogger.log(
    `Found ${students.length} students for teacher ${teacher.email}`
  );

  // Get certificate status for each student
  const studentsWithStatus = await Promise.all(
    students.map(async (student) => {
      const certificate = await Certificate.findOne({
        studentId: student._id,
        courseId: student.courseId?._id,
        instituteId: teacher.instituteId,
        status: 'issued'
      }).select('certificateCode awardDate');
      return {
        ...student.toObject(),
        hasCertificate: !!certificate,
        certificateCode: certificate?.certificateCode,
        certificateDate: certificate?.awardDate
      };
    })
  );
  return {
    success: true,
    data: studentsWithStatus,
    total: studentsWithStatus.length,
    instituteId: teacher.instituteId
  };
}
module.exports = {
  listTeacherCourses,
  listTeacherStudents
};
