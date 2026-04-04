const AppDataSource = require("./config/data-source");
const config = require("./config");
const app = require("./app");

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected (schema: %s)", config.db.schema);
    app.listen(config.port, () => {
      console.log("Map service listening on port %d", config.port);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
