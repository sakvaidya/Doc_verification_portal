const { pool } = require('../config/db');

async function create(requestId, docNo, d, db = pool) {
  await db.query(
    `INSERT INTO documents (request_id, doc_no, file_name, stored_path, file_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [requestId, docNo, d.fileName, d.storedPath, d.fileHash]
  );
}

async function listByRequest(requestId, db = pool) {
  const [rows] = await db.query(
    'SELECT * FROM documents WHERE request_id = ? ORDER BY doc_no',
    [requestId]
  );
  return rows;
}

async function find(requestId, docNo) {
  const [rows] = await pool.query(
    'SELECT * FROM documents WHERE request_id = ? AND doc_no = ?',
    [requestId, docNo]
  );
  return rows[0];
}

module.exports = { create, listByRequest, find };
