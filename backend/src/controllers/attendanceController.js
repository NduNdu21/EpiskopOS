const db = require('../config/db');

// GET /api/attendance?event_id=
const getAttendance = async (req, res) => {
  const { event_id } = req.query;
  if (!event_id) return res.status(400).json({ error: 'event_id required' });

  try {
    const result = await db.query(
      'SELECT user_id, present FROM attendance WHERE event_id = $1',
      [event_id]
    );
    // return as a map { user_id: present }
    const map = {};
    result.rows.forEach(r => { map[r.user_id] = r.present; });
    res.json(map);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// POST /api/attendance  (admin only)
const setAttendance = async (req, res) => {
  const { event_id, user_id, present } = req.body;
  if (!event_id || !user_id || present === undefined) {
    return res.status(400).json({ error: 'event_id, user_id, present required' });
  }

  try {
    await db.query(
      `INSERT INTO attendance (event_id, user_id, present)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id) DO UPDATE SET present = EXCLUDED.present`,
      [event_id, user_id, present]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to set attendance' });
  }
};

module.exports = { getAttendance, setAttendance };