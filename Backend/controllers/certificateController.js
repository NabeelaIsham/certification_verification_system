const Certificate = require('../models/Certificate');
const Student = require('../models/Student');
const Course = require('../models/Course');
const CertificateTemplate = require('../models/CertificateTemplate');
const QRCode = require('qrcode');
const { generateCertificatePDF } = require('../utils/pdfGenerator');
const { sendCertificateEmail } = require('../utils/emailService');

// Issue a new certificate
const issueCertificate = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { studentId, courseId, templateId, awardDate } = req.body;

    // Validate required fields
    if (!studentId || !courseId || !templateId || !awardDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student, course, template, and award date are required' 
      });
    }

    // Get student details
    const student = await Student.findOne({ _id: studentId, instituteId });
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Get course details
    const course = await Course.findOne({ _id: courseId, instituteId });
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }

    // Get template details
    const template = await CertificateTemplate.findOne({ 
      _id: templateId, 
      instituteId 
    });
    
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate template not found' 
      });
    }

    // Check if certificate already exists for this student and course
    const existingCertificate = await Certificate.findOne({
      instituteId,
      studentId,
      courseId,
      status: 'issued'
    });

    if (existingCertificate) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already issued for this student in this course'
      });
    }

    // Generate unique certificate code
    const certificateCode = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

    // Generate QR Code
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${certificateCode}`;
    const qrCode = await QRCode.toDataURL(verificationUrl);

    // Generate certificate PDF
    let certificateUrl = '';
    try {
      certificateUrl = await generateCertificatePDF({
        studentName: student.name,
        courseName: course.courseName,
        awardDate,
        certificateCode,
        template,
        qrCode,
        instituteId
      });
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      // Continue without PDF, we can generate it later
    }

    // Create certificate record
    const certificate = new Certificate({
      instituteId,
      studentId,
      courseId,
      templateId,
      certificateCode,
      studentName: student.name,
      courseName: course.courseName,
      awardDate,
      qrCode,
      qrCodeData: verificationUrl,
      certificateUrl,
      status: 'issued',
      metadata: {
        issuedBy: req.user.id,
        issuedAt: new Date(),
        verificationUrl
      }
    });

    await certificate.save();

    // Update student status to completed if needed
    if (student.status !== 'completed') {
      student.status = 'completed';
      await student.save();
    }

    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      data: certificate
    });
  } catch (error) {
    console.error('Issue certificate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to issue certificate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all certificates for an institute
const getCertificates = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { 
      search, 
      courseId, 
      studentId, 
      status, 
      startDate, 
      endDate,
      page = 1, 
      limit = 10 
    } = req.query;

    let query = { instituteId };
    
    // Add search filter
    if (search) {
      query.$or = [
        { certificateCode: { $regex: search, $options: 'i' } },
        { studentName: { $regex: search, $options: 'i' } },
        { courseName: { $regex: search, $options: 'i' } }
      ];
    }

    // Add course filter
    if (courseId && courseId !== 'all') {
      query.courseId = courseId;
    }

    // Add student filter
    if (studentId && studentId !== 'all') {
      query.studentId = studentId;
    }

    // Add status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Add date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get certificates with pagination
    const certificates = await Certificate.find(query)
      .populate('studentId', 'name email phone')
      .populate('courseId', 'courseName courseCode')
      .populate('templateId', 'templateName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Certificate.countDocuments(query);

    // Get statistics
    const [issuedCount, revokedCount, pendingCount] = await Promise.all([
      Certificate.countDocuments({ instituteId, status: 'issued' }),
      Certificate.countDocuments({ instituteId, status: 'revoked' }),
      Certificate.countDocuments({ instituteId, status: 'pending' })
    ]);

    res.json({
      success: true,
      data: certificates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        total: await Certificate.countDocuments({ instituteId }),
        issued: issuedCount,
        revoked: revokedCount,
        pending: pendingCount
      }
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch certificates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single certificate by ID
const getCertificateById = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    const certificate = await Certificate.findOne({ _id: id, instituteId })
      .populate('studentId', 'name email phone')
      .populate('courseId', 'courseName courseCode description')
      .populate('templateId', 'templateName layout design');

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found' 
      });
    }

    res.json({
      success: true,
      data: certificate
    });
  } catch (error) {
    console.error('Get certificate by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch certificate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get certificate by certificate code (public verification)
const verifyCertificate = async (req, res) => {
  try {
    const { code } = req.params;

    const certificate = await Certificate.findOne({ certificateCode: code })
      .populate('studentId', 'name')
      .populate('courseId', 'courseName')
      .populate('instituteId', 'instituteName');

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found' 
      });
    }

    if (certificate.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'This certificate has been revoked',
        data: {
          certificateCode: certificate.certificateCode,
          studentName: certificate.studentName,
          courseName: certificate.courseName,
          status: certificate.status,
          revokedAt: certificate.revokedAt
        }
      });
    }

    res.json({
      success: true,
      data: {
        certificateCode: certificate.certificateCode,
        studentName: certificate.studentName,
        courseName: certificate.courseName,
        awardDate: certificate.awardDate,
        instituteName: certificate.instituteId?.instituteName || 'Institute',
        status: certificate.status,
        issuedAt: certificate.createdAt
      }
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify certificate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Send certificate email
const sendCertificateEmailHandler = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    const certificate = await Certificate.findOne({ _id: id, instituteId })
      .populate('studentId')
      .populate('courseId')
      .populate('instituteId', 'instituteName email');

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found' 
      });
    }

    if (!certificate.studentId || !certificate.studentId.email) {
      return res.status(400).json({
        success: false,
        message: 'Student email not found'
      });
    }

    // Send email
    try {
      await sendCertificateEmail({
        to: certificate.studentId.email,
        studentName: certificate.studentName,
        courseName: certificate.courseName,
        awardDate: certificate.awardDate,
        certificateCode: certificate.certificateCode,
        certificateUrl: certificate.certificateUrl,
        verificationUrl: certificate.qrCodeData,
        instituteName: certificate.instituteId?.instituteName
      });

      // Update email sent status
      certificate.emailSent = true;
      certificate.emailSentAt = new Date();
      await certificate.save();

      res.json({
        success: true,
        message: 'Certificate email sent successfully'
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: emailError.message
      });
    }
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send certificate email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Revoke certificate
const revokeCertificate = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const certificate = await Certificate.findOne({ _id: id, instituteId });

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found' 
      });
    }

    if (certificate.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'Certificate is already revoked'
      });
    }

    certificate.status = 'revoked';
    certificate.revokedAt = new Date();
    certificate.revokedBy = req.user.id;
    certificate.revocationReason = reason || 'Revoked by institute';

    await certificate.save();

    res.json({
      success: true,
      message: 'Certificate revoked successfully',
      data: certificate
    });
  } catch (error) {
    console.error('Revoke certificate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to revoke certificate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Bulk issue certificates
const bulkIssueCertificates = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { certificates } = req.body;

    if (!certificates || !Array.isArray(certificates) || certificates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of certificates'
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const certData of certificates) {
      try {
        // Validate required fields
        if (!certData.studentEmail || !certData.courseCode || !certData.templateId) {
          results.failed.push({
            ...certData,
            error: 'Missing required fields (studentEmail, courseCode, templateId)'
          });
          continue;
        }

        // Find student
        const student = await Student.findOne({ 
          email: certData.studentEmail.toLowerCase(), 
          instituteId 
        });

        if (!student) {
          results.failed.push({
            ...certData,
            error: 'Student not found'
          });
          continue;
        }

        // Find course
        const course = await Course.findOne({ 
          courseCode: certData.courseCode.toUpperCase(), 
          instituteId 
        });

        if (!course) {
          results.failed.push({
            ...certData,
            error: 'Course not found'
          });
          continue;
        }

        // Find template
        const template = await CertificateTemplate.findOne({ 
          templateId: certData.templateId, 
          instituteId 
        });

        if (!template) {
          results.failed.push({
            ...certData,
            error: 'Template not found'
          });
          continue;
        }

        // Check if certificate already exists
        const existingCertificate = await Certificate.findOne({
          instituteId,
          studentId: student._id,
          courseId: course._id,
          status: 'issued'
        });

        if (existingCertificate) {
          results.failed.push({
            ...certData,
            error: 'Certificate already exists for this student and course'
          });
          continue;
        }

        // Generate certificate code
        const certificateCode = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

        // Generate QR Code
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${certificateCode}`;
        const qrCode = await QRCode.toDataURL(verificationUrl);

        // Generate PDF (optional, can be done later)
        let certificateUrl = '';
        try {
          certificateUrl = await generateCertificatePDF({
            studentName: student.name,
            courseName: course.courseName,
            awardDate: certData.awardDate || new Date(),
            certificateCode,
            template,
            qrCode,
            instituteId
          });
        } catch (pdfError) {
          console.error('PDF generation error for bulk:', pdfError);
        }

        // Create certificate
        const certificate = new Certificate({
          instituteId,
          studentId: student._id,
          courseId: course._id,
          templateId: template._id,
          certificateCode,
          studentName: student.name,
          courseName: course.courseName,
          awardDate: certData.awardDate || new Date(),
          qrCode,
          qrCodeData: verificationUrl,
          certificateUrl,
          status: 'issued',
          metadata: {
            issuedBy: req.user.id,
            issuedAt: new Date(),
            verificationUrl
          }
        });

        await certificate.save();

        // Update student status
        if (student.status !== 'completed') {
          student.status = 'completed';
          await student.save();
        }

        results.successful.push({
          studentEmail: student.email,
          courseCode: course.courseCode,
          certificateCode
        });
      } catch (error) {
        results.failed.push({
          ...certData,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk certificate issuance completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error('Bulk issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk certificate issuance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Download certificate PDF
const downloadCertificate = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    const certificate = await Certificate.findOne({ _id: id, instituteId });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    if (!certificate.certificateUrl) {
      return res.status(404).json({
        success: false,
        message: 'Certificate PDF not found'
      });
    }

    // Extract filename from URL
    const filename = certificate.certificateUrl.split('/').pop();
    const filePath = path.join(__dirname, '../uploads/certificates', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Certificate file not found on server'
      });
    }

    res.download(filePath, `certificate-${certificate.certificateCode}.pdf`);
  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download certificate'
    });
  }
};

