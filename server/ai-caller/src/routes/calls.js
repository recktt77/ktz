const express = require('express');
const callLog = require('../models/callLog');
const logger = require('../utils/logger');

const router = express.Router();

// GET /calls — recent calls
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  try {
    const rows = await callLog.findRecent(Math.min(limit, 200));
    res.json(rows);
  } catch (err) {
    logger.error({ err }, 'GET /calls failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /calls/alert/:alertId — calls for a specific alert
router.get('/alert/:alertId', async (req, res) => {
  try {
    const rows = await callLog.findByAlert(req.params.alertId);
    res.json(rows);
  } catch (err) {
    logger.error({ err }, 'GET /calls/alert failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
