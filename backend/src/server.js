require("dotenv").config();
const pool = require("./config/db");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app); // wrap express in http server

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const port = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:5173", credentials: true})); 
app.use(express.json());

// Make io accessible in controllers
app.set("io", io);

// Register routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const eventRoutes = require("./routes/eventRoutes");
app.use("/api/events", eventRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// Socket connection
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Join a specific event room (used by LivePage)
  socket.on("join_service", (eventId) => {
    socket.join(eventId);
    console.log(`Socket ${socket.id} joined service ${eventId}`);
  });

  // Join general room (used by NavBar to detect live status)
  socket.on("join_general", () => {
    socket.join("general");
    console.log(`Socket ${socket.id} joined general room`);
  });

  // Leave a service room
  socket.on("leave_service", (eventId) => {
    socket.leave(eventId);
    console.log(`Socket ${socket.id} left service ${eventId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Use server.listen instead of app.listen
server.listen(port, "0.0.0.0", async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB connected:", res.rows[0]);
  } catch (err) {
    console.error("DB error:", err);
  }
  console.log(`Server running on http://0.0.0.0:${port}`);
});
