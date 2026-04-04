const { Router } = require('express');
const ctrl = require('../controllers/simulatorController');

const router = Router();

router.post('/start', ctrl.start);
router.post('/stop', ctrl.stop);
router.post('/pause', ctrl.pause);
router.post('/resume', ctrl.resume);
router.get('/status', ctrl.status);
router.post('/scenario', ctrl.setScenario);
router.get('/scenarios', ctrl.listScenarios);

// Admin override API
router.post('/override', ctrl.setOverride);
router.delete('/override/:locomotive', ctrl.clearOverride);
router.get('/overrides', ctrl.getOverrides);
router.get('/params', ctrl.getParams);

module.exports = router;
