const pool = require("../config/db");

exports.getMe = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [req.user.id]
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

// GET /api/users
const getUsers = async (req, res) => {
  const { role: callerRole } = req.user;

  try {
    let result;
    if (callerRole === 'admin') {
      result = await pool.query(
        'SELECT id, name, user_role FROM users ORDER BY user_role, name'
      );
    } else {
      // volunteers and team leads only see their own team
      result = await pool.query(
        'SELECT id, name, user_role FROM users WHERE user_role = $1 ORDER BY name',
        [callerRole]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// PATCH /api/users/:id/role  (admin only)
const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const validRoles = ['admin', 'team_lead', 'volunteer'];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const result = await db.query(
      'UPDATE users SET user_role = $1 WHERE id = $2 RETURNING id, name, user_role',
      [role, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

// DELETE /api/users/:id  (admin only)
const deleteUser = async (req, res) => {
  const { id } = req.params;

  // prevent self-deletion
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot remove yourself' });
  }

  try {
    const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = { getUsers, updateUserRole, deleteUser };