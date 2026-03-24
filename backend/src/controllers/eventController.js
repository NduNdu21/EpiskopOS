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

//Events display for volunteers
exports.getMyEvents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT e.* FROM events e
       JOIN event_segments es ON e.id = es.event_id
       JOIN segment_teams st ON es.id = st.segment_id
       WHERE e.all_teams = TRUE
       OR st.team = $1
       ORDER BY e.event_date ASC`,
      [req.user.role]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getMyEvents error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get segments for an event
exports.getSegments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT es.*, 
        COALESCE(
          array_agg(st.team) FILTER (WHERE st.team IS NOT NULL), 
          '{}'
        ) AS teams
       FROM event_segments es
       LEFT JOIN segment_teams st ON es.id = st.segment_id
       WHERE es.event_id = $1
       GROUP BY es.id
       ORDER BY es.order_index ASC`,
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
  const { title, duration_minutes, notes, order_index, teams } = req.body;
  if (!title || !duration_minutes) {
    return res.status(400).json({ message: "Title and duration are required" });
  }
  try {
    // Insert segment
    const result = await pool.query(
      `INSERT INTO event_segments (event_id, title, duration_minutes, notes, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.id, title, duration_minutes, notes, order_index || 0]
    );

    const segment = result.rows[0];

    // Insert teams if provided
    if (teams && teams.length > 0) {
      for (const team of teams) {
        await pool.query(
          `INSERT INTO segment_teams (segment_id, team) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [segment.id, team]
        );
      }
    }

    // Return segment with teams
    const full = await pool.query(
      `SELECT es.*,
        COALESCE(
          array_agg(st.team) FILTER (WHERE st.team IS NOT NULL),
          '{}'
        ) AS teams
       FROM event_segments es
       LEFT JOIN segment_teams st ON es.id = st.segment_id
       WHERE es.id = $1
       GROUP BY es.id`,
      [segment.id]
    );

    res.status(201).json(full.rows[0]);
  } catch (err) {
    console.error("createSegment error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Edit segment (admin only)
exports.updateSegment = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const { title, duration_minutes, notes, order_index } = req.body;
  try {
    const result = await pool.query(
      `UPDATE event_segments 
       SET title=$1, duration_minutes=$2, notes=$3, order_index=$4
       WHERE id=$5 AND event_id=$6
       RETURNING *`,
      [title, duration_minutes, notes, order_index, req.params.segmentId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Segment not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("updateSegment error:", err.message);
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

// Add team to segment (admin only)
exports.addSegmentTeam = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const { team } = req.body;
  if (!team) {
    return res.status(400).json({ message: "Team is required" });
  }
  try {
    await pool.query(
      `INSERT INTO segment_teams (segment_id, team) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.params.segmentId, team]
    );
    res.json({ message: "Team added" });
  } catch (err) {
    console.error("addSegmentTeam error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Remove team from segment (admin only)
exports.removeSegmentTeam = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  try {
    await pool.query(
      `DELETE FROM segment_teams 
       WHERE segment_id = $1 AND team = $2`,
      [req.params.segmentId, req.params.team]
    );
    res.json({ message: "Team removed" });
  } catch (err) {
    console.error("removeSegmentTeam error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Go live
exports.goLive = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  try {
    const result = await pool.query(
      `UPDATE events 
       SET is_live = TRUE, started_at = NOW(), current_segment_index = 0
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    const event = result.rows[0];

    // Notify all clients in this service room
    const io = req.app.get("io");
    io.to(req.params.id).emit("service_update", {
      type: "GO_LIVE",
      event,
    });

    res.json(event);
  } catch (err) {
    console.error("goLive error:", err.message);
    res.status(500).json({ error: err.message });
  }
}; 

// Next segment
exports.nextSegment = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  try {
    const result = await pool.query(
      `UPDATE events 
       SET current_segment_index = current_segment_index + 1
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    const event = result.rows[0];

    const io = req.app.get("io");
    io.to(req.params.id).emit("service_update", {
      type: "NEXT_SEGMENT",
      event,
    });

    res.json(event);
  } catch (err) {
    console.error("nextSegment error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Previous segment
exports.prevSegment = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  try {
    const result = await pool.query(
      `UPDATE events
       SET current_segment_index = GREATEST(current_segment_index - 1, 0)
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    const event = result.rows[0];

    const io = req.app.get("io");
    io.to(req.params.id).emit("service_update", {
      type: "PREV_SEGMENT",
      event,
    });

    res.json(event);
  } catch (err) {
    console.error("prevSegment error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// End service
exports.endService = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  try {
    const result = await pool.query(
      `UPDATE events 
       SET is_live = FALSE, started_at = NULL, current_segment_index = 0
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    const event = result.rows[0];

    const io = req.app.get("io");
    io.to(req.params.id).emit("service_update", {
      type: "END_SERVICE",
      event,
    });

    res.json(event);
  } catch (err) {
    console.error("endService error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get live event for today
exports.getLiveEvent = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM events 
       WHERE is_live = TRUE 
       AND DATE(event_date) = CURRENT_DATE
       LIMIT 1`
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error("getLiveEvent error:", err.message);
    res.status(500).json({ error: err.message });
  }
};