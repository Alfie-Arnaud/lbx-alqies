const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { requireOwner } = require('../middleware/roleGuard');

// Get site stats
router.get('/stats', requireOwner, (req, res) => {
    try {
        const stats = User.getSiteStats();
        res.json({ stats });
    } catch (error) {
        console.error('Get site stats error:', error);
        res.status(500).json({ error: 'Failed to get site stats' });
    }
});

// Get all users
router.get('/users', requireOwner, (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const users = User.getAllUsers(parseInt(limit), parseInt(offset));
        res.json({ 
            users: users.map(u => User.toJSON(u))
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Promote user
router.post('/promote', requireOwner, (req, res) => {
    try {
        const { username, role } = req.body;
        
        if (!username || !role) {
            return res.status(400).json({ error: 'Username and role are required' });
        }
        
        const validRoles = ['patron', 'pro', 'lifetime'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be patron, pro, or lifetime' });
        }
        
        const user = User.findByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.role === 'owner') {
            return res.status(403).json({ error: 'Cannot modify owner role' });
        }
        
        const updatedUser = User.updateRole(user.id, role);
        res.json({
            message: `User promoted to ${role}`,
            user: User.toJSON(updatedUser)
        });
    } catch (error) {
        console.error('Promote user error:', error);
        res.status(500).json({ error: 'Failed to promote user' });
    }
});

// Demote user (reset to free)
router.post('/demote', requireOwner, (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }
        
        const user = User.findByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.role === 'owner') {
            return res.status(403).json({ error: 'Cannot modify owner role' });
        }
        
        const updatedUser = User.updateRole(user.id, 'free');
        res.json({
            message: 'User demoted to free',
            user: User.toJSON(updatedUser)
        });
    } catch (error) {
        console.error('Demote user error:', error);
        res.status(500).json({ error: 'Failed to demote user' });
    }
});

// Ban user
router.post('/ban', requireOwner, (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }
        
        const user = User.findByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.role === 'owner') {
            return res.status(403).json({ error: 'Cannot ban owner' });
        }
        
        const updatedUser = User.ban(user.id);
        res.json({
            message: 'User banned successfully',
            user: User.toJSON(updatedUser)
        });
    } catch (error) {
        console.error('Ban user error:', error);
        res.status(500).json({ error: 'Failed to ban user' });
    }
});

// Unban user
router.post('/unban', requireOwner, (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }
        
        const user = User.findByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const updatedUser = User.unban(user.id);
        res.json({
            message: 'User unbanned successfully',
            user: User.toJSON(updatedUser)
        });
    } catch (error) {
        console.error('Unban user error:', error);
        res.status(500).json({ error: 'Failed to unban user' });
    }
});

