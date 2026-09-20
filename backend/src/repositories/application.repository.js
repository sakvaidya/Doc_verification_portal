const { pool } = require('../config/db');

const SELECT_APP = `
  SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) AS student_name
  FROM request_applications a JOIN users u ON u.user_id = a.student_user_id`;

async function create(studentUserId, subject, description, db = pool) {
  const [result] = await db.query(
    'INSERT INTO request_applications (student_user_id, subject, description) VALUES (?, ?, ?)',
    [studentUserId, subject, description]
  );
  return result.insertId;
}

async function findById(requestId) {
  const [rows] = await pool.query(`${SELECT_APP} WHERE a.request_id = ?`, [requestId]);
  return rows[0];
}

async function listByStudent(studentUserId) {
  const [rows] = await pool.query(
    `${SELECT_APP} WHERE a.student_user_id = ? ORDER BY a.request_id DESC`,
    [studentUserId]
  );
  return rows;
}

async function listAll() {
  const [rows] = await pool.query(`${SELECT_APP} ORDER BY a.request_id DESC`);
  return rows;
}

module.exports = { create, findById, listByStudent, listAll };
