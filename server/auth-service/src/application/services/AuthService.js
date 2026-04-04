const bcrypt = require('bcryptjs');
const AppDataSource = require('../../infrastructure/database/data-source');
const TokenService = require('./TokenService');

function createError(statusCode, message) {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.expose = true;
    return err;
}

const AuthService = {
    async register({ email, password, full_name, phone, invite_code }) {
        const invitationRepo = AppDataSource.getRepository('Invitation');
        const userRepo = AppDataSource.getRepository('User');
        const userRoleRepo = AppDataSource.getRepository('UserRole');

        const invitation = await invitationRepo.findOne({
            where: { invite_code },
            relations: ['role'],
        });

        if (!invitation) {
            throw createError(400, 'Invalid invite code');
        }
        if (invitation.status !== 'pending') {
            throw createError(400, 'Invitation already used or expired');
        }
        if (new Date(invitation.expires_at) < new Date()) {
            await invitationRepo.update(invitation.id, { status: 'expired' });
            throw createError(400, 'Invitation has expired');
        }
        if (invitation.email.toLowerCase() !== email.toLowerCase()) {
            throw createError(400, 'Email does not match invitation');
        }

        const existingUser = await userRepo.findOne({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            throw createError(409, 'User with this email already exists');
        }

        const password_hash = await bcrypt.hash(password, 10);

        const user = await userRepo.save({
            email: email.toLowerCase(),
            password_hash,
            full_name,
            phone: phone || null,
            station_id: invitation.station_id || null,
            is_active: true,
        });

        await userRoleRepo.save({
            user: { id: user.id },
            role: { id: invitation.role.id },
        });

        await invitationRepo.update(invitation.id, { status: 'accepted' });

        const roles = [invitation.role.name];
        const tokens = TokenService.generatePair({
            userId: user.id,
            email: user.email,
            roles,
            stationId: user.station_id,
        });

        const { password_hash: _, ...safeUser } = user;
        return { user: { ...safeUser, roles }, ...tokens };
    },

    async login({ email, password }) {
        const userRepo = AppDataSource.getRepository('User');

        const user = await userRepo.findOne({
            where: { email: email.toLowerCase() },
            relations: ['userRoles', 'userRoles.role'],
        });

        if (!user) {
            throw createError(401, 'Invalid email or password');
        }
        if (!user.is_active) {
            throw createError(403, 'Account deactivated');
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            throw createError(401, 'Invalid email or password');
        }

        const roles = user.userRoles.map((ur) => ur.role.name);
        const tokens = TokenService.generatePair({
            userId: user.id,
            email: user.email,
            roles,
            stationId: user.station_id,
        });

        const { password_hash: _, userRoles: __, ...safeUser } = user;
        return { user: { ...safeUser, roles }, ...tokens };
    },

    async refresh({ refresh_token }) {
        const payload = TokenService.verifyRefreshToken(refresh_token);
        if (!payload) {
            throw createError(401, 'Invalid or expired refresh token');
        }

        const userRepo = AppDataSource.getRepository('User');
        const user = await userRepo.findOne({
            where: { id: payload.userId },
            relations: ['userRoles', 'userRoles.role'],
        });

        if (!user || !user.is_active) {
            throw createError(401, 'User not found or deactivated');
        }

        const roles = user.userRoles.map((ur) => ur.role.name);
        return TokenService.generatePair({
            userId: user.id,
            email: user.email,
            roles,
            stationId: user.station_id,
        });
    },

    async getMe(userId) {
        const userRepo = AppDataSource.getRepository('User');
        const user = await userRepo.findOne({
            where: { id: userId },
            relations: ['userRoles', 'userRoles.role'],
        });

        if (!user) {
            throw createError(404, 'User not found');
        }

        const roles = user.userRoles.map((ur) => ur.role.name);
        const { password_hash: _, userRoles: __, ...safeUser } = user;
        return { ...safeUser, roles };
    },

    async updateProfile(userId, dto) {
        const userRepo = AppDataSource.getRepository('User');
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw createError(404, 'User not found');
        }

        if (dto.full_name !== undefined) user.full_name = dto.full_name;
        if (dto.phone !== undefined) user.phone = dto.phone;

        const saved = await userRepo.save(user);
        const { password_hash: _, ...safeUser } = saved;
        return safeUser;
    },
};

module.exports = AuthService;
