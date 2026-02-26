const Certificate = require('../models/Certificate');
const Student = require('../models/Student');
const Course = require('../models/Course');
const CertificateTemplate = require('../models/CertificateTemplate');
const QRCode = require('qrcode');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { sendCertificateEmail } = require('../utils/emailService');

// Generate certificate with all fields
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
    console.log('Template fields:', template.fields);
    console.log('QR Code position:', template.qrCodePosition);

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

// Issue new certificate
const issueCertificate = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { studentId, courseId, templateId, awardDate } = req.body;

    console.log('Received certificate request:', { studentId, courseId, templateId, awardDate, instituteId });

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
      console.log('Student not found:', studentId);
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    console.log('Student found:', student.name);

    // Get course details
    const course = await Course.findOne({ _id: courseId, instituteId });
    if (!course) {
      console.log('Course not found:', courseId);
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    console.log('Course found:', course.courseName);

    // Get template
    const template = await CertificateTemplate.findOne({ 
      _id: templateId, 
      instituteId,
      courseId 
    });
    
    if (!template) {
      console.log('Template not found:', templateId);
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate template not found' 
      });
    }
    console.log('Template found:', template.templateName);
    console.log('Template fields:', template.fields);
    console.log('Template image path:', template.templateImage);

    // Check if template has fields defined
    if (!template.fields || template.fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Template has no fields defined. Please add fields to the template first.'
      });
    }

    // Check if template image exists
    if (!fs.existsSync(template.templateImage)) {
      console.error('Template image file missing:', template.templateImage);
      return res.status(500).json({
        success: false,
        message: 'Template image file is missing. Please re-upload the template.'
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
      console.log('Certificate already exists:', existingCertificate.certificateCode);
      return res.status(400).json({
        success: false,
        message: 'Certificate already exists for this student in this course'
      });
    }

    // Generate QR code first (this will be used in the certificate)
    const qrCodeDir = path.join(__dirname, '../uploads/qrcodes', instituteId.toString());
    fs.mkdirSync(qrCodeDir, { recursive: true });
    
    // We need a temporary code for the QR code filename
    const tempCode = `TEMP-${Date.now()}`;
    const qrCodePath = path.join(qrCodeDir, `${tempCode}.png`);
    
    // We'll update the filename after we get the real certificate code
    console.log('QR code will be saved at:', qrCodePath);

    // Now create the certificate - the pre-save hook will generate the certificateCode
    const certificate = new Certificate({
      instituteId,
      studentId,
      courseId,
      templateId,
      studentName: student.name,
      courseName: course.courseName,
      awardDate,
      status: 'draft'
      // certificateCode will be auto-generated by the pre-save hook
    });

    await certificate.save();
    console.log('Certificate created with code:', certificate.certificateCode);

    // Now we have the real certificate code, update the QR code filename
    const finalQrCodePath = path.join(qrCodeDir, `${certificate.certificateCode}.png`);
    
    // Rename the temp file if it exists, or generate new QR code
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${certificate.certificateCode}`;
    
    await QRCode.toFile(finalQrCodePath, verificationUrl, {
      width: 200,
      margin: 1
    });
    console.log('QR code generated at:', finalQrCodePath);

    // Generate certificate image with all fields
    let generatedImagePath = null;
    try {
      generatedImagePath = await generateCertificateImage({
        template,
        studentName: student.name,
        courseName: course.courseName,
        awardDate,
        certificateCode: certificate.certificateCode,
        qrCodeImage: finalQrCodePath,
        instituteId
      });
      console.log('Certificate image generated at:', generatedImagePath);
    } catch (imageError) {
      console.error('Image generation failed:', imageError);
      // Continue without image - we'll mark it as draft and can regenerate later
    }

    // Update certificate with generated images
    certificate.generatedCertificateImage = generatedImagePath ? generatedImagePath.replace(/\\/g, '/') : null;
    certificate.qrCodeImage = finalQrCodePath.replace(/\\/g, '/');
    certificate.verificationUrl = verificationUrl;

    await certificate.save();

    // Generate URLs for frontend
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const certificateData = {
      ...certificate.toObject(),
      generatedCertificateUrl: generatedImagePath ? `${baseUrl}/${generatedImagePath.replace(/\\/g, '/')}` : null,
      qrCodeUrl: `${baseUrl}/${finalQrCodePath.replace(/\\/g, '/')}`,
      templateImageUrl: `${baseUrl}/${template.templateImage}`
    };

    res.status(201).json({
      success: true,
      message: generatedImagePath ? 'Certificate created successfully' : 'Certificate created but image generation failed. You can regenerate it later.',
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

// Get certificates for institute
const getCertificates = async (req, res) => {
  try {
    const instituteId = req.user.id;
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
        `${baseUrl}/${cert.generatedCertificateImage}` : null,
      qrCodeUrl: cert.qrCodeImage ? 
        `${baseUrl}/${cert.qrCodeImage}` : null
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

// Get certificate by ID
const getCertificateById = async (req, res) => {
  try {
    const instituteId = req.user.id;
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
        `${baseUrl}/${certificate.generatedCertificateImage}` : null,
      qrCodeUrl: certificate.qrCodeImage ? 
        `${baseUrl}/${certificate.qrCodeImage}` : null,
      templateImageUrl: certificate.templateId?.templateImage ?
        `${baseUrl}/${certificate.templateId.templateImage}` : null
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

// Update certificate status
const updateCertificateStatus = async (req, res) => {
  try {
    const instituteId = req.user.id;
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
    const instituteId = req.user.id;
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
    const certificateUrl = `${baseUrl}/${certificate.generatedCertificateImage}`;

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

// Verify certificate (public)
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
          status: certificate.status,
          revokedAt: certificate.revokedAt
        }
      });
    }

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const certificateImageUrl = certificate.generatedCertificateImage ?
      `${baseUrl}/${certificate.generatedCertificateImage}` : null;

    res.json({
      success: true,
      data: {
        certificateCode: certificate.certificateCode,
        studentName: certificate.studentName,
        courseName: certificate.courseName,
        awardDate: certificate.awardDate,
        instituteName: certificate.instituteId?.instituteName,
        status: certificate.status,
        issuedAt: certificate.createdAt,
        certificateImage: certificateImageUrl
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

// Regenerate certificate image
const regenerateCertificateImage = async (req, res) => {
  try {
    const instituteId = req.user.id;
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
    await certificate.save();

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    res.json({
      success: true,
      message: 'Certificate image regenerated successfully',
      data: {
        ...certificate.toObject(),
        generatedCertificateUrl: `${baseUrl}/${generatedImagePath.replace(/\\/g, '/')}`
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

module.exports = {
  issueCertificate,
  getCertificates,
  getCertificateById,
  updateCertificateStatus,
  sendCertificateEmail: sendCertificateEmailHandler,
  verifyCertificate,
  regenerateCertificateImage
};