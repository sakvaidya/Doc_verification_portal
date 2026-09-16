const { pool } = require('../config/db');

async function create(userId, s, db = pool) {
  await db.query(
    `INSERT INTO students (user_id, sap_id, department, division, year_of_graduation)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, s.sapId, s.department, s.division, s.yearOfGraduation]
  );
}

module.exports = { create };
