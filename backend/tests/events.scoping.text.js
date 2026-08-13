const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app"); // your Express app, exported WITHOUT app.listen
const pool = require("./setup");

let orgA, orgB, userA, userB, tokenA, tokenB, eventA;

beforeAll(async () => {
  const orgs = await pool.query(
    `INSERT INTO organizations (name, slug) VALUES ('Org A', 'org-a'), ('Org B', 'org-b') RETURNING id`
  );
  [orgA, orgB] = orgs.rows.map(r => r.id);

  const users = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, organization_id)
     VALUES ('Admin A', 'a@test.com', 'x', 'admin', $1),
            ('Admin B', 'b@test.com', 'x', 'admin', $2)
     RETURNING id`,
    [orgA, orgB]
  );
  [userA, userB] = users.rows.map(r => r.id);

  tokenA = jwt.sign({ id: userA, role: "admin", organization_id: orgA }, process.env.JWT_SECRET);
  tokenB = jwt.sign({ id: userB, role: "admin", organization_id: orgB }, process.env.JWT_SECRET);

  const event = await pool.query(
    `INSERT INTO events (title, event_date, created_by, organization_id)
     VALUES ('Org A Service', NOW(), $1, $2) RETURNING id`,
    [userA, orgA]
  );
  eventA = event.rows[0].id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM events WHERE organization_id IN ($1, $2)`, [orgA, orgB]);
  await pool.query(`DELETE FROM users WHERE organization_id IN ($1, $2)`, [orgA, orgB]);
  await pool.query(`DELETE FROM organizations WHERE id IN ($1, $2)`, [orgA, orgB]);
  await pool.end();
});

describe("event org scoping", () => {
  test("org A cannot see org B's events", async () => {
    const res = await request(app)
      .get("/api/events")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.body.find(e => e.id === eventA)).toBeUndefined();
  });

  test("org B cannot update org A's event directly by ID", async () => {
    const res = await request(app)
      .put(`/api/events/${eventA}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ title: "Hijacked" });
    expect(res.status).toBe(404);
  });

  test("org B cannot delete org A's event by ID", async () => {
    const res = await request(app)
      .delete(`/api/events/${eventA}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  test("org A can still see its own event", async () => {
    const res = await request(app)
      .get("/api/events")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.body.find(e => e.id === eventA)).toBeDefined();
  });
});