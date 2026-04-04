const InvitationService = require('../../application/services/InvitationService');

const InvitationController = {
    async create(req, res, next) {
        try {
            const result = await InvitationService.create(req.body, req.user.userId);
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    },

    async getAll(_req, res, next) {
        try {
            const invitations = await InvitationService.getAll();
            res.json(invitations);
        } catch (err) {
            next(err);
        }
    },

    async revoke(req, res, next) {
        try {
            const result = await InvitationService.revoke(req.params.id);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },
};

module.exports = InvitationController;
