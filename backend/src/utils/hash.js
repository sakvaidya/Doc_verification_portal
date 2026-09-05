const crypto = require('crypto');
const fs = require('fs');

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

// The signed hash binds the file bytes to one application, document, step and signer,
// so a signature can't be moved to another file or reused on another step.
function contentHash(filePath, requestId, docNo, stepNo, facultyUserId) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(filePath))
    .update(`:${requestId}:${docNo}:${stepNo}:${facultyUserId}`)
    .digest('hex');
}

module.exports = { sha256File, contentHash };
