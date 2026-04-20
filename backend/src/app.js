import cors from "cors";
import express from "express";  
import { apiRouter } from "./routes/api.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { env } from "./config/env.js";

export const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());

app.use(healthRouter);
app.use(env.apiPrefix, apiRouter);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl
  });
});
