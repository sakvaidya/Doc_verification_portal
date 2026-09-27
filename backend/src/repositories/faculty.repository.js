const { pool } = require('../config/db');

async function create(userId, f, db = pool) {
  await db.query(
    'INSERT INTO faculty (user_id, faculty_id, designation, department) VALUES (?, ?, ?, ?)',
    [userId, f.facultyId, f.designation, f.department]
  );
}

async function listAll() {
  const [rows] = await pool.query(
    `SELECT f.user_id, CONCAT(u.first_name, ' ', u.last_name) AS name, f.designation, f.department
     FROM faculty f JOIN users u ON u.user_id = f.user_id
     ORDER BY u.first_name`
  );
  return rows;
}

async function exists(userId) {
  const [rows] = await pool.query('SELECT 1 FROM faculty WHERE user_id = ?', [userId]);
  return rows.length > 0;
}

module.exports = { create, listAll, exists };
