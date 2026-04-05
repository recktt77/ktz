const crypto = require('crypto');
const AppDataSource = require('../../infrastructure/database/data-source');
const EmailService = require('../../infrastructure/email/EmailService');

function createError(statusCode, message) {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.expose = true;
    return err;
}

const InvitationService = {
    async create({ email, role_id, station_id }, createdByUserId) {
        const roleRepo = AppDataSource.getRepository('Role');
        const invitationRepo = AppDataSource.getRepository('Invitation');

        const role = await roleRepo.findOne({ where: { id: role_id } });
        if (!role) {
            throw createError(400, 'Role not found');
        }

        const invite_code = crypto.randomBytes(16).toString('hex'); // 32 chars
        const expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

        const invitation = await invitationRepo.save({
            email: email.toLowerCase(),
            role: { id: role_id },
            station_id: station_id || null,
            invite_code,
            status: 'pending',
            expires_at,
            createdBy: createdByUserId ? { id: createdByUserId } : null,
        });

        await EmailService.sendInvitation(email, invite_code, role.name);

        return { invitation_id: invitation.id, invite_code };
    },

    async getAll() {
        const invitationRepo = AppDataSource.getRepository('Invitation');
        return invitationRepo.find({
            relations: ['role', 'createdBy'],
            order: { created_at: 'DESC' },
        });
    },

    async getByCode(code) {
        const invitationRepo = AppDataSource.getRepository('Invitation');
        const invitation = await invitationRepo.findOne({
            where: { invite_code: code },
            relations: ['role'],
        });
        if (!invitation) {
            throw createError(404, 'Invitation not found');
        }
        return {
            email: invitation.email,
            role: invitation.role?.name ?? null,
            status: invitation.status,
            expires_at: invitation.expires_at,
        };
    },

    async revoke(id) {
        const invitationRepo = AppDataSource.getRepository('Invitation');
        const invitation = await invitationRepo.findOne({ where: { id } });
        if (!invitation) {
            throw createError(404, 'Invitation not found');
        }
        if (invitation.status !== 'pending') {
            throw createError(400, 'Only pending invitations can be revoked');
        }

        await invitationRepo.update(id, { status: 'expired' });
        return { message: 'Invitation revoked' };
    },
};

module.exports = InvitationService;
