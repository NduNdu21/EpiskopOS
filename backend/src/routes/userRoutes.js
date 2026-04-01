const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getMe, getUsers, updateUserRole, deleteUser } = require("../controllers/userController");

const userCtrl = require('../controllers/userController');
console.log('userCtrl exports:', userCtrl);

router.get("/me", authMiddleware, getMe);
router.get("/", authMiddleware, getUsers);
router.patch("/:id/role", authMiddleware, updateUserRole);
router.delete("/:id", authMiddleware, deleteUser);

module.exports = router;