require("dotenv").config();
const pool = require("./config/db");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);


// Dynamic CORS for Codespaces
const codespace = process.env.CODESPACE_NAME;

// If running in Codespaces, generate correct HTTPS origin
const allowedOrigin = codespace
  ? `https://${codespace}-5173.app.github.dev`
  : "http://localhost:5173";

console.log("Allowed Origin:", allowedOrigin);

// Express CORS
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

// Socket.IO CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(express.json());

// Make io available in controllers
app.set("io", io);


// Routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const eventRoutes = require("./routes/eventRoutes");
app.use("/api/events", eventRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// Socket.IO Events
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Join a live service
  socket.on("join_service", (eventId) => {
    socket.join(eventId);
    console.log(`Socket ${socket.id} joined service ${eventId}`);
  });

  // General room for Navbar live detection
  socket.on("join_general", () => {
    socket.join("general");
    console.log(`Socket ${socket.id} joined general room`);
  });

  // Leave service room
  socket.on("leave_service", (eventId) => {
    socket.leave(eventId);
    console.log(`Socket ${socket.id} left service ${eventId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Start Server
const port = process.env.PORT;

server.listen(port, "0.0.0.0", async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB connected:", res.rows[0]);
  } catch (err) {
    console.error("DB error:", err);
  }

  console.log(`Server running on http://0.0.0.0:${port}`);
});