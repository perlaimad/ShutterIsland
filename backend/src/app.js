import cors from "cors";
import express from "express";
import { apiRouter } from "./routes/api.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { env } from "./config/env.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRouter);
app.use(env.apiPrefix, apiRouter);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl
  });
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ message: "Invalid JSON request body." });
  }

  return res.status(error.statusCode ?? 500).json({
    message: error.message ?? "Internal server error."
  });
});
