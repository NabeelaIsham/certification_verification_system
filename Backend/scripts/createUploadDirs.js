const fs = require('fs');
const path = require('path');

const createDirectories = () => {
  const dirs = [
    'uploads/templates',
    'uploads/template-assets',
    'uploads/certificates',
    'uploads/generated',
    'uploads/qrcodes',
    'uploads/logos'
  ];

  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } else {
      console.log(`📁 Directory already exists: ${dir}`);
    }
  });
};

createDirectories();
