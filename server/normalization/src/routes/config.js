const { Router } = require('express');
const configController = require('../controllers/configController');

const router = Router();

router.get('/thresholds', configController.getThresholds);
router.patch('/thresholds', configController.updateThreshold);
router.get('/weights', configController.getWeights);
router.patch('/weights', configController.updateWeight);

module.exports = router;
