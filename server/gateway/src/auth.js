const jwt = require('jsonwebtoken');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret-change-me';

/**
 * Gateway-level JWT authentication middleware.
 * Verifies the access token and attaches decoded payload to x-user-* headers
 * so downstream services can read user info without re-verifying.
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    // Forward user info to downstream services via headers
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-roles'] = JSON.stringify(decoded.roles || []);
    req.headers['x-user-station'] = decoded.stationId || '';
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role check middleware factory. Requires authMiddleware to run first.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      const roles = JSON.parse(req.headers['x-user-roles'] || '[]');
      const hasRole = roles.some((r) => allowedRoles.includes(r));
      if (!hasRole) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    } catch {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
  };
}

module.exports = { authMiddleware, requireRole };
