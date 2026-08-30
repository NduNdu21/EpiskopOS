const pool = require("../config/db");
const { getEventSubscriptions, getSegmentSubscriptions, sendToSubscriptions } = require("../services/notificationService");

// Get all events
exports.getEvents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, u.name AS created_by_name 
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.organization_id = $1
       ORDER BY e.event_date ASC`,
      [req.organization_id],
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
  const { title, description, event_date, location, duration_hours, priority } =
    req.body;
  if (!title || !event_date) {
    return res.status(400).json({ message: "Title and date are required" });
  }
  try {
    // Check for duplicate event at same date and time, scoped to this org
    const duplicate = await pool.query(
      `SELECT id FROM events WHERE event_date = $1 AND organization_id = $2`,
      [event_date, req.organization_id],
    );
    if (duplicate.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "An event already exists at this date and time." });
    }

    const result = await pool.query(
      `INSERT INTO events (title, description, event_date, location, duration_hours, priority, created_by, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title,
        description,
        event_date,
        location,
        duration_hours,
        priority,
        req.user.id,
        req.organization_id,
      ],
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
  const { title, description, event_date, location, duration_hours, priority } =
    req.body;
  try {
    const result = await pool.query(
      `UPDATE events 
       SET title=$1, description=$2, event_date=$3, location=$4, duration_hours=$5, priority=$6
       WHERE id=$7 AND organization_id=$8
       RETURNING *`,
      [
        title,
        description,
        event_date,
        location,
        duration_hours,
        priority,
        req.params.id,
        req.organization_id,
      ],
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
    const result = await pool.query(
      "DELETE FROM events WHERE id=$1 AND organization_id=$2 RETURNING id",
      [req.params.id, req.organization_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("deleteEvent error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get current and next event for homepage
exports.getCurrentAndNext = async (req, res) => {
  try {
    const now = new Date().toISOString();

    const current = await pool.query(
      `SELECT * FROM events 
       WHERE event_date <= $1 
       AND event_date >= NOW() - INTERVAL '15 minutes'
       AND organization_id = $2
       ORDER BY event_date ASC 
       LIMIT 1`,
      [now, req.organization_id],
    );

    const next = await pool.query(
      `SELECT * FROM events 
       WHERE event_date > $1 AND organization_id = $2
       ORDER BY event_date ASC 
       LIMIT 1`,
      [now, req.organization_id],
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
      `SELECT es.*, 
        COALESCE(
          array_agg(st.team) FILTER (WHERE st.team IS NOT NULL), 
          '{}'
        ) AS teams
       FROM event_segments es
       JOIN events e ON es.event_id = e.id
       LEFT JOIN segment_teams st ON es.id = st.segment_id
       WHERE es.event_id = $1 AND e.organization_id = $2
       GROUP BY es.id
       ORDER BY es.order_index ASC`,
      [req.params.id, req.organization_id],
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
  const { title, duration_minutes, notes, order_index, teams, type } = req.body;
  if (!title || !duration_minutes) {
    return res.status(400).json({ message: "Title and duration are required" });
  }
  try {
    // Verify the parent event belongs to this org before inserting
    const eventCheck = await pool.query(
      `SELECT id FROM events WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.organization_id],
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const result = await pool.query(
      `INSERT INTO event_segments (event_id, title, duration_minutes, notes, order_index, type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, title, duration_minutes, notes, order_index || 0, type || null],
    );

    const segment = result.rows[0];

    if (teams && teams.length > 0) {
      for (const team of teams) {
        await pool.query(
          `INSERT INTO segment_teams (segment_id, team) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [segment.id, team],
        );
      }
    }

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
      [segment.id],
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
  const { title, duration_minutes, notes, order_index, type } = req.body;
  try {
    const result = await pool.query(
      `UPDATE event_segments es
       SET title=$1, duration_minutes=$2, notes=$3, order_index=$4, type=$5
       FROM events e
       WHERE es.id=$6 AND es.event_id=$7
       AND es.event_id = e.id AND e.organization_id = $8
       RETURNING es.*`,
      [
        title,
        duration_minutes,
        notes,
        order_index,
        type || null,
        req.params.segmentId,
        req.params.id,
        req.organization_id,
      ],
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
    const result = await pool.query(
      `DELETE FROM event_segments es
       USING events e
       WHERE es.id = $1
       AND es.event_id = e.id AND e.organization_id = $2
       RETURNING es.id`,
      [req.params.segmentId, req.organization_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Segment not found" });
    }
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
    // Verify segment belongs to an event in this org
    const check = await pool.query(
      `SELECT es.id FROM event_segments es
       JOIN events e ON es.event_id = e.id
       WHERE es.id = $1 AND e.organization_id = $2`,
      [req.params.segmentId, req.organization_id],
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: "Segment not found" });
    }

    await pool.query(
      `INSERT INTO segment_teams (segment_id, team) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.params.segmentId, team],
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
    const result = await pool.query(
      `DELETE FROM segment_teams st
       USING event_segments es, events e
       WHERE st.segment_id = $1 AND st.team = $2
       AND st.segment_id = es.id AND es.event_id = e.id
       AND e.organization_id = $3
       RETURNING st.id`,
      [req.params.segmentId, req.params.team, req.organization_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Team assignment not found" });
    }
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
       SET is_live = TRUE, started_at = NOW(), current_segment_index = 0, segment_started_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [req.params.id, req.organization_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const event = result.rows[0];

    const io = req.app.get("io");
    io.to(req.params.id).emit("service_update", { type: "GO_LIVE", event });
    io.to(`general:${event.organization_id}`).emit("service_update", { type: "GO_LIVE", event });

    const subs = await getEventSubscriptions(event.id, req.organization_id, { includeAdmins: true });
    await sendToSubscriptions(subs, {
      title: event.title,
      body: "This event just went live",
      url: `/events/${event.id}/live`,
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
      `UPDATE events e
       SET current_segment_index = LEAST(
             e.current_segment_index + 1,
             (SELECT COUNT(*) - 1 FROM event_segments WHERE event_id = e.id)
           ),
           segment_started_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [req.params.id, req.organization_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const event = result.rows[0];

    const io = req.app.get("io");
    io.to(req.params.id).emit("service_update", {
      type: "NEXT_SEGMENT",
      event,
    });

    const segResult = await pool.query(
      `SELECT id, title FROM event_segments WHERE event_id = $1 ORDER BY order_index ASC OFFSET $2 LIMIT 1`,
      [req.params.id, event.current_segment_index],
    );
    const segment = segResult.rows[0];
    if (segment) {
      const subs = await getSegmentSubscriptions(segment.id, event.id, req.organization_id);
      await sendToSubscriptions(subs, {
        title: event.title,
        body: `Now on: ${segment.title}`,
        url: `/events/${event.id}/live`,
      });
    }

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
       SET current_segment_index = GREATEST(current_segment_index - 1, 0),
           segment_started_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [req.params.id, req.organization_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const event = result.rows[0];

    const io = req.app.get("io");
    io.to(req.params.id).emit("service_update", {
      type: "PREV_SEGMENT",
      event,
    });

    const segResult = await pool.query(
      `SELECT id, title FROM event_segments WHERE event_id = $1 ORDER BY order_index ASC OFFSET $2 LIMIT 1`,
      [req.params.id, event.current_segment_index],
    );
    const segment = segResult.rows[0];
    if (segment) {
      const subs = await getSegmentSubscriptions(segment.id, event.id, req.organization_id);
      await sendToSubscriptions(subs, {
        title: event.title,
        body: `Now on: ${segment.title}`,
        url: `/events/${event.id}/live`,
      });
    }

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
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [req.params.id, req.organization_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const event = result.rows[0];

    const io = req.app.get("io");
    io.to(req.params.id).emit("service_update", { type: "END_SERVICE", event });
    io.to(`general:${event.organization_id}`).emit("service_update", { type: "END_SERVICE", event });

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
       WHERE is_live = TRUE AND organization_id = $1
       ORDER BY started_at DESC
       LIMIT 1`,
      [req.organization_id],
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error("getLiveEvent error:", err.message);
    res.status(500).json({ error: err.message });
  }
};