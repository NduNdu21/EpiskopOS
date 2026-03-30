const express = require('express');
const router = express.Router();
const { getMessages, createMessage, cleanupMessages } = require('../controllers/messageController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, getMessages);
router.post('/', authenticateToken, createMessage);
router.post('/cleanup', authenticateToken, cleanupMessages);

module.exports = router;