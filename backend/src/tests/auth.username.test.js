const request = require("supertest");
const bcrypt = require("bcrypt");
const { app } = require("../app");
const pool = require("./setup");

let orgA, orgB, inviteCodeA, inviteCodeB;
let legacyUserEmail, legacyUserPassword;
let migratedUserUsername, migratedUserPassword;
let pendingUsername, pendingPassword;

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

  // Legacy user: no username set, must log in by email
  legacyUserEmail = "legacy-" + suffix + "@test.com";
  legacyUserPassword = PASSWORD;

  // Migrated user: has a username, in org A, logs in via username + inviteCodeA
  migratedUserUsername = "migrated" + suffix;
  migratedUserPassword = PASSWORD;

  // Same username, different org — proves username uniqueness is per-org,
  // and that inviteCodeA cannot be used to log in as the org B user
  pendingUsername = "migrated" + suffix; // deliberately same as migratedUserUsername
  pendingPassword = PASSWORD;

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, organization_id, username, status)
     VALUES
       ('Legacy User', $1, $2, 'admin', $3, NULL, 'approved'),
       ('Migrated User', $4, $2, 'admin', $3, $5, 'approved'),
       ('Pending Org B User', $6, $2, 'admin', $7, $5, 'pending')`,
    [
      legacyUserEmail, hash, orgA,
      "migrated-" + suffix + "@test.com", migratedUserUsername,
      "pendingb-" + suffix + "@test.com", orgB,
    ],
  );
});

afterAll(async () => {
  await pool.query(`DELETE FROM users WHERE organization_id IN ($1, $2)`, [orgA, orgB]);
  await pool.query(`DELETE FROM organizations WHERE id IN ($1, $2)`, [orgA, orgB]);
  await pool.end();
});

describe("legacy email login (no username set)", () => {
  test("logs in successfully with email + password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: legacyUserEmail, password: legacyUserPassword });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test("mustSetUsername is true for a user with no username", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: legacyUserEmail, password: legacyUserPassword });
    expect(res.body.mustSetUsername).toBe(true);
  });
});

describe("username + invite code login", () => {
  test("logs in successfully with correct username + invite code + password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: migratedUserUsername, inviteCode: inviteCodeA, password: migratedUserPassword });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test("mustSetUsername is false once a username is set", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: migratedUserUsername, inviteCode: inviteCodeA, password: migratedUserPassword });
    expect(res.body.mustSetUsername).toBe(false);
  });

  test("same username in a different org does not authenticate against the wrong invite code", async () => {
    // migratedUserUsername exists in org A; pendingUsername (same string) exists in org B.
    // Logging in with org A's invite code must resolve to the org A user, not leak into org B.
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: migratedUserUsername, inviteCode: inviteCodeB, password: pendingPassword });
    // org B's user with this username is 'pending' — should be blocked, not silently authenticated as org A's user
    expect(res.status).toBe(403);
  });

  test("wrong invite code for a username that doesn't exist in that org returns invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "no-such-user-anywhere", inviteCode: inviteCodeA, password: PASSWORD });
    expect(res.status).toBe(401);
  });

  test("username without an invite code is rejected with 400, not treated as email lookup", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: migratedUserUsername, password: migratedUserPassword });
    expect(res.status).toBe(400);
  });

  test("invalid invite code returns 404", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: migratedUserUsername, inviteCode: "NOT-A-REAL-CODE", password: migratedUserPassword });
    expect(res.status).toBe(404);
  });
});

describe("setUsername endpoint", () => {
  test("requires authentication", async () => {
    const res = await request(app)
      .patch("/api/auth/username")
      .send({ username: "shouldfail" });
    expect(res.status).toBe(401);
  });

  test("legacy user can set a username and receives a reissued token with it embedded", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: legacyUserEmail, password: legacyUserPassword });
    const token = loginRes.body.token;

    const newUsername = "newlyset" + Date.now();
    const res = await request(app)
      .patch("/api/auth/username")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: newUsername });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe(newUsername);
    expect(res.body.token).toBeDefined();
    expect(res.body.token).not.toBe(token);
  });

  test("cannot set a username already taken within the same org", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: migratedUserUsername, inviteCode: inviteCodeA, password: migratedUserPassword });
    const token = loginRes.body.token;

    // Try to "set" a username that another org A user already has — should be a no-op
    // for that user's own username, but this proves the collision path returns 409
    // when attempting to claim someone else's.
    const otherUsername = "legacy-taker-" + Date.now();
    await request(app)
      .patch("/api/auth/username")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: otherUsername });

    const collideRes = await request(app)
      .post("/api/auth/login")
      .send({ email: legacyUserEmail, password: legacyUserPassword });
    const legacyToken = collideRes.body.token;

    const res = await request(app)
      .patch("/api/auth/username")
      .set("Authorization", `Bearer ${legacyToken}`)
      .send({ username: otherUsername });

    expect(res.status).toBe(409);
  });

  test("rejects usernames with invalid characters or length", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: migratedUserUsername, inviteCode: inviteCodeA, password: migratedUserPassword });
    const token = loginRes.body.token;

    const res = await request(app)
      .patch("/api/auth/username")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "a" }); // too short

    expect(res.status).toBe(400);
  });
});

describe("requireUsername enforcement on protected routes", () => {
  test("a user with no username is blocked from a protected route with 403 USERNAME_REQUIRED", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: legacyUserEmail, password: legacyUserPassword });
    // legacyUserEmail's username may have been set by the earlier test in this
    // file depending on run order within this describe block's isolation —
    // use a fresh never-touched legacy user to keep this test independent.
    const suffix = Date.now();
    const hash = await bcrypt.hash(PASSWORD, 10);
    const fresh = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, organization_id, username, status)
       VALUES ('Fresh Legacy', $1, $2, 'admin', $3, NULL, 'approved') RETURNING id`,
      ["fresh-legacy-" + suffix + "@test.com", hash, orgA],
    );

    const freshLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "fresh-legacy-" + suffix + "@test.com", password: PASSWORD });

    const res = await request(app)
      .get("/api/events")
      .set("Authorization", `Bearer ${freshLoginRes.body.token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("USERNAME_REQUIRED");

    await pool.query(`DELETE FROM users WHERE id = $1`, [fresh.rows[0].id]);
  });
});