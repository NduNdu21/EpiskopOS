const express = require("express");
const router = express.Router();
const { login, register, registerOrganization } = require("../controllers/authController");

router.post("/login", (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }
  next();
}, login);

router.post("/register", (req, res, next) => {
  const { name, email, password, role, inviteCode } = req.body;
  if (!name || !email || !password || !inviteCode) {
    return res.status(400).json({ message: "Name, email, password and invite code required" });
  }
  next();
}, register);

router.post("/register/organization", (req, res, next) => {
  const { orgName, name, email, password } = req.body;
  if (!orgName || !name || !email || !password) {
    return res.status(400).json({ message: "Organization name, your name, email and password required" });
  }
  next();
}, registerOrganization);

module.exports = router;