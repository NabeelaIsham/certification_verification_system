const Certificate = require('../models/Certificate');
const Student = require('../models/Student');
const Course = require('../models/Course');
const CertificateTemplate = require('../models/CertificateTemplate');
const QRCode = require('qrcode');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { sendCertificateEmail } = require('../utils/emailService');

// ============ HELPER FUNCTION FOR CERTIFICATE IMAGE GENERATION ============

const generateCertificateImage = async (certificateData) => {
  try {
    const { 
      template, 
      studentName, 
      courseName, 
      awardDate, 
      certificateCode,
      qrCodeImage,
      instituteId 
    } = certificateData;

    console.log('Starting certificate image generation...');

    // Check if template image exists
    if (!fs.existsSync(template.templateImage)) {
      throw new Error(`Template image not found at path: ${template.templateImage}`);
    }

    // Load the template image
    const templateImage = sharp(template.templateImage);
    const metadata = await templateImage.metadata();
    console.log('Template image loaded:', metadata);

    // Create a composite image with all fields
    const compositeOperations = [];

    // Add text fields
    if (template.fields && template.fields.length > 0) {
      for (const field of template.fields) {
        let text = '';
        switch (field.fieldName) {
          case 'studentName':
            text = studentName;
            break;
          case 'awardDate':
            text = new Date(awardDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            break;
          case 'certificateCode':
            text = certificateCode;
            break;
          case 'courseName':
            text = courseName;
            break;
          default:
            text = '';
        }

        console.log(`Adding text field ${field.fieldName} at (${field.x}, ${field.y}): "${text}"`);

        // Create SVG for text
        const textSvg = `
          <svg width="${metadata.width}" height="${metadata.height}">
            <style>
              .text {
                font-family: ${field.fontFamily || 'Arial'};
                font-size: ${field.fontSize || 24}px;
                fill: ${field.fontColor || '#000000'};
                text-anchor: ${field.textAlign === 'center' ? 'middle' : field.textAlign === 'right' ? 'end' : 'start'};
              }
            </style>
            <text x="${field.x}" y="${field.y}" class="text">${text}</text>
          </svg>
        `;

        compositeOperations.push({
          input: Buffer.from(textSvg),
          top: 0,
          left: 0
        });
      }
    } else {
      console.log('No fields defined in template');
    }

    // Add QR code
    if (qrCodeImage) {
      if (fs.existsSync(qrCodeImage)) {
        console.log('Adding QR code from:', qrCodeImage);
        compositeOperations.push({
          input: qrCodeImage,
          top: template.qrCodePosition?.y || 0,
          left: template.qrCodePosition?.x || 0,
          width: template.qrCodePosition?.size || 100,
          height: template.qrCodePosition?.size || 100
        });
      } else {
        console.log('QR code image not found:', qrCodeImage);
      }
    }

    // Generate final image
    const outputDir = path.join(__dirname, '../uploads/generated', instituteId.toString());
    fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `${certificateCode}.jpg`);
    console.log('Saving to:', outputPath);
    
    await templateImage
      .composite(compositeOperations)
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    console.log('Certificate image generated successfully');
    return outputPath;
  } catch (error) {
    console.error('Certificate generation error details:', error);
    throw new Error(`Image generation failed: ${error.message}`);
  }
};

// ============ CERTIFICATE CRUD OPERATIONS ============

