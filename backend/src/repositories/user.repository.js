const { pool } = require('../config/db');

// The role is whichever subtype table holds the user (exactly one does).
const ROLE_SQL = `
  CASE WHEN s.user_id IS NOT NULL THEN 'student'
       WHEN f.user_id IS NOT NULL THEN 'faculty'
       WHEN a.user_id IS NOT NULL THEN 'admin' END AS role`;

async function findByEmailWithRole(email) {
  const [rows] = await pool.query(
    `SELECT u.*, ${ROLE_SQL}
     FROM users u
     LEFT JOIN students s ON s.user_id = u.user_id
     LEFT JOIN faculty  f ON f.user_id = u.user_id
     LEFT JOIN admins   a ON a.user_id = u.user_id
     WHERE u.email = ?`,
    [email]
  );
  return rows[0];
}

async function create(u, db = pool) {
  const [result] = await db.query(
    `INSERT INTO users (first_name, middle_name, last_name, email, password_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [u.firstName, u.middleName || null, u.lastName, u.email, u.passwordHash]
  );
  return result.insertId;
}

module.exports = { findByEmailWithRole, create };
