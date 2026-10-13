const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const reviewRepo = require('../repositories/review.repository');
const commentRepo = require('../repositories/comment.repository');
const signatureService = require('./signature.service');

// A faculty member may only decide their own step, and only while it is pending.
async function decide(user, requestId, stepNo, decision, remark) {
  return withTransaction(async (conn) => {
    const step = await reviewRepo.find(requestId, stepNo, conn);
    if (!step) throw new AppError('Review step not found', 404);
    if (step.faculty_user_id !== user.id) throw new AppError('This step is not assigned to you', 403);
    if (step.decision !== 'PENDING') throw new AppError('This step is already decided', 409);

    await reviewRepo.decide(requestId, stepNo, decision, conn);
    if (decision === 'APPROVED') await signatureService.signStep(conn, requestId, stepNo, user.id);
    if (remark) await commentRepo.create(requestId, user.id, `Rejected: ${remark}`, null, conn);
    return { decision };
  });
}

const approve = (user, requestId, stepNo) => decide(user, requestId, stepNo, 'APPROVED');
const reject = (user, requestId, stepNo, remark) => decide(user, requestId, stepNo, 'REJECTED', remark);

module.exports = { approve, reject };
