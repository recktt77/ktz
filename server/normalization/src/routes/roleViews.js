const { Router } = require('express');
const roleViewController = require('../controllers/roleViewController');

const router = Router();

router.get('/driver/:locomotiveId', roleViewController.driverView);
router.get('/dispatcher/:locomotiveId', roleViewController.dispatcherView);
router.get('/engineer/:locomotiveId', roleViewController.engineerView);
router.get('/supervisor', roleViewController.supervisorView);

module.exports = router;
