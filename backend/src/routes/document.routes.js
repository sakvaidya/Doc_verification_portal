const router = require('express').Router();
const auth = require('../middleware/auth');
const { wrap } = require('../middleware/error');
const c = require('../controllers/document.controller');

router.get('/:id/:docNo/download', auth, wrap(c.download));

module.exports = router;
