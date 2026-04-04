module.exports = function errorHandler(err, _req, res, _next) {
  console.error(err);

  if (err.name === "EntityNotFoundError" || err.status === 404) {
    return res.status(404).json({ error: "Not found" });
  }

  if (err.code === "23505") {
    return res.status(409).json({ error: "Duplicate entry", detail: err.detail });
  }

  if (err.code === "23503") {
    return res.status(400).json({ error: "Foreign key violation", detail: err.detail });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
  });
};
