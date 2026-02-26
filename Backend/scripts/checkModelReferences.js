const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '..');
const filesToCheck = [];

// Recursively get all .js files
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // Skip node_modules and other directories
      if (file !== 'node_modules' && file !== '.git') {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (file.endsWith('.js')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles(directoryPath);
console.log(`Checking ${files.length} files for 'Institute' references...\n`);

let foundCount = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Look for 'Institute' in populate strings or model references
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('Institute') && 
        !line.includes('@Institute') && 
        !line.includes('institute') &&
        !line.includes('InstituteName')) {
      // Check if it's a model reference or populate
      if (line.includes('ref:') || line.includes('populate') || line.includes('model')) {
        console.log(`Found in: ${file} at line ${index + 1}`);
        console.log(`  ${line.trim()}\n`);
        foundCount++;
      }
    }
  });
});

console.log(`\nTotal 'Institute' model references found: ${foundCount}`);