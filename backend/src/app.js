const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const pool = require("./config/db");

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);
const { apiLimiter, authLimiter } = require("./middleware/rateLimiter");

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

if (process.env.CODESPACE_NAME) {
  allowedOrigins.push(`https://${process.env.CODESPACE_NAME}-5173.app.github.dev`);
}

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

const io = new Server(server, { cors: corsOptions });

app.use(express.json());
app.set("io", io);

// Rate limiters must be mounted BEFORE the routes they're meant to guard —
// Express applies middleware in registration order, so a limiter registered
// after a route has already been handled never runs for that route.
app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const eventRoutes = require("./routes/eventRoutes");
app.use("/api/events", eventRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const messageRoutes = require("./routes/messageRoutes");
app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use("/api/messages", messageRoutes);

const attendanceRoutes = require("./routes/attendanceRoutes");
app.use("/api/attendance", attendanceRoutes);

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

const pushRoutes = require("./routes/pushRoutes");
app.use("/api/push", pushRoutes);

const internalRoutes = require("./routes/internalRoutes");
app.use("/internal", internalRoutes);

require("./config/webpush");

// Socket.IO connection handling
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    socket.user = decoded; // { id, role, organization_id }
    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id, "org:", socket.user.organization_id);

  const orgId = socket.user.organization_id;
  const role = socket.user.role;

  // Every connected client auto-joins their org's general room —
  // no client-supplied org id, it comes from the verified token
  socket.join(`general:${orgId}`);

  socket.on("join_service", async (eventId) => {
    try {
      const check = await pool.query(
        `SELECT id FROM events WHERE id = $1 AND organization_id = $2`,
        [eventId, orgId],
      );
      if (check.rows.length === 0) {
        return; // event doesn't exist or belongs to another org — silently refuse
      }
      socket.join(eventId);
    } catch (err) {
      console.error("join_service error:", err.message);
    }
  });
  socket.on("leave_service", (eventId) => socket.leave(eventId));

  socket.on("join_rooms", () => {
    // Fixed: real role values now (was sound_volunteer/lights_volunteer/media_volunteer,
    // which never matched actual users.role values)
    const teamMap = {
      sound: `team:${orgId}:sound`,
      lighting: `team:${orgId}:lighting`,
      media: `team:${orgId}:media`,
    };

    const teamRoom = teamMap[role];
    if (teamRoom) socket.join(teamRoom);

    if (role === "admin") {
      Object.values(teamMap).forEach((room) => socket.join(room));
    }
  });

  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

module.exports = { app, server, io };