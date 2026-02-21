const { getDatabase } = require('../db/init');

class Film {
    static findByTmdbId(tmdbId) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM films WHERE tmdb_id = ?').get(tmdbId);
    }

    static findById(id) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM films WHERE id = ?').get(id);
    }

    static createOrUpdate(filmData) {
        const db = getDatabase();
        const existing = this.findByTmdbId(filmData.tmdbId);
        
        if (existing) {
            db.prepare(`
                UPDATE films 
                SET title = ?, original_title = ?, overview = ?, poster_path = ?,
                    backdrop_path = ?, release_date = ?, runtime = ?, genres = ?,
                    tagline = ?, vote_average = ?, vote_count = ?, media_type = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE tmdb_id = ?
            `).run(
                filmData.title,
                filmData.originalTitle,
                filmData.overview,
                filmData.posterPath,
                filmData.backdropPath,
                filmData.releaseDate,
                filmData.runtime,
                JSON.stringify(filmData.genres || []),
                filmData.tagline,
                filmData.voteAverage,
                filmData.voteCount,
                filmData.mediaType || 'movie',
                filmData.tmdbId
            );
            return this.findByTmdbId(filmData.tmdbId);
        } else {
            const result = db.prepare(`
                INSERT INTO films (tmdb_id, title, original_title, overview, poster_path,
                    backdrop_path, release_date, runtime, genres, tagline, vote_average,
                    vote_count, media_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                filmData.tmdbId,
                filmData.title,
                filmData.originalTitle,
                filmData.overview,
                filmData.posterPath,
                filmData.backdropPath,
                filmData.releaseDate,
                filmData.runtime,
                JSON.stringify(filmData.genres || []),
                filmData.tagline,
                filmData.voteAverage,
                filmData.voteCount,
                filmData.mediaType || 'movie'
            );
            return this.findById(result.lastInsertRowid);
        }
    }

    static markAsWatched(userId, filmId, tmdbId, rating = null, watchedDate = null) {
        const db = getDatabase();
        const existing = db.prepare(`
            SELECT * FROM user_films WHERE user_id = ? AND film_id = ?
        `).get(userId, filmId);
        
        if (existing) {
            db.prepare(`
                UPDATE user_films 
                SET is_watched = 1, rating = COALESCE(?, rating), 
                    watched_date = COALESCE(?, watched_date),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND film_id = ?
            `).run(rating, watchedDate, userId, filmId);
        } else {
            db.prepare(`
                INSERT INTO user_films (user_id, film_id, tmdb_id, is_watched, rating, watched_date)
                VALUES (?, ?, ?, 1, ?, ?)
            `).run(userId, filmId, tmdbId, rating, watchedDate);
        }
        
        // Add to activity log
        this.addActivity(userId, 'watched', filmId, 'film', { tmdbId });
        
        return this.getUserFilm(userId, filmId);
    }

    static rateFilm(userId, filmId, tmdbId, rating) {
        const db = getDatabase();
        const existing = db.prepare(`
            SELECT * FROM user_films WHERE user_id = ? AND film_id = ?
        `).get(userId, filmId);
        
        if (existing) {
            db.prepare(`
                UPDATE user_films 
                SET rating = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND film_id = ?
            `).run(rating, userId, filmId);
        } else {
            db.prepare(`
                INSERT INTO user_films (user_id, film_id, tmdb_id, rating)
                VALUES (?, ?, ?, ?)
            `).run(userId, filmId, tmdbId, rating);
        }
        
        // Add to activity log
        this.addActivity(userId, 'rated', filmId, 'film', { tmdbId, rating });
        
        return this.getUserFilm(userId, filmId);
    }

    static addToWatchlist(userId, filmId, tmdbId) {
        const db = getDatabase();
        try {
            db.prepare(`
                INSERT INTO watchlist (user_id, film_id, tmdb_id)
                VALUES (?, ?, ?)
            `).run(userId, filmId, tmdbId);
            
            // Add to activity log
            this.addActivity(userId, 'watchlisted', filmId, 'film', { tmdbId });
            
            return true;
        } catch (error) {
            return false;
        }
    }

    static removeFromWatchlist(userId, filmId) {
        const db = getDatabase();
        const result = db.prepare(`
            DELETE FROM watchlist WHERE user_id = ? AND film_id = ?
        `).run(userId, filmId);
        return result.changes > 0;
    }

    static isInWatchlist(userId, filmId) {
        const db = getDatabase();
        const result = db.prepare(`
            SELECT 1 FROM watchlist WHERE user_id = ? AND film_id = ?
        `).get(userId, filmId);
        return !!result;
    }

    static getUserFilm(userId, filmId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT uf.*, f.title, f.poster_path, f.release_date
            FROM user_films uf
            JOIN films f ON uf.film_id = f.id
            WHERE uf.user_id = ? AND uf.film_id = ?
        `).get(userId, filmId);
    }

    static getUserWatchedFilms(userId, limit = 50, offset = 0) {
        const db = getDatabase();
        return db.prepare(`
            SELECT uf.*, f.title, f.poster_path, f.release_date, f.runtime
            FROM user_films uf
            JOIN films f ON uf.film_id = f.id
            WHERE uf.user_id = ? AND uf.is_watched = 1
            ORDER BY uf.watched_date DESC, uf.created_at DESC
            LIMIT ? OFFSET ?
        `).all(userId, limit, offset);
    }

    static getUserWatchlist(userId, limit = 50, offset = 0) {
        const db = getDatabase();
        return db.prepare(`
            SELECT w.*, f.title, f.poster_path, f.release_date, f.runtime
            FROM watchlist w
            JOIN films f ON w.film_id = f.id
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
            LIMIT ? OFFSET ?
        `).all(userId, limit, offset);
    }

    static getUserRatings(userId, limit = 50, offset = 0) {
        const db = getDatabase();
        return db.prepare(`
            SELECT uf.*, f.title, f.poster_path, f.release_date
            FROM user_films uf
            JOIN films f ON uf.film_id = f.id
            WHERE uf.user_id = ? AND uf.rating IS NOT NULL
            ORDER BY uf.updated_at DESC
            LIMIT ? OFFSET ?
        `).all(userId, limit, offset);
    }

    static getAverageRating(filmId) {
        const db = getDatabase();
        const result = db.prepare(`
            SELECT AVG(rating) as avg_rating, COUNT(*) as rating_count
            FROM user_films
            WHERE film_id = ? AND rating IS NOT NULL
        `).get(filmId);
        return {
            average: result.avg_rating || 0,
            count: result.rating_count || 0
        };
    }

    static addActivity(userId, activityType, targetId, targetType, metadata = {}) {
        const db = getDatabase();
        db.prepare(`
            INSERT INTO activity_log (user_id, activity_type, target_id, target_type, metadata)
            VALUES (?, ?, ?, ?, ?)
        `).run(userId, activityType, targetId, targetType, JSON.stringify(metadata));
    }

    static getActivityFeed(userIds, limit = 50, offset = 0) {
        const db = getDatabase();
        const placeholders = userIds.map(() => '?').join(',');
        return db.prepare(`
            SELECT al.*, u.username, u.display_name, u.avatar_url
            FROM activity_log al
            JOIN users u ON al.user_id = u.id
            WHERE al.user_id IN (${placeholders})
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `).all(...userIds, limit, offset);
    }

    static toJSON(film) {
        return {
            id: film.id,
            tmdbId: film.tmdb_id,
            title: film.title,
            originalTitle: film.original_title,
            overview: film.overview,
            posterPath: film.poster_path,
            backdropPath: film.backdrop_path,
            releaseDate: film.release_date,
            runtime: film.runtime,
            genres: film.genres ? JSON.parse(film.genres) : [],
            tagline: film.tagline,
            voteAverage: film.vote_average,
            voteCount: film.vote_count,
            mediaType: film.media_type,
            createdAt: film.created_at
        };
    }
}

module.exports = Film;
