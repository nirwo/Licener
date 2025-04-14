const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure the public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy necessary files to public directory
const filesToCopy = [
  'app.js',
  'package.json',
  'package-lock.json',
  '.env.production',
  'models',
  'routes',
  'controllers',
  'templates',
  'config'
];

console.log('🚀 Starting production build...');

// Copy files
filesToCopy.forEach(file => {
  const source = path.join(__dirname, '..', file);
  const destination = path.join(publicDir, file);
  
  if (fs.existsSync(source)) {
    if (fs.lstatSync(source).isDirectory()) {
      // Copy directory recursively
      execSync(`cp -r ${source} ${destination}`);
    } else {
      // Copy file
      fs.copyFileSync(source, destination);
    }
    console.log(`📦 Copied: ${file}`);
  }
});

// Copy static files from public to public/static
const staticSource = path.join(__dirname, '../static');
const staticDest = path.join(publicDir, 'static');
if (fs.existsSync(staticSource)) {
  execSync(`cp -r ${staticSource} ${staticDest}`);
  console.log('📦 Copied: static files');
}

// Install production dependencies
console.log('📦 Installing production dependencies...');
execSync('npm install --production', { cwd: publicDir });

// Create .env file from .env.production
console.log('🔧 Setting up environment...');
fs.copyFileSync(
  path.join(publicDir, '.env.production'),
  path.join(publicDir, '.env')
);

// Create a simple index.html for Netlify
const indexHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Licener - License Management System</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
    <div id="app"></div>
    <script src="/static/js/main.js"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml);

console.log('✅ Build completed successfully!');
console.log(`📁 Build directory: ${publicDir}`); 