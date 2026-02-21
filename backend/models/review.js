const { getDatabase } = require('../db/init');

class Review {
    static findById(id) {
        const db = getDatabase();
        return db.prepare(`
            SELECT r.*, u.username, u.display_name, u.avatar_url
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `).get(id);
    }

    static findByFilm(filmId, limit = 50, offset = 0) {
        const db = getDatabase();
        return db.prepare(`
            SELECT r.*, u.username, u.display_name, u.avatar_url
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.film_id = ?
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `).all(filmId, limit, offset);
    }

    static findByUser(userId, limit = 50, offset = 0) {
        const db = getDatabase();
        return db.prepare(`
            SELECT r.*, f.title, f.poster_path, f.release_date
            FROM reviews r
            JOIN films f ON r.film_id = f.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `).all(userId, limit, offset);
    }

    static create({ userId, filmId, tmdbId, content, containsSpoilers = false }) {
        const db = getDatabase();
        const result = db.prepare(`
            INSERT INTO reviews (user_id, film_id, tmdb_id, content, contains_spoilers)
            VALUES (?, ?, ?, ?, ?)
        `).run(userId, filmId, tmdbId, content, containsSpoilers ? 1 : 0);
        
        // Add to activity log
        const Film = require('./film');
        Film.addActivity(userId, 'reviewed', result.lastInsertRowid, 'review', { tmdbId, filmId });
        
        return this.findById(result.lastInsertRowid);
    }

    static update(id, { content, containsSpoilers }) {
        const db = getDatabase();
        db.prepare(`
            UPDATE reviews 
            SET content = ?, contains_spoilers = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(content, containsSpoilers ? 1 : 0, id);
        return this.findById(id);
    }

    static delete(id) {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
        return result.changes > 0;
    }

    static like(reviewId, userId) {
        const db = getDatabase();
        try {
            db.prepare(`
                INSERT INTO review_likes (review_id, user_id)
                VALUES (?, ?)
            `).run(reviewId, userId);
            
            // Update likes count
            db.prepare(`
                UPDATE reviews SET likes_count = likes_count + 1 WHERE id = ?
            `).run(reviewId);
            
            return true;
        } catch (error) {
            return false;
        }
    }

    static unlike(reviewId, userId) {
        const db = getDatabase();
        const result = db.prepare(`
            DELETE FROM review_likes WHERE review_id = ? AND user_id = ?
        `).run(reviewId, userId);
        
        if (result.changes > 0) {
            db.prepare(`
                UPDATE reviews SET likes_count = MAX(0, likes_count - 1) WHERE id = ?
            `).run(reviewId);
            return true;
        }
        return false;
    }

    static hasLiked(reviewId, userId) {
        const db = getDatabase();
        const result = db.prepare(`
            SELECT 1 FROM review_likes WHERE review_id = ? AND user_id = ?
        `).get(reviewId, userId);
        return !!result;
    }

    static getLikes(reviewId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT u.id, u.username, u.display_name, u.avatar_url
            FROM review_likes rl
            JOIN users u ON rl.user_id = u.id
            WHERE rl.review_id = ?
        `).all(reviewId);
    }

    static addComment(reviewId, userId, content) {
        const db = getDatabase();
        const result = db.prepare(`
            INSERT INTO review_comments (review_id, user_id, content)
            VALUES (?, ?, ?)
        `).run(reviewId, userId, content);
        return this.getComment(result.lastInsertRowid);
    }

    static getComment(id) {
        const db = getDatabase();
        return db.prepare(`
            SELECT rc.*, u.username, u.display_name, u.avatar_url
            FROM review_comments rc
            JOIN users u ON rc.user_id = u.id
            WHERE rc.id = ?
        `).get(id);
    }

    static getComments(reviewId, limit = 50, offset = 0) {
        const db = getDatabase();
        return db.prepare(`
            SELECT rc.*, u.username, u.display_name, u.avatar_url
            FROM review_comments rc
            JOIN users u ON rc.user_id = u.id
            WHERE rc.review_id = ?
            ORDER BY rc.created_at ASC
            LIMIT ? OFFSET ?
        `).all(reviewId, limit, offset);
    }

    static deleteComment(id) {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM review_comments WHERE id = ?').run(id);
        return result.changes > 0;
    }

    static getRecentReviews(limit = 20) {
        const db = getDatabase();
        return db.prepare(`
            SELECT r.*, u.username, u.display_name, u.avatar_url,
                   f.title, f.poster_path, f.release_date
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN films f ON r.film_id = f.id
            ORDER BY r.created_at DESC
            LIMIT ?
        `).all(limit);
    }

    static toJSON(review) {
        return {
            id: review.id,
            userId: review.user_id,
            filmId: review.film_id,
            tmdbId: review.tmdb_id,
            content: review.content,
            containsSpoilers: review.contains_spoilers === 1,
            likesCount: review.likes_count,
            createdAt: review.created_at,
            updatedAt: review.updated_at,
            user: {
                username: review.username,
                displayName: review.display_name,
                avatarUrl: review.avatar_url
            }
        };
    }
}

module.exports = Review;
