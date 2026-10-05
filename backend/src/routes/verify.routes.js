const router = require('express').Router();
const { wrap } = require('../middleware/error');
const c = require('../controllers/verify.controller');

router.get('/:signatureId', wrap(c.verify)); // public: no auth middleware

module.exports = router;
