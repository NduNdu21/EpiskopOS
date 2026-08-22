const express = require("express");
const router = express.Router();
const { login, register, registerOrganization, setUsername } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/login", (req, res, next) => {
  const { email, username, inviteCode, password } = req.body;
  if (!password || (!email && !(username && inviteCode))) {
    return res.status(400).json({
      message: "Password, and either email or (username and invite code), are required",
    });
  }
  next();
}, login);

router.post("/register", (req, res, next) => {
  const { name, email, username, password, role, inviteCode } = req.body;
  if (!name || !email || !username || !password || !inviteCode) {
    return res.status(400).json({ message: "Name, email, username, password and invite code required" });
  }
  next();
}, register);

router.post("/register/organization", (req, res, next) => {
  const { orgName, name, email, username, password } = req.body;
  if (!orgName || !name || !email || !username || !password) {
    return res.status(400).json({ message: "Organization name, your name, email, username and password required" });
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