const pool = require("../config/db");

// Get all events
exports.getEvents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, u.name AS created_by_name 
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       ORDER BY e.event_date ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getEvents error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Create event (admin only)
exports.createEvent = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const { title, description, event_date, location, duration_hours, priority } = req.body;
  if (!title || !event_date) {
    return res.status(400).json({ message: "Title and date are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO events (title, description, event_date, location, duration_hours, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, event_date, location, duration_hours, priority, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createEvent error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Update event (admin only)
exports.updateEvent = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const { title, description, event_date, location, duration_hours, priority } = req.body;
  try {
    const result = await pool.query(
      `UPDATE events 
       SET title=$1, description=$2, event_date=$3, location=$4, duration_hours=$5, priority=$6
       WHERE id=$7 
       RETURNING *`,
      [title, description, event_date, location, duration_hours, priority, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("updateEvent error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Delete event (admin only)
exports.deleteEvent = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  try {
    await pool.query("DELETE FROM events WHERE id=$1", [req.params.id]);
    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("deleteEvent error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

//Get current and next event for homepage
exports.getCurrentAndNext = async (req, res) => {
  try {
    const now = new Date().toISOString();

    // Current event: started but not yet ended (within 2 hours)
    const current = await pool.query(
      `SELECT * FROM events 
       WHERE event_date <= $1 
       AND event_date >= NOW() - INTERVAL '15 minutes'
       ORDER BY event_date ASC 
       LIMIT 1`,
      [now]
    );

    // Next event: upcoming
    const next = await pool.query(
      `SELECT * FROM events 
       WHERE event_date > $1
       ORDER BY event_date ASC 
       LIMIT 1`,
      [now]
    );

    res.json({
      onNow: current.rows[0] || null,
      upNext: next.rows[0] || null,
    });
  } catch (err) {
    console.error("getCurrentAndNext error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get segments for an event
exports.getSegments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM event_segments 
       WHERE event_id = $1 
       ORDER BY order_index ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getSegments error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Add segment to event (admin only)
exports.createSegment = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const { title, duration_minutes, assigned_team, notes, order_index } = req.body;
  if (!title || !duration_minutes) {
    return res.status(400).json({ message: "Title and duration are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO event_segments (event_id, title, duration_minutes, assigned_team, notes, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, title, duration_minutes, assigned_team, notes, order_index || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createSegment error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Delete segment (admin only)
exports.deleteSegment = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  try {
    await pool.query(
      "DELETE FROM event_segments WHERE id = $1",
      [req.params.segmentId]
    );
    res.json({ message: "Segment deleted" });
  } catch (err) {
    console.error("deleteSegment error:", err.message);
    res.status(500).json({ error: err.message });
  }
};