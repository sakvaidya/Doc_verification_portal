const path = require('path');
const AppError = require('../utils/AppError');
const documentRepo = require('../repositories/document.repository');
const applicationService = require('./application.service');

async function getFile(user, requestId, docNo) {
  await applicationService.loadForUser(user, requestId);
  const doc = await documentRepo.find(requestId, docNo);
  if (!doc) throw new AppError('Document not found', 404);
  return { filePath: path.join(__dirname, '../..', doc.stored_path), fileName: doc.file_name };
}

module.exports = { getFile };
