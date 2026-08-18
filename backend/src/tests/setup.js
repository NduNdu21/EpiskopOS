const { Pool } = require("pg");

const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL,
});

module.exports = testPool;