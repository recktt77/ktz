const { Router } = require('express');
const reportController = require('../controllers/reportController');

const router = Router();

// Supervisor (no locomotiveId)
router.get('/pdf/supervisor', (req, res, next) => {
    req.params.role = 'supervisor';
    reportController.downloadPdf(req, res, next);
});
router.get('/csv/supervisor', (req, res, next) => {
    req.params.role = 'supervisor';
    reportController.downloadCsv(req, res, next);
});

// Per-role per-locomotive
router.get('/pdf/:role/:locomotiveId', reportController.downloadPdf);
router.get('/csv/:role/:locomotiveId', reportController.downloadCsv);

module.exports = router;
