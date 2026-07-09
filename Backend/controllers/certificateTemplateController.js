const CertificateTemplate = require('../models/CertificateTemplate');
const Course = require('../models/Course');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Configure multer for template image and asset upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = file.fieldname === 'assetImages' ? 'template-assets' : 'templates';
    const dir = path.join(__dirname, '..', 'uploads', folder, req.user.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = file.fieldname === 'assetImages' ? 'asset-' : 'template-';
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
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
}).fields([
  { name: 'templateImage', maxCount: 1 },
  { name: 'assetImages', maxCount: 20 }
]);

const toRelativeUploadPath = (filePath) => path
  .relative(path.join(__dirname, '..'), filePath)
  .replace(/\\/g, '/');

const addTemplateAssetUrls = (template, baseUrl) => ({
  ...template.toObject(),
  templateImageUrl: `${baseUrl}/${template.templateImage}`,
  imageFields: (template.imageFields || []).map(field => {
    const fieldObject = field.toObject?.() || field;
    return {
      ...fieldObject,
      imageUrl: `${baseUrl}/${fieldObject.imagePath}`
    };
  })
});

// Create new template
const createTemplate = async (req, res) => {
  try {
    upload(req, res, async function(err) {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      try {
        const instituteId = req.user.id;
        const { templateName, courseId, fields, imageFields, qrCodePosition } = req.body;

        const templateFile = req.files?.templateImage?.[0];
        if (!templateFile) {
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
        let parsedImageFields = [];
        let parsedQrPosition = { x: 0, y: 0, size: 100 };

        try {
          if (fields) parsedFields = JSON.parse(fields);
          if (imageFields) parsedImageFields = JSON.parse(imageFields);
          if (qrCodePosition) parsedQrPosition = JSON.parse(qrCodePosition);
        } catch (e) {
          console.error('Error parsing fields:', e);
        }

        const assetFiles = req.files?.assetImages || [];
        const imageFieldsWithPaths = parsedImageFields.map((field, index) => ({
          ...field,
          imagePath: assetFiles[index]
            ? toRelativeUploadPath(assetFiles[index].path)
            : field.imagePath
        })).filter(field => field.imagePath);

        const templatePath = toRelativeUploadPath(templateFile.path);

        const template = new CertificateTemplate({
          instituteId,
          templateName,
          courseId,
          templateImage: templatePath,
          fields: parsedFields,
          imageFields: imageFieldsWithPaths,
          qrCodePosition: parsedQrPosition,
          isActive: true
        });

        await template.save();

        res.status(201).json({
          success: true,
          message: 'Certificate template created successfully',
          data: addTemplateAssetUrls(template, process.env.API_URL || 'http://localhost:5000')
        });
      } catch (error) {
        console.error('Create template error:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Failed to create template',
          error: error.message
        });
      }
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
    const templatesWithUrl = templates.map(template => addTemplateAssetUrls(template, baseUrl));

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
    const templateWithUrl = addTemplateAssetUrls(template, baseUrl);

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
    const { fields, imageFields, qrCodePosition } = req.body;

    const template = await CertificateTemplate.findOne({ _id: id, instituteId });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    template.fields = fields || template.fields;
    template.imageFields = imageFields || template.imageFields;
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
    for (const imageField of template.imageFields || []) {
      if (imageField.imagePath && fs.existsSync(imageField.imagePath)) {
        fs.unlinkSync(imageField.imagePath);
      }
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
