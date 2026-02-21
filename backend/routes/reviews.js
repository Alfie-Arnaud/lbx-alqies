const express = require('express');
const router = express.Router();
const Review = require('../models/review');
const Film = require('../models/film');
const { authenticateToken } = require('../middleware/auth');

// Get reviews for a film
router.get('/film/:tmdbId', async (req, res) => {
    try {
        const { tmdbId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        
        // Find film in our database
        const film = Film.findByTmdbId(parseInt(tmdbId));
        if (!film) {
            return res.json({ reviews: [], total: 0 });
        }
        
        const reviews = Review.findByFilm(film.id, parseInt(limit), parseInt(offset));
        
        // Check if current user has liked each review
        if (req.user) {
            for (const review of reviews) {
                review.hasLiked = Review.hasLiked(review.id, req.user.userId);
            }
        }
        
        res.json({ 
            reviews: reviews.map(r => Review.toJSON(r)),
            total: reviews.length
        });
    } catch (error) {
        console.error('Get film reviews error:', error);
        res.status(500).json({ error: 'Failed to get reviews' });
    }
});

// Get reviews by a user
router.get('/user/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        
        const User = require('../models/user');
        const user = User.findByUsername(username);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const reviews = Review.findByUser(user.id, parseInt(limit), parseInt(offset));
        res.json({ 
            reviews: reviews.map(r => Review.toJSON(r)),
            total: reviews.length
        });
    } catch (error) {
        console.error('Get user reviews error:', error);
        res.status(500).json({ error: 'Failed to get reviews' });
    }
});

// Get recent reviews
router.get('/recent', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const reviews = Review.getRecentReviews(parseInt(limit));
        res.json({ 
            reviews: reviews.map(r => Review.toJSON(r))
        });
    } catch (error) {
        console.error('Get recent reviews error:', error);
        res.status(500).json({ error: 'Failed to get recent reviews' });
    }
});

// Create a review
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { tmdbId, filmId, content, containsSpoilers } = req.body;
        
        if (!tmdbId || !content) {
            return res.status(400).json({ error: 'tmdbId and content are required' });
        }
        
        if (content.length < 10) {
            return res.status(400).json({ error: 'Review must be at least 10 characters' });
        }
        
        // Find or create film
        let film = Film.findByTmdbId(parseInt(tmdbId));
        if (!film && filmId) {
            film = Film.findById(filmId);
        }
        
        if (!film) {
            return res.status(404).json({ error: 'Film not found' });
        }
        
        const review = Review.create({
            userId: req.user.userId,
            filmId: film.id,
            tmdbId: parseInt(tmdbId),
            content,
            containsSpoilers
        });
        
        res.status(201).json({
            message: 'Review created successfully',
            review: Review.toJSON(review)
        });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
});

// Update a review
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content, containsSpoilers } = req.body;
        
        const review = Review.findById(parseInt(id));
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        
        // Check ownership
        if (review.user_id !== req.user.userId && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Not authorized to update this review' });
        }
        
        const updatedReview = Review.update(parseInt(id), { content, containsSpoilers });
        
        res.json({
            message: 'Review updated successfully',
            review: Review.toJSON(updatedReview)
        });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({ error: 'Failed to update review' });
    }
});

// Delete a review
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const review = Review.findById(parseInt(id));
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        
        // Check ownership
        if (review.user_id !== req.user.userId && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Not authorized to delete this review' });
        }
        
        Review.delete(parseInt(id));
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});

// Like a review
router.post('/:id/like', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const review = Review.findById(parseInt(id));
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        
        const success = Review.like(parseInt(id), req.user.userId);
        
        if (success) {
            res.json({ message: 'Review liked' });
        } else {
            res.status(409).json({ error: 'Already liked this review' });
        }
    } catch (error) {
        console.error('Like review error:', error);
        res.status(500).json({ error: 'Failed to like review' });
    }
});

// Unlike a review
router.post('/:id/unlike', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const success = Review.unlike(parseInt(id), req.user.userId);
        
        if (success) {
            res.json({ message: 'Review unliked' });
        } else {
            res.status(404).json({ error: 'Not liked this review' });
        }
    } catch (error) {
        console.error('Unlike review error:', error);
        res.status(500).json({ error: 'Failed to unlike review' });
    }
});

// Get comments for a review
router.get('/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const comments = Review.getComments(parseInt(id), parseInt(limit), parseInt(offset));
        res.json({ comments });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Failed to get comments' });
    }
});

// Add comment to a review
router.post('/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        
        if (!content || content.length < 1) {
            return res.status(400).json({ error: 'Comment content is required' });
        }
        
        const review = Review.findById(parseInt(id));
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        
        const comment = Review.addComment(parseInt(id), req.user.userId, content);
        res.status(201).json({
            message: 'Comment added successfully',
            comment
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Delete a comment
router.delete('/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const { commentId } = req.params;
        
        const comment = Review.getComment(parseInt(commentId));
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        // Check ownership
        if (comment.user_id !== req.user.userId && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }
        
        Review.deleteComment(parseInt(commentId));
        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

module.exports = router;
