const { Router } = require('express');
const healthController = require('../controllers/healthController');

const router = Router();

router.get('/health-index/:locomotiveId', healthController.getHealthIndex);
router.get('/snapshots/:locomotiveId', healthController.getSnapshot);
router.get('/history/:locomotiveId', healthController.getHistory);
router.get('/replay/:locomotiveId', healthController.getReplay);

module.exports = router;
