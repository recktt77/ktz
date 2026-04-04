const { DataSource } = require('typeorm');
const config = require('../../config');

const User = require('../../domain/entities/User');
const Role = require('../../domain/entities/Role');
const UserRole = require('../../domain/entities/UserRole');
const Invitation = require('../../domain/entities/Invitation');

const AppDataSource = new DataSource({
    type: 'postgres',
    host: config.db.host,
    port: config.db.port,
    username: config.db.user,
    password: config.db.password,
    database: config.db.name,
    synchronize: true, // MVP — auto-sync schema, disable in production
    logging: false,
    entities: [User, Role, UserRole, Invitation],
});

module.exports = AppDataSource;
