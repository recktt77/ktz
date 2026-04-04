const AuthService = require('../../application/services/AuthService');

const AuthController = {
    async register(req, res, next) {
        try {
            const user = await AuthService.register(req.body);
            res.status(201).json(user);
        } catch (err) {
            next(err);
        }
    },

    async login(req, res, next) {
        try {
            const result = await AuthService.login(req.body);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },

    async refresh(req, res, next) {
        try {
            const tokens = await AuthService.refresh(req.body);
            res.json(tokens);
        } catch (err) {
            next(err);
        }
    },

    async logout(_req, res) {
        res.json({ message: 'Logged out' });
    },

    async getMe(req, res, next) {
        try {
            const user = await AuthService.getMe(req.user.userId);
            res.json(user);
        } catch (err) {
            next(err);
        }
    },

    async updateProfile(req, res, next) {
        try {
            const user = await AuthService.updateProfile(req.user.userId, req.body);
            res.json(user);
        } catch (err) {
            next(err);
        }
    },
};

module.exports = AuthController;
