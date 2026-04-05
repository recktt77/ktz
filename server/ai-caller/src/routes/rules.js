const express = require('express');
const callRoutingRule = require('../models/callRoutingRule');
const logger = require('../utils/logger');

const router = express.Router();

// GET /rules — list all
router.get('/', async (_req, res) => {
  try {
    const rows = await callRoutingRule.findAll();
    res.json(rows);
  } catch (err) {
    logger.error({ err }, 'GET /rules failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rules — create
router.post('/', async (req, res) => {
  const { modelCode, metricPattern, component, targetRole, priority } = req.body;
  if (!metricPattern || !targetRole) {
    return res.status(400).json({ error: 'Missing required fields: metricPattern, targetRole' });
  }
  if (!['driver', 'engineer', 'dispatcher'].includes(targetRole)) {
    return res.status(400).json({ error: 'Invalid targetRole' });
  }
  try {
    const row = await callRoutingRule.create({ modelCode, metricPattern, component, targetRole, priority });
    res.status(201).json(row);
  } catch (err) {
    logger.error({ err }, 'POST /rules failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /rules/:id — update
router.patch('/:id', async (req, res) => {
  const allowed = ['modelCode', 'metricPattern', 'component', 'targetRole', 'priority', 'isActive'];
  const fields = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) fields[key] = req.body[key];
  }
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  try {
    const row = await callRoutingRule.update(parseInt(req.params.id, 10), fields);
    if (!row) return res.status(404).json({ error: 'Rule not found' });
    res.json(row);
  } catch (err) {
    logger.error({ err }, 'PATCH /rules failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
