const pool = require('../db');

exports.getMessages = async (req, res) => {
  const { scope, team_target, event_id } = req.query;
  const { role } = req.user;

  const isAdmin = role === 'admin' || role === 'team_lead';

  try {
    let query = `
      SELECT
        m.id,
        m.content,
        m.scope,
        m.team_target,
        m.event_id,
        m.created_at,
        u.first_name,
        u.last_name,
        u.role AS sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.created_at > now() - INTERVAL '7 days'
    `;

    const params = [];

    if (!isAdmin) {
      const userTeam = getTeamFromRole(role);
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
    console.error('getMessages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

exports.createMessage = async (req, res) => {
  const { content, scope, team_target, event_id } = req.body;
  const { id: sender_id, role } = req.user;

  if (!content || !scope) {
    return res.status(400).json({ error: 'content and scope are required' });
  }

  if (scope === 'team' && !team_target) {
    return res.status(400).json({ error: 'team_target required for team scope' });
  }

  const isAdmin = role === 'admin' || role === 'team_lead';

  if (scope === 'team' && !isAdmin) {
    const userTeam = getTeamFromRole(role);
    if (team_target !== userTeam) {
      return res.status(403).json({ error: 'Volunteers can only message their own team' });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, content, scope, team_target, event_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sender_id, content, scope, scope === 'team' ? team_target : null, event_id || null]
    );

    const inserted = result.rows[0];

    const senderResult = await pool.query(
      `SELECT first_name, last_name, role FROM users WHERE id = $1`,
      [sender_id]
    );

    const sender = senderResult.rows[0];

    const payload = {
      ...inserted,
      first_name: sender.first_name,
      last_name: sender.last_name,
      sender_role: sender.role,
    };

    req.io.emit('new_message', payload);

    res.status(201).json(payload);
  } catch (err) {
    console.error('createMessage error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.cleanupMessages = async (req, res) => {
  try {
    await pool.query('SELECT delete_old_messages()');
    res.json({ message: 'Old messages deleted' });
  } catch (err) {
    console.error('cleanupMessages error:', err);
    res.status(500).json({ error: 'Cleanup failed' });
  }
};
const getTeamFromRole = (role) => {
  const map = {
    sound_volunteer: 'sound',
    lights_volunteer: 'lights',
    media_volunteer: 'media',
    worship_volunteer: 'worship',
    sound_lead: 'sound',
    lights_lead: 'lights',
    media_lead: 'media',
    worship_lead: 'worship',
  };
  return map[role] || null;
};