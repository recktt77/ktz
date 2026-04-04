const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
    name: 'UserRole',
    tableName: 'user_roles',
    columns: {
        id: {
            type: 'uuid',
            primary: true,
            generated: 'uuid',
        },
        assigned_at: {
            type: 'timestamp',
            createDate: true,
        },
    },
    relations: {
        user: {
            type: 'many-to-one',
            target: 'User',
            joinColumn: { name: 'user_id' },
            onDelete: 'CASCADE',
        },
        role: {
            type: 'many-to-one',
            target: 'Role',
            joinColumn: { name: 'role_id' },
            onDelete: 'CASCADE',
        },
    },
    uniques: [
        {
            name: 'UQ_user_role',
            columns: ['user', 'role'],
        },
    ],
});
