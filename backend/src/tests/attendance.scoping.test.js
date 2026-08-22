const request = require("supertest");
const jwt = require("jsonwebtoken");
const { app } = require("../app");
const pool = require("./setup");

let orgA, orgB, userA, userB, tokenA, tokenB, eventA;

beforeAll(async () => {
  const orgs = await pool.query(
  `INSERT INTO organizations (name, slug, invite_code) VALUES ($1, $2, $3), ($4, $5, $6) RETURNING id`,
  ["Att Org A", "att-org-a-" + Date.now(), "ATTCODEA" + Date.now(), "Att Org B", "att-org-b-" + Date.now(), "ATTCODEB" + Date.now()]
);
  [orgA, orgB] = orgs.rows.map(r => r.id);

  const users = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, organization_id)
     VALUES ('Admin A', 'atta@test.com', 'x', 'admin', $1),
            ('Admin B', 'attb@test.com', 'x', 'admin', $2)
     RETURNING id`,
    [orgA, orgB]
  );
  [userA, userB] = users.rows.map(r => r.id);

  tokenA = jwt.sign({ id: userA, role: "admin", organization_id: orgA, username: "attadmina" }, process.env.JWT_SECRET);
  tokenB = jwt.sign({ id: userB, role: "admin", organization_id: orgB, username: "attadminb" }, process.env.JWT_SECRET);

  const event = await pool.query(
    `INSERT INTO events (title, event_date, created_by, organization_id)
     VALUES ('Org A Service', NOW(), $1, $2) RETURNING id`,
    [userA, orgA]
  );
  eventA = event.rows[0].id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM attendance WHERE event_id = $1`, [eventA]);
  await pool.query(`DELETE FROM events WHERE organization_id IN ($1, $2)`, [orgA, orgB]);
  await pool.query(`DELETE FROM users WHERE organization_id IN ($1, $2)`, [orgA, orgB]);
  await pool.query(`DELETE FROM organizations WHERE id IN ($1, $2)`, [orgA, orgB]);
  await pool.end();
});

describe("attendance org scoping", () => {
  test("org B cannot set attendance on org A's event", async () => {
    const res = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ event_id: eventA, user_id: userB, present: true });
    expect(res.status).toBe(404);
  });

  test("org B cannot read attendance for org A's event", async () => {
    const res = await request(app)
      .get(`/api/attendance?event_id=${eventA}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  test("org A can set and read its own attendance", async () => {
    await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ event_id: eventA, user_id: userA, present: true });

    const res = await request(app)
      .get(`/api/attendance?event_id=${eventA}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.body[userA]).toBe(true);
  });
});