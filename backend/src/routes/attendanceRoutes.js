const express = require('express');
const router = express.Router();
const { getAttendance, setAttendance } = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');
const requireUsername = require('../middleware/requireUsername');

router.get('/', authMiddleware, requireUsername, getAttendance);
router.post('/', authMiddleware, requireUsername, setAttendance);

module.exports = router;