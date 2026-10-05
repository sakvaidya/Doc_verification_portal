const router = require('express').Router();
const auth = require('../middleware/auth');
const { wrap } = require('../middleware/error');
const c = require('../controllers/auth.controller');

router.post('/auth/register', wrap(c.register));
router.post('/auth/login', wrap(c.login));
router.get('/faculty', auth, wrap(c.listFaculty));

module.exports = router;
