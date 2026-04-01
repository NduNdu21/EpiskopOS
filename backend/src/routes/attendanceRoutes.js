const express = require('express');
const router = express.Router();
const { getAttendance, setAttendance } = require('../controllers/attendanceController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, getAttendance);
router.post('/', authenticate, requireRole('admin'), setAttendance);

module.exports = router;