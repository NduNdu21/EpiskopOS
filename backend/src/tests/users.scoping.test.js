const request = require("supertest");
const { app } = require("../app");
const pool = require("./setup");
const { makeTestToken } = require("./testAuth");

let orgA, orgB;
let adminA, adminB, volunteerA, pendingA;
let tokenAdminA, tokenAdminB, tokenVolunteerA;

beforeAll(async () => {
  const suffix = Date.now();
  const orgs = await pool.query(
    `INSERT INTO organizations (name, slug, invite_code) VALUES ($1, $2, $3), ($4, $5, $6) RETURNING id`,
    [
      "Users Org A", "users-org-a-" + suffix, "USERSCODEA" + suffix,
      "Users Org B", "users-org-b-" + suffix, "USERSCODEB" + suffix,
    ],
  );
  [orgA, orgB] = orgs.rows.map((r) => r.id);

  const users = await pool.query(
    `INSERT INTO users (name, password_hash, role, organization_id, username, status)
     VALUES
       ('Admin A', 'x', 'admin', $5, 'usersadmina' || $6, 'approved'),
       ('Volunteer A', 'x', 'sound', $5, 'usersvola' || $6, 'approved'),
       ('Pending A', 'x', 'sound', $5, 'userspenda' || $6, 'pending'),
       ('Admin B', 'x', 'admin', $7, 'usersadminb' || $6, 'approved')
     RETURNING id, role`,
    [
      "usersadmina-" + suffix + "@test.com",
      "usersvola-" + suffix + "@test.com",
      "userspenda-" + suffix + "@test.com",
      "usersadminb-" + suffix + "@test.com",
      orgA,
      suffix,
      orgB,
    ],
  );

  adminA = users.rows[0].id;
  volunteerA = users.rows[1].id;
  pendingA = users.rows[2].id;
  adminB = users.rows[3].id;

  tokenAdminA = makeTestToken({ id: adminA, organization_id: orgA, role: "admin" });
  tokenAdminB = makeTestToken({ id: adminB, organization_id: orgB, role: "admin" });
  tokenVolunteerA = makeTestToken({ id: volunteerA, organization_id: orgA, role: "sound" });
});

afterAll(async () => {
  await pool.query(`DELETE FROM users WHERE organization_id IN ($1, $2)`, [orgA, orgB]);
  await pool.query(`DELETE FROM organizations WHERE id IN ($1, $2)`, [orgA, orgB]);
  await pool.end();
});

describe("user org scoping", () => {
  test("org B cannot see org A's users in the members list", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${tokenAdminB}`);
    expect(res.body.find((u) => u.id === adminA)).toBeUndefined();
    expect(res.body.find((u) => u.id === volunteerA)).toBeUndefined();
  });

  test("org A admin can see org A's own users in the members list", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${tokenAdminA}`);
    expect(res.body.find((u) => u.id === adminA)).toBeDefined();
    expect(res.body.find((u) => u.id === volunteerA)).toBeDefined();
  });

  test("org B admin cannot change org A user's role by ID", async () => {
    const res = await request(app)
      .patch(`/api/users/${volunteerA}/role`)
      .set("Authorization", `Bearer ${tokenAdminB}`)
      .send({ role: "lighting" });
    expect(res.status).toBe(404);
  });

  test("org B admin cannot approve org A's pending user by ID", async () => {
    const res = await request(app)
      .patch(`/api/users/${pendingA}/approve`)
      .set("Authorization", `Bearer ${tokenAdminB}`);
    expect(res.status).toBe(404);
  });

  test("org B admin cannot delete org A's user by ID", async () => {
    const res = await request(app)
      .delete(`/api/users/${volunteerA}`)
      .set("Authorization", `Bearer ${tokenAdminB}`);
    expect(res.status).toBe(404);
  });
});

describe("user role-based authorization", () => {
  test("a non-admin cannot change another user's role", async () => {
    const res = await request(app)
      .patch(`/api/users/${adminA}/role`)
      .set("Authorization", `Bearer ${tokenVolunteerA}`)
      .send({ role: "lighting" });
    expect(res.status).toBe(403);
  });

  test("a non-admin cannot approve a pending user", async () => {
    const res = await request(app)
      .patch(`/api/users/${pendingA}/approve`)
      .set("Authorization", `Bearer ${tokenVolunteerA}`);
    expect(res.status).toBe(403);
  });

  test("a non-admin cannot delete another user", async () => {
    const res = await request(app)
      .delete(`/api/users/${adminA}`)
      .set("Authorization", `Bearer ${tokenVolunteerA}`);
    expect(res.status).toBe(403);
  });
});

describe("same-org actions still work correctly", () => {
  test("org A admin can approve org A's own pending user", async () => {
    const res = await request(app)
      .patch(`/api/users/${pendingA}/approve`)
      .set("Authorization", `Bearer ${tokenAdminA}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
  });

  test("org A admin can change org A's own user's role", async () => {
    const res = await request(app)
      .patch(`/api/users/${volunteerA}/role`)
      .set("Authorization", `Bearer ${tokenAdminA}`)
      .send({ role: "lighting" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("lighting");
  });
});