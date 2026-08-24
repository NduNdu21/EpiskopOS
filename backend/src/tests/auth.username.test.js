const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { app } = require("../app");
const pool = require("./setup");

let orgA, orgB, inviteCodeA, inviteCodeB;
let userAId, userAUsername, userAPassword;
let pendingBUsername, pendingBPassword;

const PASSWORD = "correct-horse-battery-staple";

beforeAll(async () => {
  const suffix = Date.now();
  inviteCodeA = "AUTHCODEA" + suffix;
  inviteCodeB = "AUTHCODEB" + suffix;

  const orgs = await pool.query(
    `INSERT INTO organizations (name, slug, invite_code) VALUES ($1, $2, $3), ($4, $5, $6) RETURNING id`,
    [
      "Test Org AuthA", "test-org-autha-" + suffix, inviteCodeA,
      "Test Org AuthB", "test-org-authb-" + suffix, inviteCodeB,
    ],
  );
  [orgA, orgB] = orgs.rows.map((r) => r.id);

  const hash = await bcrypt.hash(PASSWORD, 10);

  userAUsername = "usera" + suffix;
  userAPassword = PASSWORD;

  // Same username string, deliberately reused in org B — proves login
  // resolves per-org via invite code, not globally.
  pendingBUsername = "usera" + suffix;
  pendingBPassword = PASSWORD;

  const users = await pool.query(
    `INSERT INTO users (name, password_hash, role, organization_id, username, status)
     VALUES
       ('User A', $1, 'admin', $2, $3, 'approved'),
       ('Pending B', $1, 'admin', $4, $5, 'pending')
     RETURNING id`,
    [hash, orgA, userAUsername, orgB, pendingBUsername],
  );
  userAId = users.rows[0].id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM users WHERE organization_id IN ($1, $2)`, [orgA, orgB]);
  await pool.query(`DELETE FROM organizations WHERE id IN ($1, $2)`, [orgA, orgB]);
  await pool.end();
});

describe("username + invite code login", () => {
  test("logs in successfully with correct username + invite code + password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: userAUsername, inviteCode: inviteCodeA, password: userAPassword });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test("same username in a different org resolves via that org's invite code, not the wrong one", async () => {
    // pendingBUsername === userAUsername, but lives in org B and is pending.
    // Logging in with org B's invite code must resolve to the org B user
    // (blocked for pending status), never silently succeed as org A's user.
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: pendingBUsername, inviteCode: inviteCodeB, password: pendingBPassword });
    expect(res.status).toBe(403);
  });

  test("username that doesn't exist in that org returns invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "no-such-user-anywhere", inviteCode: inviteCodeA, password: PASSWORD });
    expect(res.status).toBe(401);
  });

  test("missing invite code is rejected with 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: userAUsername, password: userAPassword });
    expect(res.status).toBe(400);
  });

  test("missing username is rejected with 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ inviteCode: inviteCodeA, password: userAPassword });
    expect(res.status).toBe(400);
  });

  test("invalid invite code returns 404", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: userAUsername, inviteCode: "NOT-A-REAL-CODE", password: userAPassword });
    expect(res.status).toBe(404);
  });

  test("wrong password returns 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: userAUsername, inviteCode: inviteCodeA, password: "wrong-password" });
    expect(res.status).toBe(401);
  });
});

describe("setUsername endpoint", () => {
  test("requires authentication", async () => {
    const res = await request(app)
      .patch("/api/auth/username")
      .send({ username: "shouldfail" });
    expect(res.status).toBe(401);
  });

  test("an authenticated user can change their username and receives a reissued token", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: userAUsername, inviteCode: inviteCodeA, password: userAPassword });
    const token = loginRes.body.token;

    const newUsername = "renamed" + Date.now();
    const res = await request(app)
      .patch("/api/auth/username")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: newUsername });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe(newUsername);
    expect(res.body.token).toBeDefined();
    expect(res.body.token).not.toBe(token);

    // Restore so later tests in this file that log in as userAUsername still resolve.
    await pool.query(`UPDATE users SET username = $1 WHERE id = $2`, [userAUsername, userAId]);
  });

  test("cannot change a username to one already taken within the same org", async () => {
    const suffix = Date.now();
    const hash = await bcrypt.hash(PASSWORD, 10);
    const holderUsername = "holder" + suffix;
    const takerUsername = "taker" + suffix;

    const created = await pool.query(
      `INSERT INTO users (name, password_hash, role, organization_id, username, status)
       VALUES
         ('Holder', $1, 'admin', $2, $3, 'approved'),
         ('Taker', $1, 'admin', $2, $4, 'approved')
       RETURNING id, username`,
      [hash, orgA, holderUsername, takerUsername],
    );

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: takerUsername, inviteCode: inviteCodeA, password: PASSWORD });

    const res = await request(app)
      .patch("/api/auth/username")
      .set("Authorization", `Bearer ${loginRes.body.token}`)
      .send({ username: holderUsername }); // already taken in the same org

    expect(res.status).toBe(409);

    await pool.query(`DELETE FROM users WHERE id IN ($1, $2)`, created.rows.map((r) => r.id));
  });

  test("rejects usernames with invalid characters or length", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: userAUsername, inviteCode: inviteCodeA, password: userAPassword });

    const res = await request(app)
      .patch("/api/auth/username")
      .set("Authorization", `Bearer ${loginRes.body.token}`)
      .send({ username: "a" }); // too short

    expect(res.status).toBe(400);
  });
});

describe("requireUsername enforcement on protected routes", () => {
  // A user with no username can no longer be produced via the public login
  // flow (login requires a username to find the user at all), so this
  // crafts a token directly to exercise the middleware's defensive path.
  test("a token with no username claim is blocked with 403 USERNAME_REQUIRED", async () => {
    const token = jwt.sign(
      { id: userAId, role: "admin", organization_id: orgA },
      process.env.JWT_SECRET,
    );

    const res = await request(app)
      .get("/api/events")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("USERNAME_REQUIRED");
  });
});