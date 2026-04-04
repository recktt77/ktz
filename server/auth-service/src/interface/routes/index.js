const { Router } = require('express');
const authRoutes = require('./auth.routes');
const invitationRoutes = require('./invitation.routes');
const userRoutes = require('./user.routes');
const referenceRoutes = require('./reference.routes');

const router = Router();

router.use(authRoutes);
router.use(invitationRoutes);
router.use(userRoutes);
router.use(referenceRoutes);

module.exports = router;
