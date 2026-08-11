const pool = require("../config/db");

exports.subscribe = async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: "Invalid subscription" });
  }
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4`,
      [req.user.id, endpoint, keys.p256dh, keys.auth]
    );
    res.status(201).json({ message: "Subscribed" });
  } catch (err) {
    console.error("subscribe error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.unsubscribe = async (req, res) => {
  const { endpoint } = req.body;
  try {
    await pool.query(
      `DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`,
      [endpoint, req.user.id]
    );
    res.json({ message: "Unsubscribed" });
  } catch (err) {
    console.error("unsubscribe error:", err.message);
    res.status(500).json({ error: err.message });
  }
};