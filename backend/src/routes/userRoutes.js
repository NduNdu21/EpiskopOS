const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getMe, getUsers, updateUserRole, approveUser, deleteUser, updatePassword, updateProfile } = require("../controllers/userController");


router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateProfile);
router.get("/", authMiddleware, getUsers);
router.patch("/me/password", authMiddleware, updatePassword);
router.patch("/:id/role", authMiddleware, updateUserRole);
router.patch("/:id/approve", authMiddleware, approveUser);
router.delete("/:id", authMiddleware, deleteUser);

module.exports = router;