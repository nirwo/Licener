// Script to find unused files (basic version)
const fs = require('fs');
const path = require('path');
const IGNORED = ['node_modules', '.git', '.github', 'scripts'];

function walk(dir, fileList = []) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory() && !IGNORED.includes(file)) {
      walk(fullPath, fileList);
    } else if (!fs.statSync(fullPath).isDirectory()) {
      fileList.push(fullPath);
    }
  });
  return fileList;
}

const allFiles = walk(process.cwd());
// You can extend this with logic to check for unused files
console.log('Total files:', allFiles.length);