// Issue new certificate
const issueCertificate = async (req, res) => {
  try {
    const instituteId = req.user.id || req.userId;
    const { studentId, courseId, templateId, awardDate } = req.body;

    console.log('Issuing certificate with data:', { studentId, courseId, templateId, awardDate, instituteId });

    // Validate inputs
    if (!studentId || !courseId || !templateId || !awardDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Get student details
    const student = await Student.findOne({ _id: studentId, instituteId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get course details
    const course = await Course.findOne({ _id: courseId, instituteId });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Get template
    const template = await CertificateTemplate.findOne({ 
      _id: templateId, 
      instituteId,
      courseId 
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
      status: { $in: ['issued', 'draft'] }
    });

    if (existingCertificate) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already exists for this student in this course'
      });
    }

    // Get institute details for certificate code
    const User = require('../models/User');
    const institute = await User.findById(instituteId);
    const instituteCode = institute?.instituteName?.substring(0, 3).toUpperCase() || 'INS';
    
    // Generate unique certificate code
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const certificateCode = `${instituteCode}-${year}${month}${day}-${random}`;

    console.log('Generated certificate code:', certificateCode);

    // Generate QR code
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${certificateCode}`;
    const qrCodeDir = path.join(__dirname, '../uploads/qrcodes', instituteId.toString());
    fs.mkdirSync(qrCodeDir, { recursive: true });
    
    const qrCodePath = path.join(qrCodeDir, `${certificateCode}.png`);
    await QRCode.toFile(qrCodePath, verificationUrl, {
      width: 200,
      margin: 1
    });
    console.log('QR code generated at:', qrCodePath);

    // Generate certificate image with all fields
    let generatedImagePath = null;
    try {
      generatedImagePath = await generateCertificateImage({
        template,
        studentName: student.name,
        courseName: course.courseName,
        awardDate,
        certificateCode,
        qrCodeImage: qrCodePath,
        instituteId
      });
      console.log('Certificate image generated at:', generatedImagePath);
    } catch (imageError) {
      console.error('Image generation failed:', imageError);
      // Continue without image - we'll mark it as draft and can regenerate later
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
      generatedCertificateImage: generatedImagePath ? generatedImagePath.replace(/\\/g, '/') : null,
      qrCodeImage: qrCodePath.replace(/\\/g, '/'),
      verificationUrl,
      status: generatedImagePath ? 'issued' : 'draft',
      emailSent: false
    });

    await certificate.save();

    // Update student status to completed if needed
    if (student.status !== 'completed') {
      student.status = 'completed';
      await student.save();
    }

    console.log('Certificate issued successfully:', certificateCode);

    // Generate URLs for frontend
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    
    // Fix paths for URLs
    const certificateData = {
      ...certificate.toObject(),
      generatedCertificateUrl: generatedImagePath ? 
        `${baseUrl}/uploads/generated/${instituteId}/${certificateCode}.jpg` : null,
      qrCodeUrl: `${baseUrl}/uploads/qrcodes/${instituteId}/${certificateCode}.png`,
      templateImageUrl: `${baseUrl}/${template.templateImage.replace(/\\/g, '/')}`
    };

    res.status(201).json({
      success: true,
      message: generatedImagePath ? 'Certificate issued successfully' : 'Certificate created but image generation failed',
      data: certificateData
    });

  } catch (error) {
    console.error('Issue certificate error details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to issue certificate',
      error: error.message
    });
  }
};

// Get all certificates for an institute
const getCertificates = async (req, res) => {
  try {
    const instituteId = req.user.id || req.userId;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { instituteId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const certificates = await Certificate.find(query)
      .populate('studentId', 'name email')
      .populate('courseId', 'courseName courseCode')
      .populate('templateId', 'templateName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Certificate.countDocuments(query);

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const certificatesWithUrl = certificates.map(cert => ({
      ...cert.toObject(),
      generatedCertificateUrl: cert.generatedCertificateImage ? 
        `${baseUrl}/uploads/generated/${instituteId}/${cert.certificateCode}.jpg` : null,
      qrCodeUrl: cert.qrCodeImage ? 
        `${baseUrl}/uploads/qrcodes/${instituteId}/${cert.certificateCode}.png` : null
    }));

    res.json({
      success: true,
      data: certificatesWithUrl,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch certificates',
      error: error.message
    });
  }
};

// Get single certificate by ID
const getCertificateById = async (req, res) => {
  try {
    const instituteId = req.user.id || req.userId;
    const { id } = req.params;

    const certificate = await Certificate.findOne({ _id: id, instituteId })
      .populate('studentId', 'name email phone')
      .populate('courseId', 'courseName courseCode')
      .populate('templateId');

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found' 
      });
    }

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const certificateWithUrl = {
      ...certificate.toObject(),
      generatedCertificateUrl: certificate.generatedCertificateImage ? 
        `${baseUrl}/uploads/generated/${instituteId}/${certificate.certificateCode}.jpg` : null,
      qrCodeUrl: certificate.qrCodeImage ? 
        `${baseUrl}/uploads/qrcodes/${instituteId}/${certificate.certificateCode}.png` : null,
      templateImageUrl: certificate.templateId?.templateImage ?
        `${baseUrl}/${certificate.templateId.templateImage.replace(/\\/g, '/')}` : null
    };

    res.json({
      success: true,
      data: certificateWithUrl
    });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch certificate',
      error: error.message
    });
  }
};

// Get certificate by certificate code (public verification) - FIXED VERSION
const verifyCertificate = async (req, res) => {
  try {
    const { code } = req.params;

    console.log('Verifying certificate with code:', code);

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
          status: certificate.status,
          revokedAt: certificate.revokedAt
        }
      });
    }

    // Construct proper URLs for images
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    
    // Build image URLs using certificate code and institute ID
    let certificateImageUrl = null;
    if (certificate.generatedCertificateImage) {
      certificateImageUrl = `${baseUrl}/uploads/generated/${certificate.instituteId}/${certificate.certificateCode}.jpg`;
    }

    let qrCodeUrl = null;
    if (certificate.qrCodeImage) {
      qrCodeUrl = `${baseUrl}/uploads/qrcodes/${certificate.instituteId}/${certificate.certificateCode}.png`;
    }

    // Check if files actually exist (optional but good for debugging)
    const imagePath = path.join(__dirname, '../uploads/generated', certificate.instituteId.toString(), `${certificate.certificateCode}.jpg`);
    const imageExists = fs.existsSync(imagePath);
    
    if (!imageExists) {
      console.warn(`Certificate image file missing: ${imagePath}`);
    }

    res.json({
      success: true,
      data: {
        certificateCode: certificate.certificateCode,
        studentName: certificate.studentName,
        courseName: certificate.courseName,
        awardDate: certificate.awardDate,
        instituteName: certificate.instituteId?.instituteName,
        instituteId: certificate.instituteId,
        status: certificate.status,
        issuedAt: certificate.createdAt,
        certificateImage: certificateImageUrl,
        qrCodeImage: qrCodeUrl,
        imageExists: imageExists // Optional: send this for debugging
      }
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify certificate',
      error: error.message
    });
  }
};

// Update certificate status
const updateCertificateStatus = async (req, res) => {
  try {
    const instituteId = req.user.id || req.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'issued', 'revoked'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status' 
      });
    }

    const certificate = await Certificate.findOneAndUpdate(
      { _id: id, instituteId },
      { $set: { status } },
      { new: true }
    );

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found' 
      });
    }

    res.json({
      success: true,
      message: `Certificate ${status} successfully`,
      data: certificate
    });
  } catch (error) {
    console.error('Update certificate status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update certificate status',
      error: error.message
    });
  }
};

// Send certificate email
const sendCertificateEmailHandler = async (req, res) => {
  try {
    const instituteId = req.user.id || req.userId;
    const { id } = req.params;

    const certificate = await Certificate.findOne({ _id: id, instituteId })
      .populate('studentId', 'name email')
      .populate('instituteId', 'instituteName');

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

    if (!certificate.generatedCertificateImage) {
      return res.status(400).json({
        success: false,
        message: 'Certificate image not generated yet. Please regenerate the certificate first.'
      });
    }

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const certificateUrl = `${baseUrl}/uploads/generated/${instituteId}/${certificate.certificateCode}.jpg`;

    await sendCertificateEmail({
      to: certificate.studentId.email,
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      awardDate: certificate.awardDate,
      certificateCode: certificate.certificateCode,
      certificateUrl,
      verificationUrl: certificate.verificationUrl,
      instituteName: certificate.instituteId?.instituteName
    });

    certificate.emailSent = true;
    certificate.emailSentAt = new Date();
    certificate.status = 'issued';
    await certificate.save();

    res.json({
      success: true,
      message: 'Certificate email sent successfully'
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send certificate email',
      error: error.message
    });
  }
};

// Regenerate certificate image
const regenerateCertificateImage = async (req, res) => {
  try {
    const instituteId = req.user.id || req.userId;
    const { id } = req.params;

    const certificate = await Certificate.findOne({ _id: id, instituteId })
      .populate('templateId');

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found' 
      });
    }

    const template = certificate.templateId;
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Get student details
    const student = await Student.findById(certificate.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Generate new QR code
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${certificate.certificateCode}`;
    const qrCodeDir = path.join(__dirname, '../uploads/qrcodes', instituteId.toString());
    fs.mkdirSync(qrCodeDir, { recursive: true });
    
    const qrCodePath = path.join(qrCodeDir, `${certificate.certificateCode}.png`);
    await QRCode.toFile(qrCodePath, verificationUrl, {
      width: 200,
      margin: 1
    });

    // Generate certificate image
    const generatedImagePath = await generateCertificateImage({
      template,
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      awardDate: certificate.awardDate,
      certificateCode: certificate.certificateCode,
      qrCodeImage: qrCodePath,
      instituteId
    });

    // Update certificate
    certificate.generatedCertificateImage = generatedImagePath.replace(/\\/g, '/');
    certificate.qrCodeImage = qrCodePath.replace(/\\/g, '/');
    certificate.status = 'issued';
    await certificate.save();

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    res.json({
      success: true,
      message: 'Certificate image regenerated successfully',
      data: {
        ...certificate.toObject(),
        generatedCertificateUrl: `${baseUrl}/uploads/generated/${instituteId}/${certificate.certificateCode}.jpg`
      }
    });
  } catch (error) {
    console.error('Regenerate certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate certificate image',
      error: error.message
    });
  }
};

