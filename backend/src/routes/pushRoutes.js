const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const requireUsername = require("../middleware/requireUsername");
const { subscribe, unsubscribe } = require("../controllers/pushController");

router.use(authMiddleware);
router.use(requireUsername);
router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

module.exports = router;