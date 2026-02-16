const express = require("express");
const cors = require("cors");
const path = require("path");

// ABSOLUTE path to backend/.env
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

console.log("ENV PATH:", path.join(__dirname, "../.env"));
console.log("EXISTS:", require("fs").existsSync(path.join(__dirname, "../.env")));


const pool = require("./config/db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => res.send("API running..."));

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("DB connected:", result.rows[0]);
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("DB connection failed:", err);
    process.exit(1);
  }
}

start();