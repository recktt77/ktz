require("dotenv").config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 8082,
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || "map",
    user: process.env.DB_USER || "map",
    password: process.env.DB_PASS || "map_secret",
  },
};
