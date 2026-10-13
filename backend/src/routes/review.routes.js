const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { wrap } = require('../middleware/error');
const c = require('../controllers/review.controller');

router.use(auth, role('faculty'));
router.post('/:id/:stepNo/approve', wrap(c.approve));
router.post('/:id/:stepNo/reject', wrap(c.reject));

module.exports = router;
