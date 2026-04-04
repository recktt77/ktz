const bcrypt = require('bcryptjs');
const AppDataSource = require('../data-source');
const config = require('../../../config');

const ROLES = [
    { name: 'driver', description: 'Машинист' },
    { name: 'dispatcher', description: 'Диспетчер' },
    { name: 'engineer', description: 'Инженер-диагност' },
    { name: 'supervisor', description: 'Руководитель смены / эксплуатации' },
    { name: 'admin', description: 'Администратор системы' },
];

async function seedRoles() {
    const roleRepo = AppDataSource.getRepository('Role');
    const userRepo = AppDataSource.getRepository('User');
    const userRoleRepo = AppDataSource.getRepository('UserRole');

    for (const roleDef of ROLES) {
        const exists = await roleRepo.findOne({ where: { name: roleDef.name } });
        if (!exists) {
            await roleRepo.save(roleDef);
            console.log(`Seeded role: ${roleDef.name}`);
        }
    }

    // Seed admin user if env vars provided and no admin exists yet
    if (config.admin.email && config.admin.password) {
        const existingAdmin = await userRepo.findOne({
            where: { email: config.admin.email.toLowerCase() },
        });

        if (!existingAdmin) {
            const adminRole = await roleRepo.findOne({ where: { name: 'admin' } });
            const password_hash = await bcrypt.hash(config.admin.password, 10);

            const admin = await userRepo.save({
                email: config.admin.email.toLowerCase(),
                password_hash,
                full_name: 'System Admin',
                is_active: true,
            });

            await userRoleRepo.save({
                user: { id: admin.id },
                role: { id: adminRole.id },
            });

            console.log(`Seeded admin user: ${config.admin.email}`);
        }
    }
}

module.exports = seedRoles;
