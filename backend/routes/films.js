const express = require('express');
const router = express.Router();
const Film = require('../models/film');
const { authenticateToken } = require('../middleware/auth');

// Get film details (with user-specific data if authenticated)
router.get('/:tmdbId', async (req, res) => {
    try {
        const { tmdbId } = req.params;
        let film = Film.findByTmdbId(parseInt(tmdbId));
        
        // If film doesn't exist in DB, we'll return basic info
        // The frontend will fetch from TMDB
        if (!film) {
            return res.json({ 
                film: null,
                message: 'Film not in database yet'
            });
        }
        
        const filmData = Film.toJSON(film);
        
        // Get average rating from our users
        const rating = Film.getAverageRating(film.id);
        filmData.localRating = rating;
        
        // If user is authenticated, get their interaction
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

// Mark film as watched
router.post('/:tmdbId/watched', authenticateToken, async (req, res) => {
    try {
        const { tmdbId } = req.params;
        const { rating, watchedDate } = req.body;
        
        // Find or create film
        let film = Film.findByTmdbId(parseInt(tmdbId));
        if (!film) {
            // Film needs to be created first (frontend should provide film data)
            return res.status(404).json({ error: 'Film not found. Please provide film data first.' });
        }
        
        const userFilm = Film.markAsWatched(
            req.user.userId,
            film.id,
            parseInt(tmdbId),
            rating,
            watchedDate
        );
        
        res.json({
            message: 'Film marked as watched',
            userFilm
        });
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
        
        if (rating === undefined || rating < 0 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 0 and 5' });
        }
        
        let film = Film.findByTmdbId(parseInt(tmdbId));
        if (!film) {
            return res.status(404).json({ error: 'Film not found' });
        }
        
        const userFilm = Film.rateFilm(
            req.user.userId,
            film.id,
            parseInt(tmdbId),
            rating
        );
        
        res.json({
            message: 'Film rated successfully',
            userFilm
        });
    } catch (error) {
        console.error('Rate film error:', error);
        res.status(500).json({ error: 'Failed to rate film' });
    }
});

// Add to watchlist
router.post('/:tmdbId/watchlist', authenticateToken, async (req, res) => {
    try {
        const { tmdbId } = req.params;
        
        let film = Film.findByTmdbId(parseInt(tmdbId));
        if (!film) {
            return res.status(404).json({ error: 'Film not found' });
        }
        
        const success = Film.addToWatchlist(req.user.userId, film.id, parseInt(tmdbId));
        
        if (success) {
            res.json({ message: 'Added to watchlist' });
        } else {
            res.status(409).json({ error: 'Already in watchlist' });
        }
    } catch (error) {
        console.error('Add to watchlist error:', error);
        res.status(500).json({ error: 'Failed to add to watchlist' });
    }
});

// Remove from watchlist
router.delete('/:tmdbId/watchlist', authenticateToken, async (req, res) => {
    try {
        const { tmdbId } = req.params;
        
        let film = Film.findByTmdbId(parseInt(tmdbId));
        if (!film) {
            return res.status(404).json({ error: 'Film not found' });
        }
        
        const success = Film.removeFromWatchlist(req.user.userId, film.id);
        
        if (success) {
            res.json({ message: 'Removed from watchlist' });
        } else {
            res.status(404).json({ error: 'Not in watchlist' });
        }
    } catch (error) {
        console.error('Remove from watchlist error:', error);
        res.status(500).json({ error: 'Failed to remove from watchlist' });
    }
});

// Get user's watched films
router.get('/user/watched', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const films = Film.getUserWatchedFilms(
            req.user.userId,
            parseInt(limit),
            parseInt(offset)
        );
        res.json({ films });
    } catch (error) {
        console.error('Get watched films error:', error);
        res.status(500).json({ error: 'Failed to get watched films' });
    }
});

// Get user's watchlist
router.get('/user/watchlist', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const films = Film.getUserWatchlist(
            req.user.userId,
            parseInt(limit),
            parseInt(offset)
        );
        res.json({ films });
    } catch (error) {
        console.error('Get watchlist error:', error);
        res.status(500).json({ error: 'Failed to get watchlist' });
    }
});

// Get user's ratings
router.get('/user/ratings', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const films = Film.getUserRatings(
            req.user.userId,
            parseInt(limit),
            parseInt(offset)
        );
        res.json({ films });
    } catch (error) {
        console.error('Get ratings error:', error);
        res.status(500).json({ error: 'Failed to get ratings' });
    }
});

// Create or update film (when fetched from TMDB)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const filmData = req.body;
        
        // Validate required fields
        if (!filmData.tmdbId || !filmData.title) {
            return res.status(400).json({ error: 'tmdbId and title are required' });
        }
        
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
        
        // Get users the current user follows
        const following = User.getFollowing(req.user.userId);
        const userIds = [req.user.userId, ...following.map(u => u.id)];
        
        const activities = Film.getActivityFeed(
            userIds,
            parseInt(limit),
            parseInt(offset)
        );
        
        res.json({ activities });
    } catch (error) {
        console.error('Get activity feed error:', error);
        res.status(500).json({ error: 'Failed to get activity feed' });
    }
});

module.exports = router;
