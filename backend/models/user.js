const { getDatabase } = require('../db/init');
const bcrypt = require('bcryptjs');

function ensureColumns(db) {
    try { db.exec(`ALTER TABLE users ADD COLUMN banner_url TEXT`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN ban_reason TEXT`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN ban_expires_at DATETIME`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN location TEXT`); } catch (e) {}
}

function fixRoleConstraint(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users_fixed (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            bio TEXT DEFAULT '',
            avatar_url TEXT,
            banner_url TEXT,
            role TEXT DEFAULT 'free' CHECK (role IN ('owner', 'admin', 'higher_admin', 'patron', 'pro', 'lifetime', 'free')),
            is_banned INTEGER DEFAULT 0,
            ban_reason TEXT,
            ban_expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.exec(`INSERT OR IGNORE INTO users_fixed SELECT id, email, username, password_hash, display_name, bio, avatar_url, NULL, role, is_banned, NULL, NULL, created_at, updated_at FROM users`);
    db.exec(`DROP TABLE users`);
    db.exec(`ALTER TABLE users_fixed RENAME TO users`);
}

class User {
    static findByEmail(email) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    }

    static findByUsername(username) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    }

    static findById(id) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }

    static create({ email, username, password, displayName, role = 'free' }) {
        const db = getDatabase();
        const passwordHash = bcrypt.hashSync(password, 10);
        const result = db.prepare(`
            INSERT INTO users (email, username, password_hash, display_name, role)
            VALUES (?, ?, ?, ?, ?)
        `).run(email, username, passwordHash, displayName || username, role);
        return this.findById(result.lastInsertRowid);
    }

   static update(id, updates) {
    const db = getDatabase();
    ensureColumns(db);
        const allowedFields = ['display_name', 'bio', 'avatar_url', 'location', 'banner_url'];
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        if (fields.length === 0) return null;
        values.push(id);
        db.prepare(`UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
        return this.findById(id);
    }

    static updateRole(userId, role) {
        const db = getDatabase();
        try {
            db.prepare(`UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(role, userId);
        } catch (e) {
            if (e.message.includes('CHECK constraint failed')) {
                fixRoleConstraint(db);
                db.prepare(`UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(role, userId);
            } else {
                throw e;
            }
        }
        return this.findById(userId);
    }

    static ban(userId, reason = null, expiresAt = null) {
        const db = getDatabase();
        ensureColumns(db);
        db.prepare(`
            UPDATE users SET is_banned = 1, ban_reason = ?, ban_expires_at = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(reason, expiresAt, userId);
        return this.findById(userId);
    }

    static unban(userId) {
        const db = getDatabase();
        db.prepare(`
            UPDATE users SET is_banned = 0, ban_reason = NULL, ban_expires_at = NULL, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(userId);
        return this.findById(userId);
    }

    static verifyPassword(user, password) {
        return bcrypt.compareSync(password, user.password_hash);
    }

    static getStats(userId) {
        const db = getDatabase();
        const filmsWatched = db.prepare(`SELECT COUNT(*) as count FROM user_films WHERE user_id = ? AND is_watched = 1`).get(userId);
        const totalHours = db.prepare(`
            SELECT COALESCE(SUM(f.runtime), 0) as total_minutes
            FROM user_films uf JOIN films f ON uf.film_id = f.id
            WHERE uf.user_id = ? AND uf.is_watched = 1
        `).get(userId);
        const reviewsWritten = db.prepare(`SELECT COUNT(*) as count FROM reviews WHERE user_id = ?`).get(userId);
        const watchlistCount = db.prepare(`SELECT COUNT(*) as count FROM watchlist WHERE user_id = ?`).get(userId);
        const listsCreated = db.prepare(`SELECT COUNT(*) as count FROM user_lists WHERE user_id = ?`).get(userId);
        const followers = db.prepare(`SELECT COUNT(*) as count FROM follows WHERE following_id = ?`).get(userId);
        const following = db.prepare(`SELECT COUNT(*) as count FROM follows WHERE follower_id = ?`).get(userId);
        return {
            filmsWatched: filmsWatched.count,
            totalHours: Math.round((totalHours.total_minutes || 0) / 60),
            reviewsWritten: reviewsWritten.count,
            watchlistCount: watchlistCount.count,
            listsCreated: listsCreated.count,
            followers: followers.count,
            following: following.count
        };
    }

    static getFollowers(userId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT u.id, u.username, u.display_name, u.avatar_url
            FROM follows f JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = ?
        `).all(userId);
    }

    static getFollowing(userId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT u.id, u.username, u.display_name, u.avatar_url
            FROM follows f JOIN users u ON f.following_id = u.id
            WHERE f.follower_id = ?
        `).all(userId);
    }

    static follow(followerId, followingId) {
        const db = getDatabase();
        try {
            db.prepare(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`).run(followerId, followingId);
            return true;
        } catch { return false; }
    }

    static unfollow(followerId, followingId) {
        const db = getDatabase();
        const result = db.prepare(`DELETE FROM follows WHERE follower_id = ? AND following_id = ?`).run(followerId, followingId);
        return result.changes > 0;
    }

    static isFollowing(followerId, followingId) {
        const db = getDatabase();
        const result = db.prepare(`SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?`).get(followerId, followingId);
        return !!result;
    }

    static getAllUsers(limit = 100, offset = 0) {
        const db = getDatabase();
        ensureColumns(db);
        return db.prepare(`
            SELECT id, email, username, display_name, role, is_banned, ban_reason, ban_expires_at, created_at
            FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?
        `).all(limit, offset);
    }

    static getSiteStats() {
        const db = getDatabase();
        return {
            totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
            totalFilms: db.prepare('SELECT COUNT(*) as count FROM films').get().count,
            filmsLogged: db.prepare('SELECT COUNT(*) as count FROM user_films WHERE is_watched = 1').get().count,
            reviewsWritten: db.prepare('SELECT COUNT(*) as count FROM reviews').get().count,
        };
    }

    static toJSON(user) {
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.display_name,
            bio: user.bio,
            avatarUrl: user.avatar_url,
            location: user.location || null,
            bannerUrl: user.banner_url || null,
            role: user.role,
            isBanned: user.is_banned === 1,
            banReason: user.ban_reason || null,
            banExpiresAt: user.ban_expires_at || null,
            createdAt: user.created_at
        };
    }
}

module.exports = User;