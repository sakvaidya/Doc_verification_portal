const router = require('express').Router();
const { wrap } = require('../middleware/error');
const c = require('../controllers/verify.controller');

// public: no auth middleware; :code is the signature's content_hash
router.get('/:code', wrap(c.verify));
router.get('/:code/download', wrap(c.download));

module.exports = router;
