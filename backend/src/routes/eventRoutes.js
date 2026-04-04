const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getCurrentAndNext,
  getSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  addSegmentTeam,
  removeSegmentTeam,
  goLive,
  nextSegment,
  prevSegment,
  endService,
  getLiveEvent,
} = require("../controllers/eventController");

// All routes require login
router.use(authMiddleware);

//Live service routes must be before /:id routes
router.get("/live", getLiveEvent);
router.get("/current", getCurrentAndNext);

//Main event routes
router.get("/", getEvents);                           // all users
router.get("/", getMyEvents);                         // volunteers
router.post("/", createEvent);                        // admin
router.put("/:id", updateEvent);                      // admin
router.delete("/:id", deleteEvent);                   // admin

//Event segment routes
router.get("/:id/segments", getSegments);             // all users
router.post("/:id/segments", createSegment);          // admin
router.put("/:id/segments/:segmentId", updateSegment);// admin
router.delete("/:id/segments/:segmentId", deleteSegment);  // admin

// Segment team routes
router.post("/:id/segments/:segmentId/teams", addSegmentTeam);    //admin
router.delete("/:id/segments/:segmentId/teams/:team", removeSegmentTeam);    //admin

// Live service routes
router.post("/:id/golive", goLive);
router.post("/:id/next", nextSegment);
router.post("/:id/prev", prevSegment);
router.post("/:id/end", endService);
module.exports = router;