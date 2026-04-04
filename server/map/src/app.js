const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const errorHandler = require("./middleware/errorHandler");
const railwayRoutes = require("./routes/railways");
const stationRoutes = require("./routes/stations");
const trackSegmentRoutes = require("./routes/trackSegments");
const stationCoverageRoutes = require("./routes/stationCoverage");
const speedLimitRoutes = require("./routes/speedLimits");
const kmPointRoutes = require("./routes/kmPoints");
const mapRoutes = require("./routes/map");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "map-service" });
});

app.use("/railways", railwayRoutes);
app.use("/stations", stationRoutes);
app.use("/track-segments", trackSegmentRoutes);
app.use("/station-coverage", stationCoverageRoutes);
app.use("/speed-limits", speedLimitRoutes);
app.use("/km-points", kmPointRoutes);
app.use("/map", mapRoutes);

app.use(errorHandler);

module.exports = app;
