const { Router } = require('express');
const InvitationController = require('../controllers/InvitationController');
const authMiddleware = require('../../infrastructure/middleware/authMiddleware');
const requireRole = require('../../infrastructure/middleware/roleMiddleware');
const validate = require('../../infrastructure/middleware/validateDto');
const { CreateInvitationDto } = require('../../application/dto/invitation.dto');

const router = Router();

router.post(
    '/auth/invitations',
    authMiddleware,
    requireRole('admin'),
    validate(CreateInvitationDto),
    InvitationController.create
);

router.get(
    '/auth/invitations',
    authMiddleware,
    requireRole('admin'),
    InvitationController.getAll
);

router.patch(
    '/auth/invitations/:id/revoke',
    authMiddleware,
    requireRole('admin'),
    InvitationController.revoke
);

// Public — fetch invitation info by invite code (for registration page)
router.get(
    '/auth/invitations/code/:code',
    InvitationController.getByCode
);

module.exports = router;
