const request = require("supertest");
const jwt = require("jsonwebtoken");
const { io: ioClient } = require("socket.io-client");
const { app, server } = require("../app");
const pool = require("./setup");

let orgA, orgB, adminA, adminB, tokenAdminA, tokenAdminB, eventA;
let httpServer, port;

function waitFor(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

function connectSocket(token) {
  return ioClient(`http://localhost:${port}`, {
    auth: token ? { token } : {},
    transports: ["websocket"],
    forceNew: true,
  });
}

beforeAll(async () => {
  httpServer = await new Promise((resolve) => {
    const s = server.listen(0, () => resolve(s));
  });
  port = httpServer.address().port;

  const orgs = await pool.query(
    `INSERT INTO organizations (name, slug, invite_code) VALUES ($1, $2, $3), ($4, $5, $6) RETURNING id`,
    [
      "Test Org SockA", "test-org-socka-" + Date.now(), "SOCKA" + Date.now(),
      "Test Org SockB", "test-org-sockb-" + Date.now(), "SOCKB" + Date.now(),
    ],
  );
  [orgA, orgB] = orgs.rows.map((r) => r.id);

  const users = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, organization_id)
     VALUES ('Admin SockA', 'socka-' || $3 || '@test.com', 'x', 'admin', $1),
            ('Admin SockB', 'sockb-' || $3 || '@test.com', 'x', 'admin', $2)
     RETURNING id`,
    [orgA, orgB, Date.now()],
  );
  [adminA, adminB] = users.rows.map((r) => r.id);

  tokenAdminA = jwt.sign({ id: adminA, role: "admin", organization_id: orgA }, process.env.JWT_SECRET);
  tokenAdminB = jwt.sign({ id: adminB, role: "admin", organization_id: orgB }, process.env.JWT_SECRET);

  const event = await pool.query(
    `INSERT INTO events (title, event_date, created_by, organization_id)
     VALUES ('Sock Org A Service', NOW(), $1, $2) RETURNING id`,
    [adminA, orgA],
  );
  eventA = event.rows[0].id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM messages WHERE organization_id IN ($1, $2)`, [orgA, orgB]);
  await pool.query(`DELETE FROM events WHERE organization_id IN ($1, $2)`, [orgA, orgB]);
  await pool.query(`DELETE FROM users WHERE organization_id IN ($1, $2)`, [orgA, orgB]);
  await pool.query(`DELETE FROM organizations WHERE id IN ($1, $2)`, [orgA, orgB]);
  await pool.end();
  await new Promise((resolve) => httpServer.close(resolve));
});

describe("socket handshake auth", () => {
  test("valid token connects successfully", async () => {
    const socket = connectSocket(tokenAdminA);
    await waitFor(socket, "connect");
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });

  test("missing token is rejected", async () => {
    const socket = connectSocket(null);
    const err = await waitFor(socket, "connect_error");
    expect(err.message).toMatch(/Authentication required/);
    socket.disconnect();
  });

  test("invalid token is rejected", async () => {
    const socket = connectSocket("not-a-real-token");
    const err = await waitFor(socket, "connect_error");
    expect(err.message).toMatch(/Invalid or expired token/);
    socket.disconnect();
  });
});

