const pool = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const generateToken = require("../utils/generateToken");
const { ASSIGNABLE_ROLES } = require("../constants/roles");

function generateInviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// register controller — joins an existing org via invite code
exports.register = async (req, res) => {
  const { name, username, password, role, inviteCode } = req.body;
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return res.status(400).json({
      message: `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(", ")}`,
    });
  }
  try {
    const orgResult = await pool.query(
      `SELECT id FROM organizations WHERE invite_code = $1`,
      [inviteCode],
    );
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ message: "Invalid invite code" });
    }
    const organizationId = orgResult.rows[0].id;

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users(name, username, password_hash, role, status, organization_id)
            VALUES($1, $2, $3, $4, $5, $6)
            RETURNING id, name, username, role, status, organization_id`,
      [name, username, hashedPassword, role, 'pending', organizationId],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ message: "That username is already taken in this organization" });
    }
    res.status(500).json({ error: err.message });
  }
};

// registerOrganization — creates a new org and its first admin
exports.registerOrganization = async (req, res) => {
  const { orgName, name, username, password } = req.body;
  if (!orgName || !name || !username || !password) {
    return res.status(400).json({
      message: "Organization name, your name, username and password are required",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const inviteCode = generateInviteCode();
    const slug = orgName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

    const orgResult = await client.query(
      `INSERT INTO organizations (name, slug, invite_code)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [orgName, slug, inviteCode],
    );
    const organizationId = orgResult.rows[0].id;

    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (name, username, password_hash, role, status, organization_id)
       VALUES ($1, $2, $3, 'admin', 'approved', $4)
       RETURNING *`,
      [name, username, hashedPassword, organizationId],
    );

    await client.query("COMMIT");

    const token = generateToken(userResult.rows[0]);
    res.status(201).json({ success: true, token, inviteCode, organizationId });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({
        message: "That username is already taken, or an organization with that name already exists",
      });
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// login controller — username + inviteCode + password.
// Org-scoped because usernames are only unique per-org, not globally.
exports.login = async (req, res) => {
  try {
    const { username, inviteCode, password } = req.body;

    if (!username || !inviteCode) {
      return res
        .status(400)
        .json({ message: "Username and organization invite code are required" });
    }

    const orgResult = await pool.query(
      `SELECT id FROM organizations WHERE invite_code = $1`,
      [inviteCode],
    );
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ message: "Invalid invite code" });
    }
    const organizationId = orgResult.rows[0].id;

    const result = await pool.query(
      `SELECT * FROM users WHERE username = $1 AND organization_id = $2`,
      [username, organizationId],
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.status === "pending") {
      return res.status(403).json({
        message:
          "Your account is awaiting admin approval. You will be able to log in once an admin has reviewed your registration.",
      });
    }
    const token = generateToken(user);
    res.json({ success: true, token, role: user.role });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// setUsername — lets an authenticated user (typically one on the legacy
// email-login path) set their username. Reissues the JWT so the client
// gets an up-to-date token with username embedded, without a re-login.
exports.setUsername = async (req, res) => {
  const { username } = req.body;
  const userId = req.user.id;
  const organizationId = req.organization_id;

  if (!username || !/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
    return res.status(400).json({
      message: "Username must be 3-50 characters and contain only letters, numbers, dots, dashes, or underscores",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET username = $1 WHERE id = $2 AND organization_id = $3 RETURNING *`,
      [username, userId, organizationId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = generateToken(result.rows[0]);
    res.json({ success: true, token, username: result.rows[0].username });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ message: "That username is already taken in your organization" });
    }
    res.status(500).json({ error: err.message });
  }
};