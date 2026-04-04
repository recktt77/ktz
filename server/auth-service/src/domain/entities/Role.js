const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
    name: 'Role',
    tableName: 'roles',
    columns: {
        id: {
            type: 'uuid',
            primary: true,
            generated: 'uuid',
        },
        name: {
            type: 'varchar',
            length: 50,
            unique: true,
        },
        description: {
            type: 'varchar',
            length: 255,
            nullable: true,
        },
        created_at: {
            type: 'timestamp',
            createDate: true,
        },
    },
    relations: {
        userRoles: {
            type: 'one-to-many',
            target: 'UserRole',
            inverseSide: 'role',
        },
    },
});
