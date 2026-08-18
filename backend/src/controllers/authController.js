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
  const { name, email, password, role, inviteCode } = req.body;
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
      `INSERT INTO users(name, email, password_hash, role, status, organization_id)
            VALUES($1, $2, $3, $4, $5, $6)
            RETURNING id, name, email, role, status, organization_id`,
      [name, email, hashedPassword, role, 'pending', organizationId],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ message: "An account with that email already exists" });
    }
    res.status(500).json({ error: err.message });
  }
};

// registerOrganization — creates a new org and its first admin
exports.registerOrganization = async (req, res) => {
  const { orgName, name, email, password } = req.body;
  if (!orgName || !name || !email || !password) {
    return res.status(400).json({
      message: "Organization name, your name, email and password are required",
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
      `INSERT INTO users (name, email, password_hash, role, status, organization_id)
       VALUES ($1, $2, $3, 'admin', 'approved', $4)
       RETURNING *`,
      [name, email, hashedPassword, organizationId],
    );

    await client.query("COMMIT");

    const token = generateToken(userResult.rows[0]);
    res.status(201).json({ success: true, token, inviteCode, organizationId });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({
        message: "An account with that email, or an organization with that name, already exists",
      });
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// login controller — unchanged
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const user = result.rows[0];
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