require("dotenv").config();
const pool = require("./config/db");
const express = require("express");
const cors = require("cors");


const app = express();

const port = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:5173", credentials: true})); 
app.use(express.json());

// Register routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const eventRoutes = require("./routes/eventRoutes");
app.use("/api/events", eventRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// Start server + test DB
app.listen(port, "0.0.0.0", async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB connected:", res.rows[0]);
  } catch (err) {
    console.error("DB error:", err);
  }
  
  console.log(`Server running on http://0.0.0.0:${port}`);
});
