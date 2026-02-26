const { Pool } = require("pg");

//verify database url
console.log("Effective DATABASE_URL =", process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

// Supabase requires SSL:
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    require: true,
    rejectUnauthorized: false, 
  },
});

module.exports = pool;