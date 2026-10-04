const path = require('path');
const fs = require('fs');
const AppError = require('../utils/AppError');
const { contentHash } = require('../utils/hash');
const { sign, verify } = require('../utils/crypto');
const documentRepo = require('../repositories/document.repository');
const keyPairRepo = require('../repositories/keypair.repository');
const approvalRepo = require('../repositories/approval.repository');
const signatureRepo = require('../repositories/signature.repository');

const ROOT = path.join(__dirname, '../..');

// Signs every document of the application for one approved step (inside the caller's transaction).
async function signStep(conn, requestId, stepNo, facultyUserId) {
  const key = await keyPairRepo.findActiveByFaculty(facultyUserId, conn);
  if (!key) throw new AppError('No active signing key for this faculty member', 500);

  await approvalRepo.create(requestId, stepNo, key.key_id, conn);
  const docs = await documentRepo.listByRequest(requestId, conn);
  for (const d of docs) {
    const hash = contentHash(path.join(ROOT, d.stored_path), requestId, d.doc_no, stepNo, facultyUserId);
    await signatureRepo.create({
      requestId, stepNo, docNo: d.doc_no, contentHash: hash,
      signatureValue: sign(hash, key.private_key),
    }, conn);
  }
}

// Public check: recompute the hash from the file as it is on disk right now.
async function verifySignature(signatureId) {
  const s = await signatureRepo.findForVerify(signatureId);
  if (!s) throw new AppError('Signature not found', 404);

  const filePath = path.join(ROOT, s.stored_path);
  let valid = false;
  if (fs.existsSync(filePath)) {
    const hash = contentHash(filePath, s.request_id, s.doc_no, s.step_no, s.faculty_user_id);
    valid = hash === s.content_hash && verify(hash, s.public_key, s.signature_value);
  }

  return {
    valid,
    signatureId: s.signature_id,
    fileName: s.file_name,
    signer: s.signer_name,
    designation: s.designation,
    signedOn: s.signed_on,
    requestId: s.request_id,
    stepNo: s.step_no,
    algorithm: s.algorithm,
  };
}

module.exports = { signStep, verifySignature };
