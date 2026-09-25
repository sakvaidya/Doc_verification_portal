const { pool } = require('../config/db');

async function create(s, db = pool) {
  await db.query(
    `INSERT INTO signatures (request_id, step_no, doc_no, content_hash, signature_value)
     VALUES (?, ?, ?, ?, ?)`,
    [s.requestId, s.stepNo, s.docNo, s.contentHash, s.signatureValue]
  );
}

async function listByRequest(requestId) {
  const [rows] = await pool.query(
    `SELECT s.signature_id, s.step_no, s.doc_no, r.decided_on AS signed_on, d.file_name
     FROM signatures s
     JOIN documents d ON d.request_id = s.request_id AND d.doc_no = s.doc_no
     JOIN reviews r   ON r.request_id = s.request_id AND r.step_no = s.step_no
     WHERE s.request_id = ? ORDER BY s.step_no, s.doc_no`,
    [requestId]
  );
  return rows;
}

// Everything needed to re-verify one signature from scratch.
async function findForVerify(signatureId) {
  const [rows] = await pool.query(
    `SELECT s.*, d.file_name, d.stored_path, r.faculty_user_id, r.decided_on AS signed_on,
            k.public_key, k.algorithm,
            CONCAT(u.first_name, ' ', u.last_name) AS signer_name, f.designation
     FROM signatures s
     JOIN documents d  ON d.request_id = s.request_id AND d.doc_no = s.doc_no
     JOIN reviews r    ON r.request_id = s.request_id AND r.step_no = s.step_no
     JOIN approvals ap ON ap.request_id = s.request_id AND ap.step_no = s.step_no
     JOIN key_pairs k  ON k.key_id = ap.key_id
     JOIN faculty f   ON f.user_id = r.faculty_user_id
     JOIN users u     ON u.user_id = r.faculty_user_id
     WHERE s.signature_id = ?`,
    [signatureId]
  );
  return rows[0];
}

module.exports = { create, listByRequest, findForVerify };
