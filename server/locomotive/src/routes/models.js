const { Router } = require('express');
const modelController = require('../controllers/modelController');

const router = Router();

router.get('/', modelController.getAll);
router.get('/:model/schema', modelController.getSchema);

module.exports = router;
