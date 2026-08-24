const jwt = require("jsonwebtoken");

// Single source of truth for test tokens. Every claim requireUsername (or any
// future auth-gating middleware) checks MUST be included here with a sensible
// default, so new middleware additions don't silently 403 every existing
// scoping test the way requireUsername did when it landed.
//
// Usage:
//   const { makeTestToken } = require("./testAuth");
//   const tokenA = makeTestToken({ id: userA, organization_id: orgA });
//   const tokenB = makeTestToken({ id: userB, organization_id: orgB, role: "sound", username: "soundvol" });
function makeTestToken(overrides = {}) {
  const payload = {
    id: overrides.id,
    role: overrides.role || "admin",
    organization_id: overrides.organization_id,
    username: overrides.username || `testuser${Math.floor(Math.random() * 1e9)}`,
  };

  if (!payload.id || !payload.organization_id) {
    throw new Error("makeTestToken requires at least { id, organization_id }");
  }

  return jwt.sign(payload, process.env.JWT_SECRET);
}

module.exports = { makeTestToken };