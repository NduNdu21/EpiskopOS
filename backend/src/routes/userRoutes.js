const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const requireUsername = require("../middleware/requireUsername");
const { getMe, getUsers, updateUserRole, approveUser, deleteUser, updatePassword, updateProfile } = require("../controllers/userController");


router.get("/me", authMiddleware, requireUsername, getMe);
router.patch("/me", authMiddleware, requireUsername, updateProfile);
router.get("/", authMiddleware, requireUsername, getUsers);
router.patch("/me/password", authMiddleware, requireUsername, updatePassword);
router.patch("/:id/role", authMiddleware, requireUsername, updateUserRole);
router.patch("/:id/approve", authMiddleware, requireUsername, approveUser);
router.delete("/:id", authMiddleware, requireUsername, deleteUser);

module.exports = router;