require("dotenv").config();
const pool = require("./config/db");
const { app, server } = require("./app");

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