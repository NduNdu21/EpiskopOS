const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

// Supabase requires SSL in production; local/CI Postgres does not support it
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { require: true, rejectUnauthorized: false }
    : false,
});

module.exports = pool;