const express = require("express");
const router = express.Router();
const { login, register, registerOrganization, setUsername } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/login", (req, res, next) => {
  const { username, inviteCode, password } = req.body;
  if (!username || !inviteCode || !password) {
    return res.status(400).json({
      message: "Username, organization invite code, and password are required",
    });
  }
  next();
}, login);

router.post("/register", (req, res, next) => {
  const { name, username, password, role, inviteCode } = req.body;
  if (!name || !username || !password || !inviteCode) {
    return res.status(400).json({ message: "Name, username, password and invite code required" });
  }
  next();
}, register);

router.post("/register/organization", (req, res, next) => {
  const { orgName, name, username, password } = req.body;
  if (!orgName || !name || !username || !password) {
    return res.status(400).json({ message: "Organization name, your name, username and password required" });
  }
  next();
}, registerOrganization);

// Lets an authenticated user (legacy email-login users without a username
// yet) set one. Deliberately NOT behind requireUsername — this is how
// users escape that block.
router.patch("/username", authMiddleware, (req, res, next) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ message: "Username required" });
  }
  next();
}, setUsername);

module.exports = router;