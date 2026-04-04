function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.user.roles) {
            return res.status(401).json({ error: true, message: 'Not authenticated' });
        }

        const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
        if (!hasRole) {
            return res.status(403).json({ error: true, message: 'Insufficient permissions' });
        }

        next();
    };
}

module.exports = requireRole;
