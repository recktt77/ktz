const UserService = require('../../application/services/UserService');

const UserController = {
    async getAll(_req, res, next) {
        try {
            const users = await UserService.getAll();
            res.json(users);
        } catch (err) {
            next(err);
        }
    },

    async getById(req, res, next) {
        try {
            const user = await UserService.getById(req.params.id);
            res.json(user);
        } catch (err) {
            next(err);
        }
    },

    async update(req, res, next) {
        try {
            const user = await UserService.update(req.params.id, req.body);
            res.json(user);
        } catch (err) {
            next(err);
        }
    },

    async delete(req, res, next) {
        try {
            const result = await UserService.delete(req.params.id);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },

    async assignRole(req, res, next) {
        try {
            const result = await UserService.assignRole(req.params.id, req.body.role_id);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },

    async removeRole(req, res, next) {
        try {
            const result = await UserService.removeRole(req.params.id, req.params.roleId);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },
};

module.exports = UserController;