describe("general room cross-org isolation", () => {
  test("broadcast message reaches sender's org only, not the other org", async () => {
    const socketA = connectSocket(tokenAdminA);
    const socketB = connectSocket(tokenAdminB);
    await Promise.all([waitFor(socketA, "connect"), waitFor(socketB, "connect")]);

    const receivedB = [];
    socketB.on("new_message", (msg) => receivedB.push(msg));
    const gotA = waitFor(socketA, "new_message");

    await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${tokenAdminA}`)
      .send({ content: "org A broadcast", scope: "broadcast" });

    const msgA = await gotA;
    expect(msgA.content).toBe("org A broadcast");

    await new Promise((r) => setTimeout(r, 300));
    expect(receivedB.length).toBe(0);

    socketA.disconnect();
    socketB.disconnect();
  });
});

describe("team room scoping", () => {
  test("team-targeted message only reaches sockets in that team room", async () => {
    const suffix = Date.now();
    const users = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, organization_id)
       VALUES ('Sound Vol', 'soundvol-' || $2 || '@test.com', 'x', 'sound', $1),
              ('Lighting Vol', 'lightvol-' || $2 || '@test.com', 'x', 'lighting', $1)
       RETURNING id, role`,
      [orgA, suffix],
    );
    const soundUser = users.rows.find((u) => u.role === "sound");
    const lightingUser = users.rows.find((u) => u.role === "lighting");

    const tokenSound = jwt.sign({ id: soundUser.id, role: "sound", organization_id: orgA }, process.env.JWT_SECRET);
    const tokenLighting = jwt.sign({ id: lightingUser.id, role: "lighting", organization_id: orgA }, process.env.JWT_SECRET);

    const socketSound = connectSocket(tokenSound);
    const socketLighting = connectSocket(tokenLighting);
    await Promise.all([waitFor(socketSound, "connect"), waitFor(socketLighting, "connect")]);

    socketSound.emit("join_rooms");
    socketLighting.emit("join_rooms");
    await new Promise((r) => setTimeout(r, 200));

    const receivedLighting = [];
    socketLighting.on("new_message", (msg) => receivedLighting.push(msg));
    const gotSound = waitFor(socketSound, "new_message");

    await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${tokenSound}`)
      .send({ content: "sound team only", scope: "team", team_target: "sound" });

    const msg = await gotSound;
    expect(msg.content).toBe("sound team only");

    await new Promise((r) => setTimeout(r, 300));
    expect(receivedLighting.length).toBe(0);

    socketSound.disconnect();
    socketLighting.disconnect();

    await pool.query(`DELETE FROM users WHERE id IN ($1, $2)`, [soundUser.id, lightingUser.id]);
  });
});

describe("join_service org scoping", () => {
  // NOTE: paths assumed as POST /api/events/:id/go-live and /api/events/:id/end-service
  // — confirm against eventRoutes.js before running.

  test("socket can join an event room belonging to its own org and receives updates", async () => {
    const socket = connectSocket(tokenAdminA);
    await waitFor(socket, "connect");

    socket.emit("join_service", eventA);
    await new Promise((r) => setTimeout(r, 200));

    const got = waitFor(socket, "service_update");
    await request(app)
      .post(`/api/events/${eventA}/go-live`)
      .set("Authorization", `Bearer ${tokenAdminA}`);

    const update = await got;
    expect(update.type).toBe("GO_LIVE");

    await request(app)
      .post(`/api/events/${eventA}/end-service`)
      .set("Authorization", `Bearer ${tokenAdminA}`);

    socket.disconnect();
  });

  test("socket from a different org cannot join another org's event room", async () => {
    const socketB = connectSocket(tokenAdminB);
    await waitFor(socketB, "connect");

    socketB.emit("join_service", eventA);
    await new Promise((r) => setTimeout(r, 200));

    const receivedB = [];
    socketB.on("service_update", (msg) => receivedB.push(msg));

    await request(app)
      .post(`/api/events/${eventA}/go-live`)
      .set("Authorization", `Bearer ${tokenAdminA}`);

    await new Promise((r) => setTimeout(r, 300));
    expect(receivedB.length).toBe(0);

    await request(app)
      .post(`/api/events/${eventA}/end-service`)
      .set("Authorization", `Bearer ${tokenAdminA}`);

    socketB.disconnect();
  });
});

describe("go-live / end-service general-room broadcast scoping", () => {
  test("org B's general room never receives org A's GO_LIVE or END_SERVICE", async () => {
    const socketA = connectSocket(tokenAdminA);
    const socketB = connectSocket(tokenAdminB);
    await Promise.all([waitFor(socketA, "connect"), waitFor(socketB, "connect")]);

    const receivedB = [];
    socketB.on("service_update", (msg) => receivedB.push(msg));

    const gotGoLive = waitFor(socketA, "service_update");
    await request(app)
      .post(`/api/events/${eventA}/go-live`)
      .set("Authorization", `Bearer ${tokenAdminA}`);
    expect((await gotGoLive).type).toBe("GO_LIVE");

    const gotEnd = waitFor(socketA, "service_update");
    await request(app)
      .post(`/api/events/${eventA}/end-service`)
      .set("Authorization", `Bearer ${tokenAdminA}`);
    expect((await gotEnd).type).toBe("END_SERVICE");

    await new Promise((r) => setTimeout(r, 300));
    expect(receivedB.length).toBe(0);

    socketA.disconnect();
    socketB.disconnect();
  });
});