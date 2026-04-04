const AppDataSource = require('../../infrastructure/database/data-source');

function createError(statusCode, message) {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.expose = true;
    return err;
}

const UserService = {
    async getAll() {
        const userRepo = AppDataSource.getRepository('User');
        const users = await userRepo.find({
            relations: ['userRoles', 'userRoles.role'],
            order: { created_at: 'DESC' },
        });

        return users.map(({ password_hash, userRoles, ...rest }) => ({
            ...rest,
            roles: userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
        }));
    },

    async getById(id) {
        const userRepo = AppDataSource.getRepository('User');
        const user = await userRepo.findOne({
            where: { id },
            relations: ['userRoles', 'userRoles.role'],
        });
        if (!user) {
            throw createError(404, 'User not found');
        }

        const { password_hash, userRoles, ...rest } = user;
        return {
            ...rest,
            roles: userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
        };
    },

    async update(id, dto) {
        const userRepo = AppDataSource.getRepository('User');
        const user = await userRepo.findOne({ where: { id } });
        if (!user) {
            throw createError(404, 'User not found');
        }

        if (dto.full_name !== undefined) user.full_name = dto.full_name;
        if (dto.phone !== undefined) user.phone = dto.phone;
        if (dto.station_id !== undefined) user.station_id = dto.station_id;
        if (dto.is_active !== undefined) user.is_active = dto.is_active;

        const saved = await userRepo.save(user);
        const { password_hash: _, ...safeUser } = saved;
        return safeUser;
    },

    async delete(id) {
        const userRepo = AppDataSource.getRepository('User');
        const user = await userRepo.findOne({ where: { id } });
        if (!user) {
            throw createError(404, 'User not found');
        }

        user.is_active = false;
        await userRepo.save(user);
        return { message: 'User deactivated' };
    },

    async assignRole(userId, roleId) {
        const userRepo = AppDataSource.getRepository('User');
        const roleRepo = AppDataSource.getRepository('Role');
        const userRoleRepo = AppDataSource.getRepository('UserRole');

        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) throw createError(404, 'User not found');

        const role = await roleRepo.findOne({ where: { id: roleId } });
        if (!role) throw createError(400, 'Role not found');

        const existing = await userRoleRepo.findOne({
            where: { user: { id: userId }, role: { id: roleId } },
        });
        if (existing) {
            throw createError(409, 'User already has this role');
        }

        await userRoleRepo.save({ user: { id: userId }, role: { id: roleId } });
        return { message: 'Role assigned' };
    },

    async removeRole(userId, roleId) {
        const userRoleRepo = AppDataSource.getRepository('UserRole');

        const existing = await userRoleRepo.findOne({
            where: { user: { id: userId }, role: { id: roleId } },
        });
        if (!existing) {
            throw createError(404, 'User does not have this role');
        }

        await userRoleRepo.remove(existing);
        return { message: 'Role removed' };
    },
};

module.exports = UserService;
