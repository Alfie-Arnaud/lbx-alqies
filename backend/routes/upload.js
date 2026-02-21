const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/user');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + req.user.userId + '-' + Date.now() + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only images allowed'));
    }
});

router.post('/avatar', authenticateToken, upload.single('avatar'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const avatarUrl = '/uploads/' + req.file.filename;
        const user = User.update(req.user.userId, { avatar_url: avatarUrl });
        res.json({ message: 'Avatar updated', avatarUrl, user: User.toJSON(user) });
    } catch (error) {
        res.status(500).json({ error: 'Upload failed' });
    }
});

module.exports = router;
