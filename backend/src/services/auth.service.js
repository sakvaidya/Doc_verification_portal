const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const { generateKeyPair } = require('../utils/crypto');
const { withTransaction } = require('../config/db');
const userRepo = require('../repositories/user.repository');
const userPhoneRepo = require('../repositories/user_phone.repository');
const studentRepo = require('../repositories/student.repository');
const facultyRepo = require('../repositories/faculty.repository');
const keyPairRepo = require('../repositories/keypair.repository');

const REQUIRED = {
  student: ['sapId', 'department', 'division', 'yearOfGraduation'],
  faculty: ['facultyId', 'designation', 'department'],
};

function requireFields(body, fields) {
  const missing = fields.filter((f) => !body[f]);
  if (missing.length) throw new AppError(`Missing fields: ${missing.join(', ')}`);
}

// "98200 00001, 98200 00002" -> ['9820000001', '9820000002'] (users may have several numbers)
function phoneList(text = '') {
  return [...new Set(String(text).split(',').map((p) => p.replace(/\s/g, '')).filter(Boolean))];
}

async function register(body) {
  if (!REQUIRED[body.role]) throw new AppError('Role must be student or faculty');
  requireFields(body, ['firstName', 'lastName', 'email', 'password', ...REQUIRED[body.role]]);
  const passwordHash = await bcrypt.hash(body.password, 10);

  try {
    await withTransaction(async (conn) => {
      const userId = await userRepo.create({ ...body, passwordHash }, conn);
      for (const phone of phoneList(body.phoneNo)) await userPhoneRepo.create(userId, phone, conn);
      if (body.role === 'student') {
        await studentRepo.create(userId, body, conn);
      } else {
        await facultyRepo.create(userId, body, conn);
        const { publicKey, privateKey } = generateKeyPair();
        await keyPairRepo.create(userId, publicKey, privateKey, conn);
      }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new AppError('Email or ID already registered', 409);
    throw err;
  }
  return login(body.email, body.password);
}

async function login(email, password) {
  const user = await userRepo.findByEmailWithRole(email || '');
  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
    throw new AppError('Wrong email or password', 401);
  }
  const payload = { id: user.user_id, name: `${user.first_name} ${user.last_name}`, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
  return { token, user: payload };
}

function listFaculty() {
  return facultyRepo.listAll();
}

module.exports = { register, login, listFaculty };
