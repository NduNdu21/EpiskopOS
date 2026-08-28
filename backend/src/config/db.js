const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

// Supabase's pooler always requires SSL, regardless of environment.
// Only a genuinely local/CI Postgres instance should skip it.
const isSupabase = process.env.DATABASE_URL.includes("supabase");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabase
    ? { require: true, rejectUnauthorized: false }
    : false,
});

module.exports = pool;