const { pool } = require('../config/db');

async function create(requestId, stepNo, keyId, db = pool) {
  await db.query(
    'INSERT INTO approvals (request_id, step_no, key_id) VALUES (?, ?, ?)',
    [requestId, stepNo, keyId]
  );
}

module.exports = { create };
