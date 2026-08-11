const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { getEventSubscriptions, sendToSubscriptions } = require("../services/notificationService");

router.post("/send-reminders", async (req, res) => {
  if (req.headers["x-cron-secret"] !== process.env.REMINDER_CRON_SECRET) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const now = Date.now();
    const windows = [
      { field: "reminder_3day_sent", target: now + 3 * 24 * 60 * 60 * 1000, label: "3 days" },
      { field: "reminder_1day_sent", target: now + 1 * 24 * 60 * 60 * 1000, label: "1 day" },
    ];

    const counts = {};

    for (const w of windows) {
      const from = new Date(w.target - 30 * 60000);
      const to = new Date(w.target + 30 * 60000);

      const events = await pool.query(
        `SELECT * FROM events WHERE ${w.field} = FALSE AND event_date BETWEEN $1 AND $2`,
        [from, to]
      );

      for (const event of events.rows) {
        const subs = await getEventSubscriptions(event.id, { includeAdmins: false });
        await sendToSubscriptions(subs, {
          title: event.title,
          body: `Reminder: ${event.title} is in ${w.label}`,
          url: `/events/${event.id}`,
        });
        await pool.query(`UPDATE events SET ${w.field} = TRUE WHERE id = $1`, [event.id]);
      }
      counts[w.label] = events.rows.length;
    }

    res.json(counts);
  } catch (err) {
    console.error("send-reminders error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;