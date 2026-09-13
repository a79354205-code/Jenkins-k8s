const express = require("express");
const os = require("os");

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    message: "Hello from the Node.js app!",
    nodeVersion: process.version,
    hostname: os.hostname(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});

const gracefulShutdown = (signal) => {
  console.log(`${signal} received: closing HTTP server`);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
