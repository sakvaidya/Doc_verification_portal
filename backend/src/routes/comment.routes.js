const router = require('express').Router();
const auth = require('../middleware/auth');
const { wrap } = require('../middleware/error');
const c = require('../controllers/comment.controller');

router.post('/:id/comments', auth, wrap(c.post));

module.exports = router;
