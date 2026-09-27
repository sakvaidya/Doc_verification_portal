const { pool } = require('../config/db');

// comment_no is numbered per application: next = MAX + 1 within the same request.
async function create(requestId, authorUserId, message, parentCommentNo, db = pool) {
  await db.query(
    `INSERT INTO comments (request_id, comment_no, author_user_id, message, parent_comment_no)
     SELECT ?, COALESCE(MAX(comment_no), 0) + 1, ?, ?, ? FROM comments WHERE request_id = ?`,
    [requestId, authorUserId, message, parentCommentNo, requestId]
  );
}

async function listByRequest(requestId) {
  const [rows] = await pool.query(
    `SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS author_name
     FROM comments c JOIN users u ON u.user_id = c.author_user_id
     WHERE c.request_id = ? ORDER BY c.comment_no`,
    [requestId]
  );
  return rows;
}

async function exists(requestId, commentNo) {
  const [rows] = await pool.query(
    'SELECT 1 FROM comments WHERE request_id = ? AND comment_no = ?',
    [requestId, commentNo]
  );
  return rows.length > 0;
}

module.exports = { create, listByRequest, exists };
