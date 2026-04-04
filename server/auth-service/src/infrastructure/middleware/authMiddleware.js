const TokenService = require('../../application/services/TokenService');

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: true, message: 'Access token required' });
    }

    const token = header.slice(7);
    const payload = TokenService.verifyAccessToken(token);
    if (!payload) {
        return res.status(401).json({ error: true, message: 'Invalid or expired access token' });
    }

    req.user = payload; // { userId, email, roles, stationId }
    next();
}

module.exports = authMiddleware;
