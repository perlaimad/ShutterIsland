import { Router } from "express";
import { env } from "../config/env.js";
import { pingDatabase } from "../config/db.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  try {
    const db = await pingDatabase();
    res.json({
      ok: true,
      environment: env.nodeEnv,
      dbNow: db.now
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Database connection failed",
      error: error.message
    });
  }
});
