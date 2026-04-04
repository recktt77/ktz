const { Router } = require('express');
const ReferenceController = require('../controllers/ReferenceController');
const authMiddleware = require('../../infrastructure/middleware/authMiddleware');

const router = Router();

router.get('/roles', authMiddleware, ReferenceController.getRoles);
router.get('/stations', authMiddleware, ReferenceController.getStations);

module.exports = router;
