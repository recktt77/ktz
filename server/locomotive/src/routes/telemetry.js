const { Router } = require('express');
const telemetryController = require('../controllers/telemetryController');

const router = Router();

router.post('/raw', telemetryController.ingestRaw);
router.post('/bulk', telemetryController.ingestBulk);
router.get('/raw/:locomotiveId', telemetryController.getRawHistory);
router.get('/raw/:locomotiveId/latest', telemetryController.getLatestRaw);

module.exports = router;