// Get certificates statistics
const getCertificateStats = async (req, res) => {
  try {
    const instituteId = req.user.id;

    const [
      totalIssued,
      totalRevoked,
      certificatesByCourse,
      certificatesByMonth
    ] = await Promise.all([
      Certificate.countDocuments({ instituteId, status: 'issued' }),
      Certificate.countDocuments({ instituteId, status: 'revoked' }),
      Certificate.aggregate([
        { $match: { instituteId: instituteId } },
        { $group: {
            _id: '$courseId',
            count: { $sum: 1 }
          }
        },
        { $lookup: {
            from: 'courses',
            localField: '_id',
            foreignField: '_id',
            as: 'course'
          }
        },
        { $unwind: '$course' },
        { $project: {
            courseName: '$course.courseName',
            courseCode: '$course.courseCode',
            count: 1
          }
        }
      ]),
      Certificate.aggregate([
        { $match: { instituteId: instituteId } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalIssued,
        totalRevoked,
        byCourse: certificatesByCourse,
        byMonth: certificatesByMonth.map(item => ({
          month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Get certificate stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate statistics'
    });
  }
};

// Export all functions
module.exports = {
  issueCertificate,
  getCertificates,
  getCertificateById,
  verifyCertificate,
  sendCertificateEmail: sendCertificateEmailHandler,
  revokeCertificate,
  bulkIssueCertificates,
  downloadCertificate,
  getCertificateStats
};