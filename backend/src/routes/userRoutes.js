const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getMe, getUsers, updateUserRole, deleteUser } = require("../controllers/userController");

router.get("/me", authMiddleware, getMe);
router.get("/", authMiddleware, getUsers);
router.patch("/:id/role", authMiddleware, updateUserRole);
router.delete("/:id", authMiddleware, deleteUser);

module.exports = router;