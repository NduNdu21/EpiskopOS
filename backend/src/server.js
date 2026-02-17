require("dotenv").config();
const pool = require("./config/db");

pool.query("SELECT NOW()")
  .then(res => console.log("DB connected:", res.rows[0]))
  .catch(err => console.error("DB error:", err));