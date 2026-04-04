const jwt = require('jsonwebtoken');
const config = require('../../config');

const TokenService = {
    generateAccessToken(payload) {
        return jwt.sign(payload, config.jwt.accessSecret, {
            expiresIn: config.jwt.accessExpiresIn,
        });
    },

    generateRefreshToken(payload) {
        return jwt.sign(payload, config.jwt.refreshSecret, {
            expiresIn: config.jwt.refreshExpiresIn,
        });
    },

    verifyAccessToken(token) {
        try {
            return jwt.verify(token, config.jwt.accessSecret);
        } catch {
            return null;
        }
    },

    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, config.jwt.refreshSecret);
        } catch {
            return null;
        }
    },

    generatePair(payload) {
        const clean = {
            userId: payload.userId,
            email: payload.email,
            roles: payload.roles,
            stationId: payload.stationId || null,
        };
        return {
            access_token: this.generateAccessToken(clean),
            refresh_token: this.generateRefreshToken(clean),
        };
    },
};

module.exports = TokenService;
