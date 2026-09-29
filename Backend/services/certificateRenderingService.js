const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { tenantFile } = require('../utils/tenantFiles');

const escapeSvgText = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const getSvgFontFamily = (fontFamily) => {
  const requestedFont = String(fontFamily || '').replace(/[;"<>]/g, '').trim();
  const fallbackFonts = '"Liberation Sans", "DejaVu Sans", sans-serif';

  return requestedFont ? `"${requestedFont}", ${fallbackFonts}` : fallbackFonts;
};

const formatAwardDate = (awardDate) => new Date(awardDate).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

const getCertificateFieldText = (field, data) => {
  switch (field.fieldName) {
    case 'studentName':
      return data.studentName;
    case 'studentEmail':
      return data.studentEmail;
    case 'studentPhone':
      return data.studentPhone;
    case 'courseName':
      return data.courseName;
    case 'courseCode':
      return data.courseCode;
    case 'courseDuration':
      return data.courseDuration;
    case 'awardDate':
      return formatAwardDate(data.awardDate);
    case 'certificateCode':
      return data.certificateCode;
    case 'instituteName':
      return data.instituteName;
    case 'staticText':
      return field.staticValue || field.displayName || '';
    default:
      return '';
  }
};

// ============ HELPER FUNCTION FOR CERTIFICATE IMAGE GENERATION ============

const generateCertificateImage = async (certificateData) => {
  try {
    const {
      template,
      studentName,
      studentEmail,
      studentPhone,
      courseName,
      courseCode,
      courseDuration,
      awardDate,
      certificateCode,
      qrCodeImage,
      instituteId,
      instituteName
    } = certificateData;

    console.log('Starting certificate image generation...');

    // Check if template image exists
    if (!fs.existsSync(tenantFile(template.templateImage, instituteId, ['templates']))) {
      throw new Error(`Template image not found at path: ${template.templateImage}`);
    }

    // Load the template image
    const templateImage = sharp(tenantFile(template.templateImage, instituteId, ['templates']));
    const metadata = await templateImage.metadata();
    console.log('Template image loaded:', metadata);

    // Create a composite image with all fields
    const compositeOperations = [];

    // Add text fields
    if (template.fields && template.fields.length > 0) {
      for (const field of template.fields) {
        const text = getCertificateFieldText(field, {
          studentName,
          studentEmail,
          studentPhone,
          courseName,
          courseCode,
          courseDuration,
          awardDate,
          certificateCode,
          instituteName
        });

        console.log(`Adding text field ${field.fieldName} at (${field.x}, ${field.y}): "${text}"`);

        // Create SVG for text
        const fontFamily = getSvgFontFamily(field.fontFamily);
        const safeText = escapeSvgText(text);
        const textSvg = `
          <svg width="${metadata.width}" height="${metadata.height}">
            <style>
              .text {
                font-family: ${fontFamily};
                font-size: ${field.fontSize || 24}px;
                fill: ${field.fontColor || '#000000'};
                text-anchor: ${field.textAlign === 'center' ? 'middle' : field.textAlign === 'right' ? 'end' : 'start'};
              }
            </style>
            <text x="${field.x}" y="${field.y}" class="text">${safeText}</text>
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

    // Add uploaded image fields such as logos, signatures, and seals
    if (template.imageFields && template.imageFields.length > 0) {
      for (const imageField of template.imageFields) {
        if (imageField.imagePath && fs.existsSync(tenantFile(imageField.imagePath, instituteId, ['template-assets']))) {
          console.log(`Adding image field ${imageField.label || imageField.imageType} at (${imageField.x}, ${imageField.y})`);
          compositeOperations.push({
            input: await sharp(tenantFile(imageField.imagePath, instituteId, ['template-assets'])).resize(imageField.width || 120, imageField.height || 60).toBuffer(),
            top: imageField.y || 0,
            left: imageField.x || 0,
            width: imageField.width || 120,
            height: imageField.height || 60
          });
        } else {
          console.log('Image field file not found:', imageField.imagePath);
        }
      }
    }

    // Add QR code
    if (qrCodeImage) {
      if (fs.existsSync(qrCodeImage)) {
        console.log('Adding QR code from:', qrCodeImage);
        const qrSize = Math.max(80, Math.round(template.qrCodePosition?.size || 100));
        const resizedQrCode = await sharp(qrCodeImage)
          .resize(qrSize, qrSize, {
            fit: 'fill',
            kernel: sharp.kernel.nearest
          })
          .png()
          .toBuffer();
        compositeOperations.push({
          input: resizedQrCode,
          top: template.qrCodePosition?.y || 0,
          left: template.qrCodePosition?.x || 0
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


module.exports = { generateCertificateImage };
