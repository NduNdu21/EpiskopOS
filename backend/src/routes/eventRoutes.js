const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getCurrentAndNext,
  getSegments,
  createSegment,
  updateSegment,
  deleteSegment,
} = require("../controllers/eventController");

// All routes require login
router.use(authMiddleware);

router.get("/", getEvents);                           // all users
router.post("/", createEvent);                        // admin
router.put("/:id", updateEvent);                      // admin
router.delete("/:id", deleteEvent);                   // admin
router.get("/current", getCurrentAndNext);            // all users
router.get("/:id/segments", getSegments);             // all users
router.post("/:id/segments", createSegment);          // admin
router.put("/:id/segments/:segmentId", updateSegment);// admin
router.delete("/:id/segments/:segmentId", deleteSegment);  // admin
module.exports = router;