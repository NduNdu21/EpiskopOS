const express = require('express');
const router = express.Router();
const { getMessages, createMessage, cleanupMessages } = require('../controllers/messageController');
const authenticateToken = require('../middleware/authMiddleware');
const requireUsername = require('../middleware/requireUsername');

router.get('/', authenticateToken, requireUsername, getMessages);
router.post('/', authenticateToken, requireUsername, createMessage);
router.post('/cleanup', authenticateToken, requireUsername, cleanupMessages);

module.exports = router;