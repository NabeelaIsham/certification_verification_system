const CertificateTemplate = require('../models/CertificateTemplate');
const Course = require('../models/Course');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Configure multer for template image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = `uploads/templates/${req.user.id}`;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'template-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
}).single('templateImage');

// Create new template
const createTemplate = async (req, res) => {
  try {
    upload(req, res, async function(err) {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      const instituteId = req.user.id;
      const { templateName, courseId, fields, qrCodePosition } = req.body;

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Template image is required' 
        });
      }

      // Verify course belongs to institute
      const course = await Course.findOne({ _id: courseId, instituteId });
      if (!course) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid course selected' 
        });
      }

      // Parse fields from JSON string
      let parsedFields = [];
      let parsedQrPosition = { x: 0, y: 0, size: 100 };

      try {
        if (fields) parsedFields = JSON.parse(fields);
        if (qrCodePosition) parsedQrPosition = JSON.parse(qrCodePosition);
      } catch (e) {
        console.error('Error parsing fields:', e);
      }

      const template = new CertificateTemplate({
        instituteId,
        templateName,
        courseId,
        templateImage: req.file.path.replace(/\\/g, '/'),
        fields: parsedFields,
        qrCodePosition: parsedQrPosition,
        isActive: true
      });

      await template.save();

      res.status(201).json({
        success: true,
        message: 'Certificate template created successfully',
        data: template
      });
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create template',
      error: error.message
    });
  }
};

// Get templates for institute
const getTemplates = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { courseId } = req.query;

    let query = { instituteId };
    if (courseId) {
      query.courseId = courseId;
    }

    const templates = await CertificateTemplate.find(query)
      .populate('courseId', 'courseName courseCode')
      .sort({ createdAt: -1 });

    // Add full URL for template images
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const templatesWithUrl = templates.map(template => ({
      ...template.toObject(),
      templateImageUrl: `${baseUrl}/${template.templateImage}`
    }));

    res.json({
      success: true,
      data: templatesWithUrl
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
};

// Get template by ID
const getTemplateById = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    const template = await CertificateTemplate.findOne({ _id: id, instituteId })
      .populate('courseId', 'courseName courseCode');

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const templateWithUrl = {
      ...template.toObject(),
      templateImageUrl: `${baseUrl}/${template.templateImage}`
    };

    res.json({
      success: true,
      data: templateWithUrl
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch template',
      error: error.message
    });
  }
};

// Update template fields
const updateTemplateFields = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;
    const { fields, qrCodePosition } = req.body;

    const template = await CertificateTemplate.findOne({ _id: id, instituteId });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    template.fields = fields || template.fields;
    template.qrCodePosition = qrCodePosition || template.qrCodePosition;
    template.updatedAt = new Date();

    await template.save();

    res.json({
      success: true,
      message: 'Template fields updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Update template fields error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update template fields',
      error: error.message
    });
  }
};

// Delete template
const deleteTemplate = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    const template = await CertificateTemplate.findOne({ _id: id, instituteId });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    // Delete template image file
    if (template.templateImage && fs.existsSync(template.templateImage)) {
      fs.unlinkSync(template.templateImage);
    }

    await template.deleteOne();

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete template',
      error: error.message
    });
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplateFields,
  deleteTemplate
};