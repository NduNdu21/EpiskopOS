const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

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

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

const pushRoutes = require("./routes/pushRoutes");
app.use("/api/push", pushRoutes);

const internalRoutes = require("./routes/internalRoutes");
app.use("/internal", internalRoutes);

require("./config/webpush");

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join_service", (eventId) => socket.join(eventId));
  socket.on("join_general", () => socket.join("general"));
  socket.on("leave_service", (eventId) => socket.leave(eventId));

  socket.on("join_rooms", ({ role }) => {
    socket.join("broadcast");

    const teamMap = {
      sound_volunteer: "team:sound",
      lights_volunteer: "team:lights",
      media_volunteer: "team:media",
    };

    const teamRoom = teamMap[role];
    if (teamRoom) socket.join(teamRoom);

    if (role === "admin") {
      ["team:sound", "team:lights", "team:media"].forEach((room) => {
        socket.join(room);
      });
    }
  });

  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

module.exports = { app, server, io };