// Create announcement
router.post('/broadcast', requireOwner, (req, res) => {
    try {
        const { title, content, expiresAt } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const db = require('../db/init').getDatabase();
        const result = db.prepare(`
            INSERT INTO announcements (title, content, created_by, expires_at)
            VALUES (?, ?, ?, ?)
        `).run(title, content, req.user.userId, expiresAt || null);
        
        const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid);
        
        res.status(201).json({
            message: 'Announcement created successfully',
            announcement
        });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

// Get active announcements
router.get('/announcements', (req, res) => {
    try {
        const db = require('../db/init').getDatabase();
        const announcements = db.prepare(`
            SELECT a.*, u.username as created_by_username
            FROM announcements a
            JOIN users u ON a.created_by = u.id
            WHERE a.is_active = 1 
            AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
            ORDER BY a.created_at DESC
        `).all();
        
        res.json({ announcements });
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({ error: 'Failed to get announcements' });
    }
});

// Deactivate announcement
router.patch('/announcements/:id/deactivate', requireOwner, (req, res) => {
    try {
        const { id } = req.params;
        const db = require('../db/init').getDatabase();
        
        db.prepare(`
            UPDATE announcements SET is_active = 0 WHERE id = ?
        `).run(parseInt(id));
        
        res.json({ message: 'Announcement deactivated' });
    } catch (error) {
        console.error('Deactivate announcement error:', error);
        res.status(500).json({ error: 'Failed to deactivate announcement' });
    }
});

// Owner command endpoint
router.post('/command', requireOwner, (req, res) => {
    try {
        const { command } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }
        
        // Parse command
        const parts = command.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        let result;
        
        switch (cmd) {
            case '/stats':
                result = User.getSiteStats();
                return res.json({ 
                    message: 'Site statistics',
                    stats: result
                });
                
            case '/promote':
                if (args.length < 2) {
                    return res.status(400).json({ error: 'Usage: /promote @username patron|pro|lifetime' });
                }
                const promoteUsername = args[0].replace('@', '');
                const promoteRole = args[1];
                const promoteUser = User.findByUsername(promoteUsername);
                if (!promoteUser) {
                    return res.status(404).json({ error: 'User not found' });
                }
                if (promoteUser.role === 'owner') {
                    return res.status(403).json({ error: 'Cannot modify owner' });
                }
                const promoted = User.updateRole(promoteUser.id, promoteRole);
                return res.json({ 
                    message: `Promoted @${promoteUsername} to ${promoteRole}`,
                    user: User.toJSON(promoted)
                });
                
            case '/demote':
                if (args.length < 1) {
                    return res.status(400).json({ error: 'Usage: /demote @username' });
                }
                const demoteUsername = args[0].replace('@', '');
                const demoteUser = User.findByUsername(demoteUsername);
                if (!demoteUser) {
                    return res.status(404).json({ error: 'User not found' });
                }
                if (demoteUser.role === 'owner') {
                    return res.status(403).json({ error: 'Cannot modify owner' });
                }
                const demoted = User.updateRole(demoteUser.id, 'free');
                return res.json({ 
                    message: `Demoted @${demoteUsername} to free`,
                    user: User.toJSON(demoted)
                });
                
            case '/ban':
                if (args.length < 1) {
                    return res.status(400).json({ error: 'Usage: /ban @username' });
                }
                const banUsername = args[0].replace('@', '');
                const banUser = User.findByUsername(banUsername);
                if (!banUser) {
                    return res.status(404).json({ error: 'User not found' });
                }
                if (banUser.role === 'owner') {
                    return res.status(403).json({ error: 'Cannot ban owner' });
                }
                const banned = User.ban(banUser.id);
                return res.json({ 
                    message: `Banned @${banUsername}`,
                    user: User.toJSON(banned)
                });
                
            case '/unban':
                if (args.length < 1) {
                    return res.status(400).json({ error: 'Usage: /unban @username' });
                }
                const unbanUsername = args[0].replace('@', '');
                const unbanUser = User.findByUsername(unbanUsername);
                if (!unbanUser) {
                    return res.status(404).json({ error: 'User not found' });
                }
                const unbanned = User.unban(unbanUser.id);
                return res.json({ 
                    message: `Unbanned @${unbanUsername}`,
                    user: User.toJSON(unbanned)
                });
                
            case '/broadcast':
                if (args.length < 1) {
                    return res.status(400).json({ error: 'Usage: /broadcast <message>' });
                }
                const message = args.join(' ');
                const db = require('../db/init').getDatabase();
                const announcementResult = db.prepare(`
                    INSERT INTO announcements (title, content, created_by)
                    VALUES (?, ?, ?)
                `).run('Announcement', message, req.user.userId);
                return res.json({ 
                    message: 'Broadcast sent successfully'
                });
                
            default:
                return res.status(400).json({ 
                    error: 'Unknown command',
                    availableCommands: ['/stats', '/promote', '/demote', '/ban', '/unban', '/broadcast']
                });
        }
    } catch (error) {
        console.error('Command error:', error);
        res.status(500).json({ error: 'Command failed' });
    }
});

module.exports = router;
