const express = require('express');
const router = express.Router();
const { getAttendance, setAttendance } = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, getAttendance);
router.post('/', authMiddleware, setAttendance);

module.exports = router;