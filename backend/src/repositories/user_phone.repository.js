const { pool } = require('../config/db');

async function create(userId, phoneNo, db = pool) {
  await db.query('INSERT INTO user_phones (user_id, phone_no) VALUES (?, ?)', [userId, phoneNo]);
}

module.exports = { create };
