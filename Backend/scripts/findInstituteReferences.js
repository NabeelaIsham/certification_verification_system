const fs = require('fs');
const path = require('path');

function searchFiles(dir, pattern) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !fullPath.includes('node_modules')) {
      results = results.concat(searchFiles(fullPath, pattern));
    } else if (fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (pattern.test(content)) {
        results.push(fullPath);
      }
    }
  });
  
  return results;
}

console.log('Searching for "Institute" model references...');
const files = searchFiles(__dirname + '/..', /ref:.*'Institute'|populate\(.*'Institute'/g);

if (files.length === 0) {
  console.log('✅ No direct Institute model references found!');
} else {
  console.log('❌ Found Institute references in:');
  files.forEach(file => {
    console.log(`   ${file}`);
    
    // Show the specific lines
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes("ref: 'Institute'") || line.includes("populate('Institute'") || line.includes('populate("Institute"')) {
        console.log(`     Line ${index + 1}: ${line.trim()}`);
      }
    });
  });
}