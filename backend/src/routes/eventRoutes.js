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
  goLive,
  nextSegment,
  prevSegment,
  endService,
  getLiveEvent,
} = require("../controllers/eventController");

// All routes require login
router.use(authMiddleware);

//Main event routes
router.get("/", getEvents);                           // all users
router.post("/", createEvent);                        // admin
router.put("/:id", updateEvent);                      // admin
router.delete("/:id", deleteEvent);                   // admin

//Home page display route
router.get("/current", getCurrentAndNext);            // all users

//Event segment routes
router.get("/:id/segments", getSegments);             // all users
router.post("/:id/segments", createSegment);          // admin
router.put("/:id/segments/:segmentId", updateSegment);// admin
router.delete("/:id/segments/:segmentId", deleteSegment);  // admin

// Live service routes
router.get("/live", getLiveEvent);
router.post("/:id/golive", goLive);
router.post("/:id/next", nextSegment);
router.post("/:id/prev", prevSegment);
router.post("/:id/end", endService);
module.exports = router;