const request = require("supertest");
const jwt = require("jsonwebtoken");
const { app } = require("../app");
const pool = require("./setup");

let orgA, orgB, userA, userB, tokenA, tokenB, msgA;

beforeAll(async () => {
  const orgs = await pool.query(
    `INSERT INTO organizations (name, slug) VALUES ('Msg Org A', 'msg-org-a'), ('Msg Org B', 'msg-org-b') RETURNING id`
  );
  [orgA, orgB] = orgs.rows.map(r => r.id);

  const users = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, organization_id)
     VALUES ('Admin A', 'msga@test.com', 'x', 'admin', $1),
            ('Admin B', 'msgb@test.com', 'x', 'admin', $2)
     RETURNING id`,
    [orgA, orgB]
  );
  [userA, userB] = users.rows.map(r => r.id);

  tokenA = jwt.sign({ id: userA, role: "admin", organization_id: orgA }, process.env.JWT_SECRET);
  tokenB = jwt.sign({ id: userB, role: "admin", organization_id: orgB }, process.env.JWT_SECRET);

  const msg = await pool.query(
    `INSERT INTO messages (sender_id, content, scope, organization_id)
     VALUES ($1, 'Org A only', 'broadcast', $2) RETURNING id`,
    [userA, orgA]
  );
  msgA = msg.rows[0].id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM messages WHERE organization_id IN ($1, $2)`, [orgA, orgB]);
  await pool.query(`DELETE FROM users WHERE organization_id IN ($1, $2)`, [orgA, orgB]);
  await pool.query(`DELETE FROM organizations WHERE id IN ($1, $2)`, [orgA, orgB]);
  await pool.end();
});

describe("message org scoping", () => {
  test("org B cannot see org A's messages", async () => {
    const res = await request(app)
      .get("/api/messages")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.body.find(m => m.id === msgA)).toBeUndefined();
  });

  test("org A can see its own message", async () => {
    const res = await request(app)
      .get("/api/messages")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.body.find(m => m.id === msgA)).toBeDefined();
  });

  test("createMessage sets sender's own org, not a spoofed one", async () => {
    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ content: "test", scope: "broadcast" });
    expect(res.body.organization_id).toBe(orgB);
  });
});