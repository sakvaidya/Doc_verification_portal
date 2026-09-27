const { pool } = require('../config/db');

async function create(requestId, stepNo, facultyUserId, db = pool) {
  await db.query(
    'INSERT INTO reviews (request_id, step_no, faculty_user_id) VALUES (?, ?, ?)',
    [requestId, stepNo, facultyUserId]
  );
}

async function listByRequest(requestId) {
  const [rows] = await pool.query(
    `SELECT r.*, CONCAT(u.first_name, ' ', u.last_name) AS faculty_name, f.designation
     FROM reviews r
     JOIN faculty f ON f.user_id = r.faculty_user_id
     JOIN users u   ON u.user_id = r.faculty_user_id
     WHERE r.request_id = ? ORDER BY r.step_no`,
    [requestId]
  );
  return rows;
}

// Latest step per application, used to derive statuses for list pages.
async function latestByRequests(requestIds) {
  if (requestIds.length === 0) return [];
  const [rows] = await pool.query(
    `SELECT r.request_id, r.decision, CONCAT(u.first_name, ' ', u.last_name) AS faculty_name
     FROM reviews r JOIN users u ON u.user_id = r.faculty_user_id
     WHERE r.request_id IN (?)
       AND r.step_no = (SELECT MAX(step_no) FROM reviews WHERE request_id = r.request_id)`,
    [requestIds]
  );
  return rows;
}

async function find(requestId, stepNo, db = pool) {
  const [rows] = await db.query(
    'SELECT * FROM reviews WHERE request_id = ? AND step_no = ? FOR UPDATE',
    [requestId, stepNo]
  );
  return rows[0];
}

async function findLatest(requestId, db = pool) {
  const [rows] = await db.query(
    'SELECT * FROM reviews WHERE request_id = ? ORDER BY step_no DESC LIMIT 1 FOR UPDATE',
    [requestId]
  );
  return rows[0];
}

async function decide(requestId, stepNo, decision, db = pool) {
  await db.query(
    'UPDATE reviews SET decision = ?, decided_on = NOW() WHERE request_id = ? AND step_no = ?',
    [decision, requestId, stepNo]
  );
}

async function listByFaculty(facultyUserId) {
  const [rows] = await pool.query(
    `SELECT r.request_id, r.step_no, r.decision, r.assigned_on, r.decided_on, a.subject,
            CONCAT(u.first_name, ' ', u.last_name) AS student_name
     FROM reviews r
     JOIN request_applications a ON a.request_id = r.request_id
     JOIN users u ON u.user_id = a.student_user_id
     WHERE r.faculty_user_id = ?
     ORDER BY r.decision = 'PENDING' DESC, r.assigned_on DESC`,
    [facultyUserId]
  );
  return rows;
}

async function facultyHasStep(requestId, facultyUserId) {
  const [rows] = await pool.query(
    'SELECT 1 FROM reviews WHERE request_id = ? AND faculty_user_id = ? LIMIT 1',
    [requestId, facultyUserId]
  );
  return rows.length > 0;
}

module.exports = {
  create, listByRequest, latestByRequests, find, findLatest, decide, listByFaculty, facultyHasStep,
};
