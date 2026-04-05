const express = require('express');
const staffAssignment = require('../models/staffAssignment');
const logger = require('../utils/logger');

const router = express.Router();

// GET /assignments — list all
router.get('/', async (_req, res) => {
  try {
    const rows = await staffAssignment.findAll();
    res.json(rows);
  } catch (err) {
    logger.error({ err }, 'GET /assignments failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /assignments — create
router.post('/', async (req, res) => {
  const { userId, locomotiveId, role, phoneNumber } = req.body;
  if (!userId || !locomotiveId || !role || !phoneNumber) {
    return res.status(400).json({ error: 'Missing required fields: userId, locomotiveId, role, phoneNumber' });
  }
  if (!['driver', 'engineer', 'dispatcher'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    const row = await staffAssignment.create({ userId, locomotiveId, role, phoneNumber });
    res.status(201).json(row);
  } catch (err) {
    logger.error({ err }, 'POST /assignments failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /assignments/:id — deactivate
router.delete('/:id', async (req, res) => {
  try {
    const row = await staffAssignment.deactivate(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: 'Assignment not found' });
    res.json(row);
  } catch (err) {
    logger.error({ err }, 'DELETE /assignments failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
