import { Router } from "express";

export const monitoringReportingRouter = Router();

// GET dashboard overview stats
monitoringReportingRouter.get("/admin/dashboard/overview", (req, res) => {
  res.json({
    activeSessions: 3,
    participants: 15,
    completedSessions: 8,
    averageLevel: 3.4,
  });
});

// GET active sessions
monitoringReportingRouter.get("/admin/dashboard/sessions", (req, res) => {
  res.json([
    { id: "S-201", room: "Arena A", level: "Level 3", participants: 5, status: "Active" },
    { id: "S-202", room: "Arena B", level: "Level 2", participants: 4, status: "Paused" },
    { id: "S-203", room: "Arena C", level: "Level 5", participants: 6, status: "Active" },
  ]);
});

// GET participant statuses
monitoringReportingRouter.get("/admin/dashboard/participants", (req, res) => {
  res.json([
    { id: "P-01", session: "S-201", level: "3", status: "Active", update: "2 min ago" },
    { id: "P-02", session: "S-201", level: "2", status: "Waiting", update: "1 min ago" },
    { id: "P-08", session: "S-202", level: "2", status: "Disconnected", update: "5 min ago" },
    { id: "P-14", session: "S-203", level: "5", status: "Completed", update: "Just now" },
  ]);
});