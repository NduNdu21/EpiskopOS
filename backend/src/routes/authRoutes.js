const express = require("express");
const router = express.Router();
const { login, register } = require("../controllers/authController");

//login router
router.post("/login", (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  next();
}, login);

//register router
router.post("/register", (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password required"});
  }
  
  next();
}, register);

module.exports = router;
