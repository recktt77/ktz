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

module.exports = router;
