const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, organization_id: user.organization_id, username: user.username || null },
    process.env.JWT_SECRET,
    { expiresIn: "1h", algorithm: "HS256"}
  );
};

module.exports = generateToken;