const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { subscribe, unsubscribe } = require("../controllers/pushController");

router.use(authMiddleware);
router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

module.exports = router;