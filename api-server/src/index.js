const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "QuantumGuard API Server",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Load routes safely — missing env vars (Supabase, Groq) won't crash the server
const loadRoute = (path, mountPath) => {
  try {
    const route = require(path);
    app.use(mountPath, route);
    console.log(`✓ Route loaded: ${mountPath}`);
  } catch (e) {
    console.log(`⚠ Route skipped (${mountPath}): ${e.message}`);
  }
};

loadRoute("./routes/scan", "/api/scan");
loadRoute("./routes/github", "/api/github");
loadRoute("./routes/reports", "/api/reports");

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n✓ QuantumGuard API Server`);
  console.log(`✓ Running on http://localhost:${PORT}`);
  console.log(`✓ Health: http://localhost:${PORT}/health\n`);
});

module.exports = app;
