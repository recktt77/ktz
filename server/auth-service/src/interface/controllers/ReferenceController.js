const AppDataSource = require('../../infrastructure/database/data-source');

// Hardcoded stations stub until Map Service is available
const STUB_STATIONS = [
    { id: 'a0000000-0000-0000-0000-000000000001', name: 'Астана-1', code: 'AST1' },
    { id: 'a0000000-0000-0000-0000-000000000002', name: 'Алматы-1', code: 'ALM1' },
    { id: 'a0000000-0000-0000-0000-000000000003', name: 'Караганда', code: 'KRG' },
];

const ReferenceController = {
    async getRoles(_req, res, next) {
        try {
            const roleRepo = AppDataSource.getRepository('Role');
            const roles = await roleRepo.find({ order: { name: 'ASC' } });
            res.json(roles);
        } catch (err) {
            next(err);
        }
    },

    async getStations(_req, res) {
        // Stub — replace with HTTP call to Map Service when available
        res.json(STUB_STATIONS);
    },
};

module.exports = ReferenceController;
