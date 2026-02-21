const express = require('express');
const router = express.Router();
const Film = require('../models/film');
const { authenticateToken } = require('../middleware/auth');

// Ensure film exists in DB (called before any user interaction)
router.post('/ensure', authenticateToken, async (req, res) => {
    try {
        const { tmdbId, title, posterPath, backdropPath, releaseDate, runtime, overview, voteAverage, voteCount } = req.body;
        if (!tmdbId || !title) return res.status(400).json({ error: 'tmdbId and title are required' });

        // If voteAverage not provided or 0, fetch from TMDB
        let finalVoteAverage = voteAverage || 0;
        let finalVoteCount = voteCount || 0;
        if (!finalVoteAverage) {
            try {
                const https = require('https');
                const tmdbKey = process.env.TMDB_API_KEY;
                const tmdbData = await new Promise((resolve, reject) => {
                    https.get(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbKey}`, r => {
                        let d = '';
                        r.on('data', c => d += c);
                        r.on('end', () => resolve(JSON.parse(d)));
                    }).on('error', reject);
                });
                finalVoteAverage = tmdbData.vote_average || 0;
                finalVoteCount = tmdbData.vote_count || 0;
            } catch (e) {
                console.error('Failed to fetch TMDB rating:', e);
            }
        }

        const film = Film.createOrUpdate({
            tmdbId: parseInt(tmdbId),
            title,
            posterPath,
            backdropPath,
            releaseDate,
            runtime,
            overview,
            voteAverage: finalVoteAverage,
            voteCount: finalVoteCount,
        });

        res.json({ film: Film.toJSON(film) });
    } catch (error) {
        console.error('Ensure film error:', error);
        res.status(500).json({ error: 'Failed to ensure film' });
    }
});

// Get user's status for a film (watched, watchlist, rating)
router.get('/:tmdbId/status', authenticateToken, async (req, res) => {
    try {
        const { tmdbId } = req.params;
        const film = Film.findByTmdbId(parseInt(tmdbId));
        if (!film) return res.json({ watched: false, inWatchlist: false, rating: 0 });

        const userFilm = Film.getUserFilm(req.user.userId, film.id);
        const inWatchlist = Film.isInWatchlist(req.user.userId, film.id);

        res.json({
            watched: userFilm?.is_watched === 1 || false,
            inWatchlist,
            rating: userFilm?.rating || 0,
        });
    } catch (error) {
        console.error('Get film status error:', error);
        res.status(500).json({ error: 'Failed to get film status' });
    }
});

// Get film details
router.get('/:tmdbId', async (req, res) => {
    try {
        const { tmdbId } = req.params;
        let film = Film.findByTmdbId(parseInt(tmdbId));

        if (!film) return res.json({ film: null, message: 'Film not in database yet' });

        const filmData = Film.toJSON(film);
        filmData.localRating = Film.getAverageRating(film.id);

        if (req.user) {
            const userFilm = Film.getUserFilm(req.user.userId, film.id);
            filmData.userData = userFilm;
            filmData.isInWatchlist = Film.isInWatchlist(req.user.userId, film.id);
        }

        res.json({ film: filmData });
    } catch (error) {
        console.error('Get film error:', error);
        res.status(500).json({ error: 'Failed to get film' });
    }
});

// Mark film as watched / unwatched
router.post('/:tmdbId/watched', authenticateToken, async (req, res) => {
    try {
        const { tmdbId } = req.params;
        const { watched } = req.body;

        let film = Film.findByTmdbId(parseInt(tmdbId));
        if (!film) return res.status(404).json({ error: 'Film not found. Call /ensure first.' });

        if (watched === false) {
            Film.unmarkAsWatched(req.user.userId, film.id);
            return res.json({ message: 'Film unmarked as watched' });
        }

        const userFilm = await Film.markAsWatched(req.user.userId, film.id, parseInt(tmdbId));
        res.json({ message: 'Film marked as watched', userFilm });
    } catch (error) {
        console.error('Mark watched error:', error);
        res.status(500).json({ error: 'Failed to mark film as watched' });
    }
});

// Rate film
router.post('/:tmdbId/rate', authenticateToken, async (req, res) => {
    try {
        const { tmdbId } = req.params;
        const { rating } = req.body;

        if (rating === undefined || rating < 0 || rating > 5)
            return res.status(400).json({ error: 'Rating must be between 0 and 5' });

        let film = Film.findByTmdbId(parseInt(tmdbId));
        if (!film) return res.status(404).json({ error: 'Film not found. Call /ensure first.' });

        const userFilm = Film.rateFilm(req.user.userId, film.id, parseInt(tmdbId), rating);
        res.json({ message: 'Film rated successfully', userFilm });
    } catch (error) {
        console.error('Rate film error:', error);
        res.status(500).json({ error: 'Failed to rate film' });
    }
});

// Add/remove watchlist (toggle)
router.post('/:tmdbId/watchlist', authenticateToken, async (req, res) => {
    try {
        const { tmdbId } = req.params;
        const { inWatchlist } = req.body;

        let film = Film.findByTmdbId(parseInt(tmdbId));
        if (!film) return res.status(404).json({ error: 'Film not found. Call /ensure first.' });

        if (inWatchlist === false) {
            Film.removeFromWatchlist(req.user.userId, film.id);
            return res.json({ message: 'Removed from watchlist' });
        }

        const success = Film.addToWatchlist(req.user.userId, film.id, parseInt(tmdbId));
        success
            ? res.json({ message: 'Added to watchlist' })
            : res.status(409).json({ error: 'Already in watchlist' });
    } catch (error) {
        console.error('Watchlist error:', error);
        res.status(500).json({ error: 'Failed to update watchlist' });
    }
});

// Get user's watched films
router.get('/user/watched', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const films = Film.getUserWatchedFilms(req.user.userId, parseInt(limit), parseInt(offset));
        res.json({ films });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get watched films' });
    }
});

// Get user's watchlist
router.get('/user/watchlist', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const films = Film.getUserWatchlist(req.user.userId, parseInt(limit), parseInt(offset));
        res.json({ films });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get watchlist' });
    }
});

// Get user's ratings
router.get('/user/ratings', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const films = Film.getUserRatings(req.user.userId, parseInt(limit), parseInt(offset));
        res.json({ films });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get ratings' });
    }
});

// Create or update film
router.post('/', authenticateToken, async (req, res) => {
    try {
        const filmData = req.body;
        if (!filmData.tmdbId || !filmData.title)
            return res.status(400).json({ error: 'tmdbId and title are required' });

        const film = Film.createOrUpdate(filmData);
        res.json({ film: Film.toJSON(film) });
    } catch (error) {
        console.error('Create film error:', error);
        res.status(500).json({ error: 'Failed to create/update film' });
    }
});

// Get activity feed
router.get('/feed/activity', authenticateToken, async (req, res) => {
    try {
        const User = require('../models/user');
        const { limit = 50, offset = 0 } = req.query;
        const following = User.getFollowing(req.user.userId);
        const userIds = [req.user.userId, ...following.map(u => u.id)];
        const activities = Film.getActivityFeed(userIds, parseInt(limit), parseInt(offset));
        res.json({ activities });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get activity feed' });
    }
});

module.exports = router;