const { Router } = require('express');
const { buildSnapshotInit } = require('../services/pipeline');

const router = Router();

/**
 * GET /poll/:role
 * GET /poll/:role/:locomotiveId
 *
 * HTTP polling fallback for environments where WebSocket upgrades
 * are blocked (e.g. reverse proxy without WS support).
 * Returns the same snapshot_init payload as the WS handshake.
 */
router.get('/:role/:locomotiveId?', (req, res) => {
  const { role, locomotiveId } = req.params;
  const locomotiveIds = locomotiveId ? [locomotiveId] : [];
  const snapshot = buildSnapshotInit(role, locomotiveIds);
  res.json({ type: 'snapshot_init', payload: snapshot });
});

module.exports = router;
