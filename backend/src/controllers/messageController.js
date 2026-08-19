const pool = require("../config/db");
const getTeamFromRole = require("../utils/getTeamFromRole");

exports.getMessages = async (req, res) => {
  const { scope, team_target, event_id } = req.query;
  const { role } = req.user;

  const isAdmin = role === "admin" || role === "team_lead";

  try {
    let query = `
      SELECT
        m.id,
        m.content,
        m.scope,
        m.team_target,
        m.event_id,
        m.created_at,
        u.name AS sender_name,
        u.role AS sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.created_at > now() - INTERVAL '7 days'
      AND m.organization_id = $1
    `;

    const params = [req.organization_id];
    const userTeam = getTeamFromRole(role);
    if (!isAdmin) {
      query += ` AND (m.scope = 'broadcast' OR m.team_target = $${params.length + 1})`;
      params.push(userTeam);
    }

    if (scope) {
      query += ` AND m.scope = $${params.length + 1}`;
      params.push(scope);
    }

    if (team_target) {
      query += ` AND m.team_target = $${params.length + 1}`;
      params.push(team_target);
    }

    if (event_id) {
      query += ` AND m.event_id = $${params.length + 1}`;
      params.push(event_id);
    }

    query += ` ORDER BY m.created_at ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

exports.createMessage = async (req, res) => {
  const { content, scope, team_target, event_id } = req.body;
  const { id: sender_id, role } = req.user;
  const orgId = req.organization_id;

  if (!content || !scope) {
    return res.status(400).json({ error: "content and scope are required" });
  }

  if (scope === "team" && !team_target) {
    return res
      .status(400)
      .json({ error: "team_target required for team scope" });
  }

  const isAdmin = role === "admin" || role === "team_lead";

  if (scope === "team" && !isAdmin) {
    const userTeam = getTeamFromRole(role);
    if (team_target !== userTeam) {
      return res
        .status(403)
        .json({ error: "Volunteers can only message their own team" });
    }
  }

  try {
    // If event_id provided, confirm it belongs to the sender's org
    if (event_id) {
      const eventCheck = await pool.query(
        `SELECT id FROM events WHERE id = $1 AND organization_id = $2`,
        [event_id, req.organization_id],
      );
      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: "Event not found" });
      }
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, content, scope, team_target, event_id, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        sender_id,
        content,
        scope,
        scope === "team" ? team_target : null,
        event_id || null,
        req.organization_id,
      ],
    );

    const inserted = result.rows[0];

    const senderResult = await pool.query(
      `SELECT name, role FROM users WHERE id = $1`,
      [sender_id],
    );

    const sender = senderResult.rows[0];

    const payload = {
      ...inserted,
      sender_name: sender.name,
      sender_role: sender.role,
    };

    if (scope === "broadcast") {
      req.io.to(`general:${orgId}`).emit("new_message", payload);
    } else {
      req.io.to(`team:${orgId}:${team_target}`).emit("new_message", payload);
    }

    res.status(201).json(payload);
  } catch (err) {
    console.error("createMessage error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
};

exports.cleanupMessages = async (req, res) => {
  try {
    await pool.query("SELECT delete_old_messages()");
    res.json({ message: "Old messages deleted" });
  } catch (err) {
    console.error("cleanupMessages error:", err);
    res.status(500).json({ error: "Cleanup failed" });
  }
};