const { pool } = require('../config/db');

async function create(facultyUserId, publicKey, privateKey, db = pool) {
  await db.query(
    'INSERT INTO key_pairs (faculty_user_id, public_key, private_key) VALUES (?, ?, ?)',
    [facultyUserId, publicKey, privateKey]
  );
}

async function findActiveByFaculty(facultyUserId, db = pool) {
  const [rows] = await db.query(
    'SELECT * FROM key_pairs WHERE faculty_user_id = ? AND is_active = TRUE ORDER BY key_id DESC LIMIT 1',
    [facultyUserId]
  );
  return rows[0];
}

module.exports = { create, findActiveByFaculty };
