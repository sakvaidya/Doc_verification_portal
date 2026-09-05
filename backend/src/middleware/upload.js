const path = require('path');
const multer = require('multer');

module.exports = multer({
  dest: path.join(__dirname, '../../uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
});
