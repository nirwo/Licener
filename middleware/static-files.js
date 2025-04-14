const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

module.exports = function staticFiles(req, res, next) {
  const filePath = path.join(__dirname, '..', 'static', req.path);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return next();
  }

  // Get file stats
  const stats = fs.statSync(filePath);

  // Set proper MIME type
  const mimeType = mime.lookup(filePath);
  if (mimeType) {
    res.setHeader('Content-Type', mimeType);
  }

  // Set content length
  res.setHeader('Content-Length', stats.size);

  // Stream the file
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);

  stream.on('error', err => {
    console.error('Error streaming file:', err);
    next(err);
  });
};