// Serve certificate image directly
const getCertificateImage = async (req, res) => {
  try {
    const { instituteId, filename } = req.params;
    
    const imagePath = path.join(__dirname, '../uploads/generated', instituteId, filename);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate image not found' 
      });
    }
    
    // Send the file
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Error serving certificate image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to serve certificate image' 
    });
  }
};

// Bulk issue certificates
const bulkIssueCertificates = async (req, res) => {
  try {
    const instituteId = req.user.id || req.userId;
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

    const User = require('../models/User');
    const institute = await User.findById(instituteId);
    const instituteCode = institute?.instituteName?.substring(0, 3).toUpperCase() || 'INS';

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
          _id: certData.templateId, 
          instituteId,
          courseId: course._id 
        });

        if (!template) {
          results.failed.push({
            ...certData,
            error: 'Template not found or not associated with this course'
          });
          continue;
        }

        // Check if certificate already exists
        const existingCertificate = await Certificate.findOne({
          instituteId,
          studentId: student._id,
          courseId: course._id,
          status: { $in: ['issued', 'draft'] }
        });

        if (existingCertificate) {
          results.failed.push({
            ...certData,
            error: 'Certificate already exists for this student and course'
          });
          continue;
        }

        // Generate certificate code
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const certificateCode = `${instituteCode}-${year}${month}${day}-${random}`;

        // Generate QR code
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${certificateCode}`;
        const qrCodeDir = path.join(__dirname, '../uploads/qrcodes', instituteId.toString());
        fs.mkdirSync(qrCodeDir, { recursive: true });
        
        const qrCodePath = path.join(qrCodeDir, `${certificateCode}.png`);
        await QRCode.toFile(qrCodePath, verificationUrl, {
          width: 200,
          margin: 1
        });

        // Generate certificate image
        let generatedImagePath = null;
        try {
          generatedImagePath = await generateCertificateImage({
            template,
            studentName: student.name,
            courseName: course.courseName,
            awardDate: certData.awardDate || new Date(),
            certificateCode,
            qrCodeImage: qrCodePath,
            instituteId
          });
        } catch (imageError) {
          console.error('Image generation error for bulk:', imageError);
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
          generatedCertificateImage: generatedImagePath ? generatedImagePath.replace(/\\/g, '/') : null,
          qrCodeImage: qrCodePath.replace(/\\/g, '/'),
          verificationUrl,
          status: generatedImagePath ? 'issued' : 'draft',
          emailSent: false
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
      error: error.message
    });
  }
};

// ============ ADDITIONAL ROUTE FOR SERVING CERTIFICATE IMAGES ============
// This is a helper route to serve certificate images directly

// Export all functions
module.exports = {
  issueCertificate,
  getCertificates,
  getCertificateById,
  verifyCertificate,
  updateCertificateStatus,
  sendCertificateEmail: sendCertificateEmailHandler,
  regenerateCertificateImage,
  bulkIssueCertificates,
  getCertificateImage
};