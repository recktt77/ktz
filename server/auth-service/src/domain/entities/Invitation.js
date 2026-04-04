const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
    name: 'Invitation',
    tableName: 'invitations',
    columns: {
        id: {
            type: 'uuid',
            primary: true,
            generated: 'uuid',
        },
        email: {
            type: 'varchar',
            length: 255,
        },
        station_id: {
            type: 'uuid',
            nullable: true,
        },
        invite_code: {
            type: 'varchar',
            length: 64,
            unique: true,
        },
        status: {
            type: 'enum',
            enum: ['pending', 'accepted', 'expired'],
            default: 'pending',
        },
        expires_at: {
            type: 'timestamp',
        },
        created_at: {
            type: 'timestamp',
            createDate: true,
        },
    },
    relations: {
        role: {
            type: 'many-to-one',
            target: 'Role',
            joinColumn: { name: 'role_id' },
            eager: true,
        },
        createdBy: {
            type: 'many-to-one',
            target: 'User',
            joinColumn: { name: 'created_by' },
            nullable: true,
        },
    },
});
