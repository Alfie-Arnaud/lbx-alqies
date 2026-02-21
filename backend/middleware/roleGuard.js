function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

function requireOwner(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    // owner and higher_admin can access admin routes
    if (req.user.role !== 'owner' && req.user.role !== 'higher_admin') {
        return res.status(403).json({ error: 'Owner access required' });
    }
    next();
}

function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

module.exports = {
    requireRole,
    requireOwner,
    requireAuth
};