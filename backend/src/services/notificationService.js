const pool = require("../config/db");
const webpush = require("../config/webpush");

// Admins + roles assigned anywhere in the event, or everyone if all_teams=TRUE
async function getEventSubscriptions(eventId, organizationId, { includeAdmins = true } = {}) {
  const adminClause = includeAdmins ? "u.role = 'admin' OR " : "";
  const result = await pool.query(
    `SELECT DISTINCT sub.*
     FROM push_subscriptions sub
     JOIN users u ON u.id = sub.user_id
     JOIN events e ON e.id = $1
     WHERE u.organization_id = $2
       AND e.organization_id = $2
       AND (
         ${adminClause}
         u.role IN (
           SELECT st.team FROM segment_teams st
           JOIN event_segments es ON es.id = st.segment_id
           WHERE es.event_id = $1
         )
         OR e.all_teams = TRUE
       )`,
    [eventId, organizationId]
  );
  return result.rows;
}

// Roles assigned to one specific segment, or everyone if all_teams=TRUE
async function getSegmentSubscriptions(segmentId, eventId, organizationId) {
  const result = await pool.query(
    `SELECT DISTINCT sub.*
     FROM push_subscriptions sub
     JOIN users u ON u.id = sub.user_id
     JOIN events e ON e.id = $2
     WHERE u.organization_id = $3
       AND e.organization_id = $3
       AND (
         u.role IN (SELECT st.team FROM segment_teams st WHERE st.segment_id = $1)
         OR e.all_teams = TRUE
       )`,
    [segmentId, eventId, organizationId]
  );
  return result.rows;
}

async function sendToSubscriptions(subscriptions, payload) {
  const json = JSON.stringify(payload);
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          json
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [sub.id]);
        } else {
          console.error("push send error:", err.message);
        }
      }
    })
  );
}

module.exports = { getEventSubscriptions, getSegmentSubscriptions, sendToSubscriptions };