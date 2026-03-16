const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  assignVolunteer,
  getMyEvents,
  getCurrentAndNext,
} = require("../controllers/eventController");

// All routes require login
router.use(authMiddleware);

router.get("/", getEvents);                           // all users
router.get("/my", getMyEvents);                       // volunteers
router.post("/", createEvent);                        // admin
router.put("/:id", updateEvent);                      // admin
router.delete("/:id", deleteEvent);                   // admin
router.post("/:id/assign", assignVolunteer);          // admin
router.get("/current", getCurrentAndNext);            // all users
module.exports = router;