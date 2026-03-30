require("dotenv").config();
const pool = require("./config/db");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Build allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

if (process.env.CODESPACE_NAME) {
  allowedOrigins.push(`https://${process.env.CODESPACE_NAME}-5173.app.github.dev`);
}

/* Optional: add a non-secret frontend URL if you deploy later
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}*/

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true); // Postman/curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Socket.IO CORS
const io = new Server(server, { cors: corsOptions });

app.use(express.json());
app.set("io", io);

// Routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const eventRoutes = require("./routes/eventRoutes");
app.use("/api/events", eventRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// Socket.IO events...
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("join_service", (eventId) => socket.join(eventId));
  socket.on("join_general", () => socket.join("general"));
  socket.on("leave_service", (eventId) => socket.leave(eventId));
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

const port = process.env.PORT || 5000;
server.listen(port, "0.0.0.0", async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB connected:", res.rows[0]);
  } catch (err) {
    console.error("DB error:", err);
  }
  console.log(`Server running on http://0.0.0.0:${port}`);
});