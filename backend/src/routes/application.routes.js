const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const upload = require('../middleware/upload');
const { wrap } = require('../middleware/error');
const c = require('../controllers/application.controller');

router.use(auth);
router.post('/', role('student'), upload.array('files', 10), wrap(c.create));
router.get('/mine', role('student'), wrap(c.listMine));
router.get('/assigned', role('faculty'), wrap(c.listAssigned));
router.get('/all', role('admin'), wrap(c.listAll));
router.get('/:id', wrap(c.getDetail));
router.post('/:id/forward', role('student'), wrap(c.forward));

module.exports = router;
