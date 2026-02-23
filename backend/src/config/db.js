const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

// Supabase requires SSL:
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    //require: true,
    rejectUnauthorized: false, 
  },
});

module.exports = pool;