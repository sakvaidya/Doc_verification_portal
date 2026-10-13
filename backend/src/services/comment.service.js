const AppError = require('../utils/AppError');
const commentRepo = require('../repositories/comment.repository');
const applicationService = require('./application.service');

// Owner student or any faculty with a step on the application may comment (not admins).
async function post(user, requestId, message, parentCommentNo) {
  await applicationService.loadForUser(user, requestId, { allowAdmin: false });
  if (!message || !message.trim()) throw new AppError('Message cannot be empty');
  if (parentCommentNo && !(await commentRepo.exists(requestId, parentCommentNo))) {
    throw new AppError('Parent comment not found on this application', 404);
  }
  await commentRepo.create(requestId, user.id, message.trim(), parentCommentNo || null);
  return { ok: true };
}

module.exports = { post };
