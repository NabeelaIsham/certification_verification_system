const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const sanitizeUploadedImage = async (file) => {
  if (!file?.path) throw new Error('Uploaded image is missing');
  const originalPath = file.path;
  const parsed = path.parse(originalPath);
  const sanitizedPath = path.join(parsed.dir, `${parsed.name}.sanitized.png`);

  try {
    const image = sharp(originalPath, {
      animated: false,
      failOn: 'warning',
      limitInputPixels: 40_000_000
    });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) {
      throw new Error('Unsupported image encoding');
    }
    if (!metadata.width || !metadata.height || metadata.width > 8000 || metadata.height > 8000) {
      throw new Error('Image dimensions are invalid or exceed 8000×8000');
    }

    await image
      .rotate()
      .png({ compressionLevel: 9 })
      .toFile(sanitizedPath);
    await fs.unlink(originalPath);
    const finalPath = path.join(parsed.dir, `${parsed.name}.png`);
    await fs.rename(sanitizedPath, finalPath);

    file.path = finalPath;
    file.filename = path.basename(finalPath);
    file.mimetype = 'image/png';
    file.originalname = `${path.parse(file.originalname).name}.png`;
    return file;
  } catch (error) {
    await Promise.allSettled([fs.unlink(originalPath), fs.unlink(sanitizedPath)]);
    const validationError = new Error(`Uploaded image failed security validation: ${error.message}`);
    validationError.code = 'INVALID_IMAGE';
    throw validationError;
  }
};

const sanitizeUploadedImages = async (files) => {
  const sanitized = [];
  for (const file of files) {
    sanitized.push(await sanitizeUploadedImage(file));
  }
  return sanitized;
};

module.exports = {
  sanitizeUploadedImage,
  sanitizeUploadedImages
};
