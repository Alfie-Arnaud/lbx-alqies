const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { generateToken, setAuthCookie, clearAuthCookie, authenticateToken } = require('../middleware/auth');

const OWNER_EMAIL = process.env.OWNER_EMAIL;

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, username, password, displayName } = req.body;
        
        // Validation
        if (!email || !username || !password) {
            return res.status(400).json({ error: 'Email, username, and password are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ error: 'Username must be 3-30 characters' });
        }
        
        // Check if email exists
        const existingEmail = User.findByEmail(email);
        if (existingEmail) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        
        // Check if username exists
        const existingUsername = User.findByUsername(username);
        if (existingUsername) {
            return res.status(409).json({ error: 'Username already taken' });
        }
        
        // Determine role (owner if matches OWNER_EMAIL)
        const role = (email === OWNER_EMAIL) ? 'owner' : 'free';
        
        // Create user
        const user = User.create({
            email,
            username,
            password,
            displayName,
            role
        });
        
        // Generate token and set cookie
        const token = generateToken(user);
        setAuthCookie(res, token);
        
        res.status(201).json({
            message: 'User registered successfully',
            user: User.toJSON(user)
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user by email
        const user = User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check if banned
        if (user.is_banned) {
            return res.status(403).json({ error: 'Account has been banned' });
        }
        
        // Verify password
        const isValidPassword = User.verifyPassword(user, password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate token and set cookie
        const token = generateToken(user);
        setAuthCookie(res, token);
        
        res.json({
            message: 'Login successful',
            user: User.toJSON(user)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    clearAuthCookie(res);
    res.json({ message: 'Logout successful' });
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
    try {
        const user = User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user: User.toJSON(user) });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Update profile
router.patch('/profile', authenticateToken, (req, res) => {
    try {
        const { displayName, bio, avatarUrl } = req.body;
        const updates = {};
        
        if (displayName !== undefined) updates.display_name = displayName;
        if (bio !== undefined) updates.bio = bio;
        if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
        
        const user = User.update(req.user.userId, updates);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            message: 'Profile updated successfully',
            user: User.toJSON(user)
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Get user stats
router.get('/stats', authenticateToken, (req, res) => {
    try {
        const stats = User.getStats(req.user.userId);
        res.json({ stats });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Get user profile by username
router.get('/profile/:username', (req, res) => {
    try {
        const user = User.findByUsername(req.params.username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const stats = User.getStats(user.id);
        const publicProfile = {
            ...User.toJSON(user),
            stats
        };
        
        res.json({ user: publicProfile });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Follow user
router.post('/follow/:userId', authenticateToken, (req, res) => {
    try {
        const targetUserId = parseInt(req.params.userId);
        
        if (targetUserId === req.user.userId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }
        
        const targetUser = User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const success = User.follow(req.user.userId, targetUserId);
        if (success) {
            res.json({ message: 'User followed successfully' });
        } else {
            res.status(409).json({ error: 'Already following this user' });
        }
    } catch (error) {
        console.error('Follow error:', error);
        res.status(500).json({ error: 'Failed to follow user' });
    }
});

// Unfollow user
router.post('/unfollow/:userId', authenticateToken, (req, res) => {
    try {
        const targetUserId = parseInt(req.params.userId);
        const success = User.unfollow(req.user.userId, targetUserId);
        if (success) {
            res.json({ message: 'User unfollowed successfully' });
        } else {
            res.status(404).json({ error: 'Not following this user' });
        }
    } catch (error) {
        console.error('Unfollow error:', error);
        res.status(500).json({ error: 'Failed to unfollow user' });
    }
});

// Check if following
router.get('/is-following/:userId', authenticateToken, (req, res) => {
    try {
        const targetUserId = parseInt(req.params.userId);
        const isFollowing = User.isFollowing(req.user.userId, targetUserId);
        res.json({ isFollowing });
    } catch (error) {
        console.error('Check follow error:', error);
        res.status(500).json({ error: 'Failed to check follow status' });
    }
});

module.exports = router;
