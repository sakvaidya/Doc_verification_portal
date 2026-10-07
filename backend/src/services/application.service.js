const fs = require('fs');
const path = require('path');
const AppError = require('../utils/AppError');
const { sha256File } = require('../utils/hash');
const { withTransaction } = require('../config/db');
const appRepo = require('../repositories/application.repository');
const documentRepo = require('../repositories/document.repository');
const reviewRepo = require('../repositories/review.repository');
const commentRepo = require('../repositories/comment.repository');
const signatureRepo = require('../repositories/signature.repository');
const facultyRepo = require('../repositories/faculty.repository');

// Status is never stored: it is read off the latest review step.
function deriveStatus(latestStep) {
  if (!latestStep) return 'DRAFT';
  if (latestStep.decision === 'PENDING') return `PENDING WITH ${latestStep.faculty_name}`;
  return latestStep.decision; // APPROVED or REJECTED
}

async function withStatuses(apps) {
  const latest = await reviewRepo.latestByRequests(apps.map((a) => a.request_id));
  return apps.map((a) => ({
    ...a,
    status: deriveStatus(latest.find((l) => l.request_id === a.request_id)),
  }));
}

// Loads an application and checks the user may see it.
// Students: only their own. Faculty: only if they have a step on it. Admins: anything (when allowed).
async function loadForUser(user, requestId, { allowAdmin = true } = {}) {
  const app = await appRepo.findById(requestId);
  if (!app) throw new AppError('Application not found', 404);
  const ok =
    (user.role === 'student' && app.student_user_id === user.id) ||
    (user.role === 'faculty' && (await reviewRepo.facultyHasStep(requestId, user.id))) ||
    (user.role === 'admin' && allowAdmin);
  if (!ok) throw new AppError('You do not have access to this application', 403);
  return app;
}

async function assertFaculty(facultyUserId) {
  if (!facultyUserId || !(await facultyRepo.exists(facultyUserId))) {
    throw new AppError('Please choose a valid faculty member');
  }
}

async function create(user, { subject, description, facultyUserId }, files = []) {
  try {
    if (!subject || !description) throw new AppError('Subject and description are required');
    if (files.length === 0) throw new AppError('Attach at least one file');
    await assertFaculty(facultyUserId);

    return await withTransaction(async (conn) => {
      const requestId = await appRepo.create(user.id, subject, description, conn);
      for (const [i, f] of files.entries()) {
        await documentRepo.create(requestId, i + 1, {
          fileName: f.originalname,
          storedPath: path.relative(path.join(__dirname, '../..'), f.path),
          fileHash: sha256File(f.path),
        }, conn);
      }
      await reviewRepo.create(requestId, 1, facultyUserId, conn);
      return { requestId };
    });
  } catch (err) {
    files.forEach((f) => fs.rm(f.path, { force: true }, () => {}));
    throw err;
  }
}

async function listMine(user) {
  return withStatuses(await appRepo.listByStudent(user.id));
}

async function listAll() {
  return withStatuses(await appRepo.listAll());
}

function listAssigned(user) {
  return reviewRepo.listByFaculty(user.id);
}

async function getDetail(user, requestId) {
  const app = await loadForUser(user, requestId);
  const [documents, steps, comments, signatures] = await Promise.all([
    documentRepo.listByRequest(requestId),
    reviewRepo.listByRequest(requestId),
    commentRepo.listByRequest(requestId),
    signatureRepo.listByRequest(requestId),
  ]);
  return {
    ...app,
    status: deriveStatus(steps[steps.length - 1]),
    documents: documents.map(({ stored_path, ...d }) => d),
    // Steps are only ever forwarded from the latest one, so step n came from step n - 1
    // (not stored: it would depend on step_no alone and break 2NF).
    steps: steps.map((s) => ({
      ...s,
      prev_step_no: s.step_no > 1 ? s.step_no - 1 : null,
      signatures: signatures.filter((g) => g.step_no === s.step_no),
    })),
    comments,
  };
}

// Forwarding: only the owner, only once the latest step is decided. The new step is
// latest + 1; documents are reused, so they collect another signature.
async function forward(user, requestId, facultyUserId) {
  const app = await loadForUser(user, requestId, { allowAdmin: false });
  if (app.student_user_id !== user.id) throw new AppError('Only the owner can forward', 403);
  await assertFaculty(facultyUserId);

  return withTransaction(async (conn) => {
    const latest = await reviewRepo.findLatest(requestId, conn);
    if (!latest || latest.decision === 'PENDING') {
      throw new AppError('The current step has not been decided yet', 409);
    }
    const stepNo = latest.step_no + 1;
    await reviewRepo.create(requestId, stepNo, facultyUserId, conn);
    return { stepNo };
  });
}

module.exports = { deriveStatus, loadForUser, create, listMine, listAll, listAssigned, getDetail, forward };
