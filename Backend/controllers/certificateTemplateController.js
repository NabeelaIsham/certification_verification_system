const CertificateTemplate = require('../models/CertificateTemplate');

// Create a new certificate template
const createTemplate = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { 
      templateId, 
      templateName, 
      courseName, 
      layout, 
      design, 
      fields,
      isDefault 
    } = req.body;

    // Validate required fields
    if (!templateId || !templateName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Template ID and Template Name are required' 
      });
    }

    // Check if template ID already exists for this institute
    const existingTemplate = await CertificateTemplate.findOne({ 
      instituteId, 
      templateId 
    });
    
    if (existingTemplate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Template ID already exists for this institute' 
      });
    }

    // If this is set as default, remove default from other templates
    if (isDefault) {
      await CertificateTemplate.updateMany(
        { instituteId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const template = new CertificateTemplate({
      instituteId,
      templateId: templateId.toUpperCase(),
      templateName,
      courseName,
      layout: layout || 'standard',
      design: {
        backgroundColor: design?.backgroundColor || '#ffffff',
        fontFamily: design?.fontFamily || 'Arial, sans-serif',
        borderStyle: design?.borderStyle || '2px solid #2563eb',
        logo: design?.logo || '',
        signature: design?.signature || ''
      },
      fields: fields || [],
      isDefault: isDefault || false
    });

    await template.save();

    res.status(201).json({
      success: true,
      message: 'Certificate template created successfully',
      data: template
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all templates for an institute
const getTemplates = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { search, layout } = req.query;

    let query = { instituteId };
    
    // Add search filter
    if (search) {
      query.$or = [
        { templateName: { $regex: search, $options: 'i' } },
        { templateId: { $regex: search, $options: 'i' } },
        { courseName: { $regex: search, $options: 'i' } }
      ];
    }

    // Add layout filter
    if (layout && layout !== 'all') {
      query.layout = layout;
    }

    const templates = await CertificateTemplate.find(query)
      .sort({ isDefault: -1, createdAt: -1 });

    // Get default template
    const defaultTemplate = templates.find(t => t.isDefault);

    res.json({
      success: true,
      data: templates,
      defaultTemplate: defaultTemplate || null,
      counts: {
        total: templates.length,
        standard: templates.filter(t => t.layout === 'standard').length,
        premium: templates.filter(t => t.layout === 'premium').length,
        simple: templates.filter(t => t.layout === 'simple').length
      }
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch templates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single template by ID
const getTemplateById = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    const template = await CertificateTemplate.findOne({ 
      _id: id, 
      instituteId 
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Get template by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get template by templateId (the custom ID field)
const getTemplateByCustomId = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { templateId } = req.params;

    const template = await CertificateTemplate.findOne({ 
      instituteId, 
      templateId: templateId.toUpperCase() 
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Get template by custom ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch template'
    });
  }
};

// Update template
const updateTemplate = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain fields
    delete updates._id;
    delete updates.instituteId;
    delete updates.createdAt;

    // If updating templateId, check if it's already taken
    if (updates.templateId) {
      const existingTemplate = await CertificateTemplate.findOne({ 
        instituteId, 
        templateId: updates.templateId.toUpperCase(),
        _id: { $ne: id }
      });
      
      if (existingTemplate) {
        return res.status(400).json({ 
          success: false, 
          message: 'Template ID already exists for another template' 
        });
      }
      updates.templateId = updates.templateId.toUpperCase();
    }

    // If setting as default, remove default from others
    if (updates.isDefault) {
      await CertificateTemplate.updateMany(
        { instituteId, isDefault: true, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
    }

    // Handle nested design object updates
    if (updates.design) {
      const currentTemplate = await CertificateTemplate.findById(id);
      if (currentTemplate) {
        updates.design = {
          ...currentTemplate.design.toObject(),
          ...updates.design
        };
      }
    }

    const template = await CertificateTemplate.findOneAndUpdate(
      { _id: id, instituteId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete template
const deleteTemplate = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    // Check if template is being used by any courses
    const Course = require('../models/Course');
    const coursesUsingTemplate = await Course.countDocuments({ 
      certificateTemplateId: id, 
      instituteId 
    });

    if (coursesUsingTemplate > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete template that is being used by courses. Please reassign courses first.' 
      });
    }

    // Check if template is being used by any certificates
    const Certificate = require('../models/Certificate');
    const certificatesUsingTemplate = await Certificate.countDocuments({ 
      templateId: id, 
      instituteId 
    });

    if (certificatesUsingTemplate > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete template that has been used for certificates.' 
      });
    }

    const template = await CertificateTemplate.findOneAndDelete({ 
      _id: id, 
      instituteId 
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    // If this was the default template, set another as default
    if (template.isDefault) {
      const anotherTemplate = await CertificateTemplate.findOne({ 
        instituteId, 
        _id: { $ne: id } 
      });
      
      if (anotherTemplate) {
        anotherTemplate.isDefault = true;
        await anotherTemplate.save();
      }
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Duplicate template
const duplicateTemplate = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    const sourceTemplate = await CertificateTemplate.findOne({ 
      _id: id, 
      instituteId 
    });

    if (!sourceTemplate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    // Generate new template ID
    const newTemplateId = `${sourceTemplate.templateId}_COPY_${Date.now()}`;

    // Create duplicate
    const duplicateData = sourceTemplate.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    
    duplicateData.templateId = newTemplateId;
    duplicateData.templateName = `${sourceTemplate.templateName} (Copy)`;
    duplicateData.isDefault = false;

    const newTemplate = new CertificateTemplate({
      ...duplicateData,
      instituteId
    });

    await newTemplate.save();

    res.status(201).json({
      success: true,
      message: 'Template duplicated successfully',
      data: newTemplate
    });
  } catch (error) {
    console.error('Duplicate template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to duplicate template'
    });
  }
};

// Set as default template
const setAsDefaultTemplate = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    // Remove default from all templates
    await CertificateTemplate.updateMany(
      { instituteId },
      { $set: { isDefault: false } }
    );

    // Set this template as default
    const template = await CertificateTemplate.findOneAndUpdate(
      { _id: id, instituteId },
      { $set: { isDefault: true } },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    res.json({
      success: true,
      message: 'Template set as default successfully',
      data: template
    });
  } catch (error) {
    console.error('Set default template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to set template as default'
    });
  }
};

// Preview template (return design data for preview)
const previewTemplate = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    const template = await CertificateTemplate.findOne({ 
      _id: id, 
      instituteId 
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    // Generate preview data
    const previewData = {
      templateId: template.templateId,
      templateName: template.templateName,
      layout: template.layout,
      design: template.design,
      sampleCertificate: {
        studentName: 'John Doe',
        courseName: template.courseName || 'Sample Course',
        awardDate: new Date().toLocaleDateString(),
        certificateCode: 'CERT-2024-0001'
      }
    };

    res.json({
      success: true,
      data: previewData
    });
  } catch (error) {
    console.error('Preview template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate template preview'
    });
  }
};

// Export all functions
module.exports = {
  createTemplate,
  getTemplates,
  getTemplateById,
  getTemplateByCustomId,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  setAsDefaultTemplate,
  previewTemplate
};