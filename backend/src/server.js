require("dotenv").config();
const pool = require("./config/db");
const express = require("express");

const app = express();

const port = process.env.PORT || 5000;

//Start the server and test DB connection
app.listen(port, "0.0.0.0", async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB connected:", res.rows[0]);
  } catch (err) {
    console.error("DB error:", err);
  }
  
  console.log(`Server running on http://0.0.0.0:${port}`);
});
