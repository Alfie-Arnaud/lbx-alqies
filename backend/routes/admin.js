const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { requireOwner } = require('../middleware/roleGuard');

const VALID_ROLES = ['free', 'pro', 'patron', 'lifetime', 'admin', 'higher_admin'];

// Get site stats
router.get('/stats', requireOwner, (req, res) => {
    try {
        res.json({ stats: User.getSiteStats() });
    } catch (error) {
        console.error('stats error:', error.message);
        res.status(500).json({ error: 'Failed to get stats', detail: error.message });
    }
});

// Get all users
router.get('/users', requireOwner, (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const users = User.getAllUsers(parseInt(limit), parseInt(offset));
        res.json({ users: users.map(u => User.toJSON(u)) });
    } catch (error) {
        console.error('getAllUsers error:', error.message);
        res.status(500).json({ error: 'Failed to get users', detail: error.message });
    }
});

// Promote user
router.post('/promote', requireOwner, (req, res) => {
    try {
        const { username, role } = req.body;
        if (!username || !role) return res.status(400).json({ error: 'Username and role are required' });
        if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: `Invalid role. Valid: ${VALID_ROLES.join(', ')}` });
        const user = User.findByUsername(username);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role === 'owner') return res.status(403).json({ error: 'Cannot modify owner role' });
        const updated = User.updateRole(user.id, role);
        res.json({ message: `User role set to ${role}`, user: User.toJSON(updated) });
    } catch (error) {
        console.error('promote error:', error.message);
        res.status(500).json({ error: 'Failed to update role', detail: error.message });
    }
});

// Demote user
router.post('/demote', requireOwner, (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: 'Username is required' });
        const user = User.findByUsername(username);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role === 'owner') return res.status(403).json({ error: 'Cannot modify owner role' });
        const updated = User.updateRole(user.id, 'free');
        res.json({ message: 'User demoted to free', user: User.toJSON(updated) });
    } catch (error) {
        console.error('demote error:', error.message);
        res.status(500).json({ error: 'Failed to demote user', detail: error.message });
    }
});

// Ban user
router.post('/ban', requireOwner, (req, res) => {
    try {
        const { username, reason, expiresAt } = req.body;
        if (!username) return res.status(400).json({ error: 'Username is required' });
        const user = User.findByUsername(username);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role === 'owner') return res.status(403).json({ error: 'Cannot ban owner' });
        res.json({ message: 'User banned', user: User.toJSON(User.ban(user.id, reason || null, expiresAt || null)) });
    } catch (error) {
        console.error('ban error:', error.message);
        res.status(500).json({ error: 'Failed to ban user', detail: error.message });
    }
});

// Unban user
router.post('/unban', requireOwner, (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: 'Username is required' });
        const user = User.findByUsername(username);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User unbanned', user: User.toJSON(User.unban(user.id)) });
    } catch (error) {
        console.error('unban error:', error.message);
        res.status(500).json({ error: 'Failed to unban user', detail: error.message });
    }
});

// Broadcast
router.post('/broadcast', requireOwner, (req, res) => {
    try {
        const { title, content, expiresAt } = req.body;
        if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
        const db = require('../db/init').getDatabase();
        const result = db.prepare(`
            INSERT INTO announcements (title, content, created_by, expires_at)
            VALUES (?, ?, ?, ?)
        `).run(title, content, req.user.id, expiresAt || null);
        const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ message: 'Announcement created successfully', announcement });
    } catch (error) {
        console.error('broadcast error:', error.message);
        res.status(500).json({ error: 'Failed to create announcement', detail: error.message });
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
        console.error('announcements error:', error.message);
        res.status(500).json({ error: 'Failed to get announcements', detail: error.message });
    }
});

// Deactivate announcement
router.patch('/announcements/:id/deactivate', requireOwner, (req, res) => {
    try {
        const db = require('../db/init').getDatabase();
        db.prepare(`UPDATE announcements SET is_active = 0 WHERE id = ?`).run(parseInt(req.params.id));
        res.json({ message: 'Announcement deactivated' });
    } catch (error) {
        console.error('deactivate error:', error.message);
        res.status(500).json({ error: 'Failed to deactivate announcement', detail: error.message });
    }
});

// Command endpoint
router.post('/command', requireOwner, (req, res) => {
    try {
        const { command } = req.body;
        if (!command) return res.status(400).json({ error: 'Command is required' });

        const parts = command.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (cmd) {
            case '/stats':
                return res.json({ message: 'Site statistics', stats: User.getSiteStats() });

            case '/promote': {
                if (args.length < 2) return res.status(400).json({ error: `Usage: /promote @username ${VALID_ROLES.join('|')}` });
                const username = args[0].replace('@', '');
                const role = args[1];
                if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: `Invalid role. Valid: ${VALID_ROLES.join(', ')}` });
                const user = User.findByUsername(username);
                if (!user) return res.status(404).json({ error: 'User not found' });
                if (user.role === 'owner') return res.status(403).json({ error: 'Cannot modify owner' });
                const promoted = User.updateRole(user.id, role);
                return res.json({ message: `Set @${username} to ${role}`, user: User.toJSON(promoted) });
            }

            case '/demote': {
                if (args.length < 1) return res.status(400).json({ error: 'Usage: /demote @username' });
                const username = args[0].replace('@', '');
                const user = User.findByUsername(username);
                if (!user) return res.status(404).json({ error: 'User not found' });
                if (user.role === 'owner') return res.status(403).json({ error: 'Cannot modify owner' });
                const demoted = User.updateRole(user.id, 'free');
                return res.json({ message: `Demoted @${username} to free`, user: User.toJSON(demoted) });
            }

            case '/ban': {
                if (args.length < 1) return res.status(400).json({ error: 'Usage: /ban @username' });
                const username = args[0].replace('@', '');
                const user = User.findByUsername(username);
                if (!user) return res.status(404).json({ error: 'User not found' });
                if (user.role === 'owner') return res.status(403).json({ error: 'Cannot ban owner' });
                return res.json({ message: `Banned @${username}`, user: User.toJSON(User.ban(user.id)) });
            }

            case '/unban': {
                if (args.length < 1) return res.status(400).json({ error: 'Usage: /unban @username' });
                const username = args[0].replace('@', '');
                const user = User.findByUsername(username);
                if (!user) return res.status(404).json({ error: 'User not found' });
                return res.json({ message: `Unbanned @${username}`, user: User.toJSON(User.unban(user.id)) });
            }

            case '/broadcast': {
                if (args.length < 1) return res.status(400).json({ error: 'Usage: /broadcast <message>' });
                const message = args.join(' ');
                const db = require('../db/init').getDatabase();
                db.prepare(`INSERT INTO announcements (title, content, created_by) VALUES (?, ?, ?)`)
                    .run('Announcement', message, req.user.id);
                return res.json({ message: 'Broadcast sent!' });
            }

            default:
                return res.status(400).json({
                    error: 'Unknown command',
                    availableCommands: ['/stats', '/promote', '/demote', '/ban', '/unban', '/broadcast']
                });
        }
    } catch (error) {
        console.error('Command error:', error.message, error.stack);
        res.status(500).json({ error: 'Command failed', detail: error.message });
    }
});

module.exports = router;