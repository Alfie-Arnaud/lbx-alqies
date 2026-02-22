const jwt = require('jsonwebtoken');
const User = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function generateToken(user) {
    return jwt.sign(
        { 
            userId: user.id, 
            email: user.email, 
            username: user.username,
            role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function authenticateToken(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
}

async function authenticateUser(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        req.user = null;
        return next();
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = User.findById(decoded.userId);
        
        if (!user || user.is_banned) {
            req.user = null;
        } else {
            req.user = User.toJSON(user);
        }
        next();
    } catch (error) {
        req.user = null;
        next();
    }
}

function setAuthCookie(res, token) {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
}

function clearAuthCookie(res) {
    res.clearCookie('token');
}

module.exports = {
    generateToken,
    authenticateToken,
    authenticateUser,
    setAuthCookie,
    clearAuthCookie
};
