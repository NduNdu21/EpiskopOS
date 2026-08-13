const pool = require("../config/db");
const bcrypt = require("bcrypt");
const { ALL_ROLES } = require("../constants/roles");

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, status, organization_id FROM users WHERE id = $1",
      [req.user.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("getMe error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

const getUsers = async (req, res) => {
  const { role: callerRole } = req.user;
  try {
    let result;
    if (callerRole === "admin") {
      result = await pool.query(
        "SELECT id, name, role, status FROM users ORDER BY status DESC, role, name",
      );
    } else {
      result = await pool.query(
        "SELECT id, name, role FROM users WHERE role = $1 AND status = $2 ORDER BY name",
        [callerRole, "approved"],
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!ALL_ROLES.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  try {
    const result = await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, role",
      [role, id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update role" });
  }
};

const approveUser = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE users SET status = 'approved' WHERE id = $1 RETURNING id, name, role, status",
      [id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve user" });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: "You cannot remove yourself" });
  }
  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "User not found" });
    res.json({ message: "User removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Current and new password are required" });
  }
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: "New password must be at least 8 characters" });
  }
  try {
    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [req.user.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const match = await bcrypt.compare(
      currentPassword,
      result.rows[0].password_hash,
    );
    if (!match) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      newHash,
      req.user.id,
    ]);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("updatePassword error:", err.message);
    res.status(500).json({ error: "Failed to update password" });
  }
};

const updateProfile = async (req, res) => {
  const name = req.body.name?.trim();
  const email = req.body.email?.trim();
  if (!name && !email) {
    return res.status(400).json({ error: "Nothing to update" });
  }
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    if (name) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (email) {
      fields.push(`email = $${idx++}`);
      values.push(email);
    }
    values.push(req.user.id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, name, email, role`,
      values,
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already in use" });
    }
    console.error("updateProfile error:", err.message);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

module.exports = {
  getMe,
  getUsers,
  updateUserRole,
  approveUser,
  deleteUser,
  updatePassword,
  updateProfile,
};
