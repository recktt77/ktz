const express = require('express');
const assignmentsRouter = require('./assignments');
const rulesRouter = require('./rules');
const callsRouter = require('./calls');

const router = express.Router();

router.use('/assignments', assignmentsRouter);
router.use('/rules', rulesRouter);
router.use('/calls', callsRouter);

module.exports = router;
