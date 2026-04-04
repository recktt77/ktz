const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
    name: 'User',
    tableName: 'users',
    columns: {
        id: {
            type: 'uuid',
            primary: true,
            generated: 'uuid',
        },
        email: {
            type: 'varchar',
            length: 255,
            unique: true,
        },
        password_hash: {
            type: 'varchar',
            length: 255,
        },
        full_name: {
            type: 'varchar',
            length: 255,
        },
        phone: {
            type: 'varchar',
            length: 50,
            nullable: true,
        },
        station_id: {
            type: 'uuid',
            nullable: true,
        },
        is_active: {
            type: 'boolean',
            default: true,
        },
        created_at: {
            type: 'timestamp',
            createDate: true,
        },
        updated_at: {
            type: 'timestamp',
            updateDate: true,
        },
    },
    relations: {
        userRoles: {
            type: 'one-to-many',
            target: 'UserRole',
            inverseSide: 'user',
        },
    },
});
