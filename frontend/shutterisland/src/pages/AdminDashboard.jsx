import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./AdminDashboard.module.css";

const API_BASE = import.meta.env?.VITE_API_URL ?? "http://localhost:4000";
const POLL_MS = 5000;

const COLORS = {
  raspberry: "#870058",
  cherry: "#A4303F",
  apricot: "#F2D0A4",
  celadon: "#A2CE9C",
  jungle: "#45B06C",
  amber: "#B48C3C",
  stone: "#7B6A63",
  paper: "#FDF4E7",
  ink: "#2E1A10",
};

const fallbackOverview = {
  activeSessions: 2,
  totalParticipants: 15,
  activePlayers: 9,
  eliminatedPlayers: 4,
};

const fallbackSessions = [
  { id: "S-201", name: "Session VII", room: "Arena A", round: 3, participants: 5, capacity: 8, status: "Active" },
  { id: "S-202", name: "Session VI", room: "Arena B", round: 2, participants: 4, capacity: 8, status: "Paused" },
  { id: "S-203", name: "Session V", room: "Arena C", round: 5, participants: 6, capacity: 8, status: "Active" },
];

const fallbackParticipants = [
  { id: "P-01", name: "Tariq Nasr", session: "S-201", level: 3, status: "Active", update: "2 min ago" },
  { id: "P-02", name: "Sera Mikkelsen", session: "S-201", level: 2, status: "Active", update: "1 min ago" },
  { id: "P-08", name: "Dario Vale", session: "S-202", level: 2, status: "Eliminated", update: "5 min ago" },
  { id: "P-14", name: "Yara Cross", session: "S-203", level: 5, status: "Finished", update: "Just now" },
  { id: "P-05", name: "Felix Osei", session: "S-201", level: 1, status: "Waiting", update: "30 sec ago" },
];

const fallbackProgression = [
  { level: 1, label: "Orientation", status: "Completed" },
  { level: 2, label: "First Contact", status: "Completed" },
  { level: 3, label: "Deep Search", status: "Active" },
  { level: 4, label: "Elimination", status: "Pending" },
  { level: 5, label: "Final Trial", status: "Pending" },
];

const fallbackLogs = [
  { time: "00:41", admin: "Admin-03", action: "Generated report", target: "Session Summary" },
  { time: "00:30", admin: "Admin-01", action: "Updated level", target: "P-14" },
  { time: "00:22", admin: "Admin-02", action: "Paused session", target: "S-202" },
  { time: "00:14", admin: "Admin-01", action: "Started session", target: "S-201" },
  { time: "00:08", admin: "Admin-03", action: "Added participant", target: "P-08" },
  { time: "00:02", admin: "Admin-01", action: "Created session", target: "S-203" },
];

function normalizeStatus(status) {
  if (!status) return "Paused";

  const value = String(status).trim().toLowerCase();

  if (["active", "alive", "running"].includes(value)) return "Active";
  if (["paused", "inactive", "disconnected"].includes(value)) return "Paused";
  if (["finished", "completed", "closed"].includes(value)) return "Finished";
  if (["eliminated", "dead"].includes(value)) return "Eliminated";
  if (["waiting", "pending", "queued"].includes(value)) return "Waiting";

  return String(status);
}

function badgeClass(status, css) {
  const normalized = normalizeStatus(status);
  const map = {
    Active: css.badgeActive,
    Paused: css.badgePaused,
    Finished: css.badgeFinished,
    Eliminated: css.badgeEliminated,
    Waiting: css.badgeWaiting,
  };

  return `${css.badge} ${map[normalized] ?? css.badgePaused}`;
}

function formatTimestamp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatAxisLabel(value) {
  return String(value).replace(/^Session\s+/i, "");
}

async function apiGet(path, fallback) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch {
    return fallback;
  }
}

async function apiPost(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function DashboardTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className={styles.chartTooltip}>
      {label ? <div className={styles.chartTooltipTitle}>{labelFormatter ? labelFormatter(label) : label}</div> : null}
      {payload.map((entry) => (
        <div key={`${entry.name}-${entry.dataKey}`} className={styles.chartTooltipRow}>
          <span className={styles.chartTooltipKey}>{entry.name}</span>
          <strong className={styles.chartTooltipValue}>
            {formatter ? formatter(entry.value, entry.name, entry) : entry.value}
          </strong>
        </div>
      ))}
    </div>
  );
}

function RefreshButton({ loading, lastRefreshed, onRefresh }) {
  return (
    <div className={styles.refreshRow}>
      <button
        type="button"
        className={`${styles.ctaBtn} ${styles.ctaBtnSecondary}`}
        onClick={onRefresh}
        disabled={loading}
        aria-label="Manually refresh data"
      >
        <span className={loading ? styles.spinIcon : styles.refreshIcon}>↻</span>
        {loading ? "Refreshing..." : "Refresh"}
      </button>
      {lastRefreshed && <span className={styles.lastRefreshed}>Last updated {lastRefreshed}</span>}
    </div>
  );
}

function SummaryCards({ overview }) {
  const cards = [
    { label: "Active Sessions", value: overview.activeSessions ?? 0, accent: "cherry" },
    { label: "Total Participants", value: overview.totalParticipants ?? overview.participants ?? 0, accent: "default" },
    { label: "Active Players", value: overview.activePlayers ?? 0, accent: "green" },
    { label: "Eliminated", value: overview.eliminatedPlayers ?? overview.completedSessions ?? 0, accent: "muted" },
  ];

  return (
    <div className={styles.summaryGrid}>
      {cards.map(({ label, value, accent }) => (
        <div key={label} className={`${styles.summaryCard} ${styles[`summaryCard_${accent}`]}`}>
          <div className={styles.summaryLabel}>{label}</div>
          <div className={styles.summaryValue}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function SessionsTable({ sessions, selectedId, onSelect, onAction, actionLoading }) {
  if (!sessions?.length) {
    return <div className={styles.emptyState}>No active sessions found.</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Session</th>
            <th>Room</th>
            <th>Round</th>
            <th>Players</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => {
            const normalizedStatus = normalizeStatus(session.status);

            return (
              <tr
                key={session.id}
                className={`${styles.tableRow} ${selectedId === session.id ? styles.tableRowSelected : ""}`}
                onClick={() => onSelect(session.id)}
              >
                <td>
                  <button
                    type="button"
                    className={styles.sessionLink}
                    onClick={(event) => {
                      event.stopPropagation();
                      window.location.href = `/sessions/${session.id}`;
                    }}
                  >
                    {session.name ?? session.id}
                  </button>
                  <div className={styles.sessionSubId}>{session.id}</div>
                </td>
                <td>{session.room ?? "-"}</td>
                <td>Round {session.round ?? "-"}</td>
                <td>
                  <span className={styles.playerCount}>{session.participants ?? 0}</span>
                  <span className={styles.playerCapacity}>/{session.capacity ?? 8}</span>
                </td>
                <td>
                  <span className={badgeClass(normalizedStatus, styles)}>
                    {normalizedStatus === "Active" && <span className={styles.activeDot} />}
                    {normalizedStatus}
                  </span>
                </td>
                <td onClick={(event) => event.stopPropagation()}>
                  <div className={styles.actionBtns}>
                    {normalizedStatus !== "Active" && (
                      <button
                        type="button"
                        className={`${styles.ctaBtn} ${styles.ctaBtnStart}`}
                        disabled={actionLoading === session.id}
                        onClick={() => onAction(session.id, normalizedStatus === "Paused" ? "resume" : "start")}
                      >
                        {normalizedStatus === "Paused" ? "Resume" : "Start"}
                      </button>
                    )}
                    {normalizedStatus === "Active" && (
                      <button
                        type="button"
                        className={`${styles.ctaBtn} ${styles.ctaBtnPause}`}
                        disabled={actionLoading === session.id}
                        onClick={() => onAction(session.id, "pause")}
                      >
                        Pause
                      </button>
                    )}
                    <button
                      type="button"
                      className={`${styles.ctaBtn} ${styles.ctaBtnTerminate}`}
                      disabled={actionLoading === session.id || normalizedStatus === "Finished"}
                      onClick={() => onAction(session.id, "terminate")}
                    >
                      Terminate
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ParticipantsPanel({ participants, sessionId }) {
  const filtered = sessionId
    ? (participants ?? []).filter((participant) => participant.session === sessionId)
    : (participants ?? []);

  if (!filtered.length) {
    return <div className={styles.emptyState}>No participants found for this session.</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Participant</th>
            <th>Session</th>
            <th>Level</th>
            <th>Status</th>
            <th>Last Update</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((participant) => (
            <tr key={participant.id} className={styles.tableRow}>
              <td>
                <div>{participant.name ?? participant.id}</div>
                <div className={styles.sessionSubId}>{participant.name ? participant.id : ""}</div>
              </td>
              <td>{participant.session ?? "-"}</td>
              <td>{participant.level ?? "-"}</td>
              <td>
                <span className={badgeClass(participant.status, styles)}>{normalizeStatus(participant.status)}</span>
              </td>
              <td className={styles.updateTime}>{participant.update ? formatTimestamp(participant.update) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProgressionTimeline({ progression }) {
  const levels = progression ?? fallbackProgression;

  return (
    <div className={styles.progressionList}>
      {levels.map((level, index) => {
        const normalizedStatus = normalizeStatus(level.status);
        const progressionClass =
          normalizedStatus === "Finished"
            ? styles.prog_completed
            : normalizedStatus === "Active"
              ? styles.prog_active
              : styles.prog_pending;

        return (
          <div key={level.level ?? index} className={`${styles.progressionItem} ${progressionClass}`}>
            <div className={styles.progNode}>
              <div className={styles.progNodeInner} />
              {index < levels.length - 1 && <div className={styles.progLine} />}
            </div>
            <div className={styles.progContent}>
              <div className={styles.progLabel}>
                Level {level.level} - {level.label}
              </div>
              <div className={badgeClass(normalizedStatus, styles)}>{normalizedStatus}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AuditLog({ logs }) {
  const items = logs ?? fallbackLogs;

  return (
    <div className={styles.logScroll}>
      {items.length === 0 && <div className={styles.emptyState}>No log entries yet.</div>}
      {items.map((log, index) => (
        <div key={`${log.time ?? log.actionTime ?? index}`} className={styles.logItem}>
          <div className={styles.logTime}>{log.time ?? formatTimestamp(log.actionTime)}</div>
          <div className={styles.logContent}>
            <strong>{log.admin ?? log.managerUsername ?? `Manager ${log.managerId ?? ""}`.trim()}</strong>{" "}
            {log.action ?? log.actionType}
            {(log.target ?? log.sessionId) && (
              <span className={styles.logTarget}> - {log.target ?? `Session ${log.sessionId}`}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OccupancyChart({ data }) {
  if (!data.length) {
    return <div className={styles.emptyState}>No session occupancy data available.</div>;
  }

  return (
    <div className={styles.chartCanvas}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="rgba(164, 48, 63, 0.12)" vertical={false} />
          <XAxis
            dataKey="shortLabel"
            tick={{ fill: "#6C5144", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fill: "#6C5144", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(164, 48, 63, 0.06)" }}
            content={(
              <DashboardTooltip
                formatter={(value) => `${value}%`}
                labelFormatter={(value) => data.find((item) => item.shortLabel === value)?.label ?? value}
              />
            )}
          />
          <Bar dataKey="occupancy" name="Occupancy" radius={[6, 6, 0, 0]} fill={COLORS.cherry} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ParticipantStatusChart({ data }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

  if (!total) {
    return <div className={styles.emptyState}>No participant status data available.</div>;
  }

  return (
    <div className={styles.chartSplit}>
      <div className={styles.chartCanvas}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={56}
              outerRadius={86}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={<DashboardTooltip formatter={(value) => `${value} players`} />}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.chartLegendColumn}>
        {data.map((item) => (
          <div key={item.label} className={styles.legendRow}>
            <span className={styles.legendSwatch} style={{ backgroundColor: item.color }} />
            <span className={styles.legendLabel}>{item.label}</span>
            <strong className={styles.legendValue}>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressionChart({ data }) {
  const hasData = data.some((item) => item.count > 0);

  if (!hasData) {
    return <div className={styles.emptyState}>No progression data available.</div>;
  }

  return (
    <div className={styles.chartCanvas}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(164, 48, 63, 0.12)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#6C5144", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            dataKey="label"
            type="category"
            width={74}
            tick={{ fill: "#6C5144", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<DashboardTooltip formatter={(value) => `${value} steps`} />} />
          <Bar dataKey="count" name="Steps" radius={[0, 6, 6, 0]}>
            {data.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReportPreviewChart({ title, subtitle, type, data, valueFormatter }) {
  const hasSeries = Array.isArray(data) && data.some((item) => Number(item.value ?? item.count ?? 0) > 0);

  return (
    <div className={styles.reportPreview}>
      <div className={styles.reportPreviewHeader}>
        <div className={styles.reportPreviewTitle}>{title}</div>
        <div className={styles.reportPreviewSub}>{subtitle}</div>
      </div>
      {!hasSeries ? (
        <div className={styles.reportPreviewEmpty}>No preview data</div>
      ) : (
        <div className={styles.reportPreviewCanvas}>
          <ResponsiveContainer width="100%" height="100%">
            {type === "pie" ? (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="label" innerRadius={28} outerRadius={44} paddingAngle={2} stroke="none">
                  {data.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DashboardTooltip formatter={valueFormatter} />} />
              </PieChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="rgba(164, 48, 63, 0.1)" vertical={false} />
                <XAxis dataKey="label" tickFormatter={formatAxisLabel} tick={{ fill: "#6C5144", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#6C5144", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<DashboardTooltip formatter={valueFormatter} />} />
                <Bar dataKey={type === "bar-count" ? "count" : "value"} radius={[5, 5, 0, 0]}>
                  {data.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function AnalyticsPanel({ occupancyData, statusBreakdown, progressionBreakdown }) {
  return (
    <div className={styles.analyticsGrid}>
      <div className={styles.analyticsCard}>
        <div className={styles.analyticsLabel}>Session Occupancy</div>
        <div className={styles.analyticsText}>How full each session is right now.</div>
        <OccupancyChart data={occupancyData} />
      </div>

      <div className={styles.analyticsCard}>
        <div className={styles.analyticsLabel}>Participant Distribution</div>
        <div className={styles.analyticsText}>Current player state split for the selected session.</div>
        <ParticipantStatusChart data={statusBreakdown} />
      </div>

      <div className={styles.analyticsCard}>
        <div className={styles.analyticsLabel}>Progression Breakdown</div>
        <div className={styles.analyticsText}>Completed, active, and pending stages across the flow.</div>
        <ProgressionChart data={progressionBreakdown} />
      </div>
    </div>
  );
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className={styles.errorBanner} role="alert">
      <span>⚠ {message}</span>
      <button type="button" className={styles.errorDismiss} onClick={onDismiss}>✕</button>
    </div>
  );
}

function AdminDashboard() {
  const [overview, setOverview] = useState(fallbackOverview);
  const [sessions, setSessions] = useState(fallbackSessions);
  const [participants, setParticipants] = useState(fallbackParticipants);
  const [progression, setProgression] = useState(fallbackProgression);
  const [logs, setLogs] = useState(fallbackLogs);

  const [selectedSession, setSelectedSession] = useState(fallbackSessions[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [reportLoading, setReportLoading] = useState(null);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const pollRef = useRef(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const [overviewData, sessionsData] = await Promise.all([
        apiGet("/api/admin/dashboard/overview", fallbackOverview),
        apiGet("/api/admin/dashboard/sessions", fallbackSessions),
      ]);

      const normalizedSessions = Array.isArray(sessionsData)
        ? sessionsData.map((session) => ({
            id: session.id ?? session.sessionCode ?? session.session_id,
            name: session.name ?? session.sessionCode ?? session.id,
            room: session.room ?? null,
            round: session.round ?? session.level ?? null,
            participants: Number(session.participants ?? session.totalPlayers ?? 0),
            capacity: Number(session.capacity ?? 8),
            status: normalizeStatus(session.status),
          }))
        : fallbackSessions;

      setOverview(overviewData);
      setSessions(normalizedSessions);
      setSelectedSession((previous) => {
        const ids = normalizedSessions.map((session) => session.id);
        return ids.includes(previous) ? previous : ids[0] ?? null;
      });
    } catch (loadError) {
      setError("Failed to load dashboard data. Showing cached values.");
      console.error(loadError);
    } finally {
      if (!silent) setLoading(false);
      setLastRefreshed(new Date().toLocaleTimeString());
    }
  }, []);

  const fetchSessionDetail = useCallback(async (sessionId) => {
    if (!sessionId) return;

    const [participantsData, progressionData, logsData] = await Promise.all([
      apiGet("/api/admin/dashboard/participants", fallbackParticipants),
      apiGet(`/api/game-management/sessions/${sessionId}/levels/progression`, fallbackProgression),
      apiGet("/api/admin/logs/audit", fallbackLogs),
    ]);

    const normalizedParticipants = Array.isArray(participantsData)
      ? participantsData.map((participant) => ({
          id: participant.id ?? participant.player_id,
          name: participant.name ?? participant.display_name,
          session: participant.session ?? participant.sessionCode ?? participant.session_code ?? null,
          level: participant.level ?? participant.currentLevel ?? participant.finalRank ?? null,
          status: normalizeStatus(participant.status ?? participant.player_status),
          update: participant.update ?? participant.created_at ?? participant.updatedAt ?? null,
        }))
      : fallbackParticipants;

    const normalizedProgression = Array.isArray(progressionData)
      ? progressionData.map((item, index) => ({
          level: item.level ?? item.roomIndex ?? index + 1,
          label: item.label ?? item.roomName ?? item.name ?? `Stage ${index + 1}`,
          status: normalizeStatus(item.status),
        }))
      : fallbackProgression;

    const normalizedLogs = Array.isArray(logsData) ? logsData : fallbackLogs;

    setParticipants(normalizedParticipants);
    setProgression(normalizedProgression);
    setLogs(normalizedLogs);
  }, []);

  const handleAction = useCallback(async (sessionId, action) => {
    setActionLoading(sessionId);
    try {
      await apiPost(`/api/sessions/${sessionId}/${action}`);
      await fetchAll(true);
    } catch {
      setError(`Action "${action}" failed for ${sessionId}.`);
    } finally {
      setActionLoading(null);
    }
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(() => fetchAll(true), POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchAll]);

  useEffect(() => {
    if (selectedSession) {
      fetchSessionDetail(selectedSession);
    }
  }, [fetchSessionDetail, selectedSession]);

  const selectedSessionObj = sessions.find((session) => session.id === selectedSession);

  const analytics = useMemo(() => {
    const occupancyData = (sessions ?? []).map((session) => {
      const participantsCount = Number(session.participants ?? 0);
      const capacity = Number(session.capacity ?? 8) || 1;

      return {
        id: session.id,
        label: session.name ?? session.id,
        shortLabel: formatAxisLabel(session.name ?? session.id),
        occupancy: Math.min(100, Math.round((participantsCount / capacity) * 100)),
        participants: participantsCount,
        capacity,
        color: COLORS.cherry,
      };
    });

    const participantPool = selectedSession
      ? (participants ?? []).filter((participant) => participant.session === selectedSession)
      : (participants ?? []);

    const participantCounts = participantPool.reduce((accumulator, participant) => {
      const key = normalizeStatus(participant.status);
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});

    const progressionCounts = (progression ?? []).reduce((accumulator, item) => {
      const key = normalizeStatus(item.status);
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});

    const statusBreakdown = [
      { label: "Active", value: participantCounts.Active ?? 0, color: COLORS.jungle },
      { label: "Waiting", value: participantCounts.Waiting ?? 0, color: COLORS.amber },
      { label: "Eliminated", value: participantCounts.Eliminated ?? 0, color: COLORS.raspberry },
      { label: "Finished", value: participantCounts.Finished ?? 0, color: COLORS.stone },
      { label: "Paused", value: participantCounts.Paused ?? 0, color: COLORS.cherry },
    ];

    const progressionBreakdown = [
      { id: "completed", label: "Completed", count: progressionCounts.Finished ?? 0, color: COLORS.jungle },
      { id: "active", label: "Active", count: progressionCounts.Active ?? 0, color: COLORS.cherry },
      { id: "pending", label: "Pending", count: progressionCounts.Waiting ?? progressionCounts.Paused ?? 0, color: COLORS.apricot },
    ];

    return { occupancyData, statusBreakdown, progressionBreakdown };
  }, [participants, progression, selectedSession, sessions]);

  const reportPreviewData = useMemo(() => {
    return {
      participantSummary: analytics.progressionBreakdown.map((item) => ({
        label: item.label,
        value: item.count,
        color: item.color,
      })),
      sessionPerformance: analytics.occupancyData.map((item) => ({
        label: item.shortLabel,
        value: item.occupancy,
        color: item.color,
      })),
      auditHistory: analytics.statusBreakdown.map((item) => ({
        label: item.label,
        value: item.value,
        color: item.color,
      })),
    };
  }, [analytics]);

  const downloadReport = useCallback(async (key, path, fallbackData) => {
    setReportLoading(key);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}${path}`);
      if (!res.ok) throw new Error(`${res.status}`);

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${key}-report.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      const blob = new Blob([JSON.stringify(fallbackData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${key}-report-fallback.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setError("Some reports are still using fallback data because the backend report endpoint is unavailable.");
    } finally {
      setReportLoading(null);
    }
  }, []);

  return (
    <main className={`${styles.page} min-h-screen w-full overflow-x-hidden`}>
      <div className={styles.root}>
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.heroEyebrow}>Monitoring Center</div>
            <h1 className={styles.heroTitle}>Admin Dashboard</h1>
            <div className={styles.heroTitleSub}>Live Oversight & Reporting</div>
            <div className={styles.dividerOrnament}>
              <div className={styles.dividerLine} />
              <div className={styles.dividerDiamond} />
              <div className={styles.dividerLine} />
            </div>
            <p className={styles.heroDesc}>
              Track all active sessions, monitor participant states, follow level progression,
              review administrative actions, and generate historical reports.
            </p>
            <RefreshButton loading={loading} lastRefreshed={lastRefreshed} onRefresh={() => fetchAll()} />
          </div>
          <div className={styles.heroRight}>
            <SummaryCards overview={overview} />
          </div>
        </section>

        <section className={styles.contentGrid}>
          <div className={`${styles.panel} ${styles.panelWide}`}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>Active Sessions</div>
              {loading && <span className={styles.loadingPill}>Syncing...</span>}
            </div>
            <SessionsTable
              sessions={sessions}
              selectedId={selectedSession}
              onSelect={setSelectedSession}
              onAction={handleAction}
              actionLoading={actionLoading}
            />
          </div>

          <div className={`${styles.panel} ${styles.panelWide}`}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>
                Participant Status
                {selectedSessionObj && <span className={styles.panelTitleSub}> - {selectedSessionObj.name ?? selectedSession}</span>}
              </div>
            </div>
            <ParticipantsPanel participants={participants} sessionId={selectedSession} />
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>
                Level Progression
                {selectedSessionObj && <span className={styles.panelTitleSub}> - Round {selectedSessionObj.round ?? "-"}</span>}
              </div>
            </div>
            <ProgressionTimeline progression={progression} />
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>Activity Log</div>
            </div>
            <AuditLog logs={logs} />
          </div>

          <div className={`${styles.panel} ${styles.panelWide}`}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>Analysis & Charts</div>
            </div>
            <AnalyticsPanel
              occupancyData={analytics.occupancyData}
              statusBreakdown={analytics.statusBreakdown}
              progressionBreakdown={analytics.progressionBreakdown}
            />
          </div>

          <div className={`${styles.panel} ${styles.panelWide}`}>
            <div className={styles.panelTitle}>Quick Reports</div>
            <div className={styles.reportCards}>
              <div className={styles.reportCard}>
                <div className={styles.reportLabel}>Participant Progression</div>
                <div className={styles.reportText}>Highest level reached, completion rate, and progress trends.</div>
                <ReportPreviewChart
                  title="Progress Preview"
                  subtitle="Live completion mix"
                  type="pie"
                  data={reportPreviewData.participantSummary}
                  valueFormatter={(value) => `${value} steps`}
                />
                <button
                  type="button"
                  className={`${styles.ctaBtn} ${styles.ctaBtnSecondary} ${styles.reportBtn}`}
                  disabled={reportLoading === "participant-summary"}
                  onClick={() => downloadReport("participant-summary", "/api/admin/reports/participant-summary", {
                    selectedSession,
                    participants,
                    progression,
                  })}
                >
                  {reportLoading === "participant-summary" ? "Generating..." : "Generate"}
                </button>
              </div>
              <div className={styles.reportCard}>
                <div className={styles.reportLabel}>Session Performance</div>
                <div className={styles.reportText}>Overall room performance and completion summary.</div>
                <ReportPreviewChart
                  title="Occupancy Preview"
                  subtitle="Current fill rate"
                  type="bar"
                  data={reportPreviewData.sessionPerformance}
                  valueFormatter={(value) => `${value}%`}
                />
                <button
                  type="button"
                  className={`${styles.ctaBtn} ${styles.ctaBtnSecondary} ${styles.reportBtn}`}
                  disabled={reportLoading === "session-performance"}
                  onClick={() => downloadReport("session-performance", "/api/admin/reports/session-performance", sessions)}
                >
                  {reportLoading === "session-performance" ? "Generating..." : "Generate"}
                </button>
              </div>
              <div className={styles.reportCard}>
                <div className={styles.reportLabel}>Administrative History</div>
                <div className={styles.reportText}>Track actions taken by admins during live operation.</div>
                <ReportPreviewChart
                  title="State Preview"
                  subtitle="Player distribution"
                  type="bar"
                  data={reportPreviewData.auditHistory}
                  valueFormatter={(value) => `${value} players`}
                />
                <button
                  type="button"
                  className={`${styles.ctaBtn} ${styles.ctaBtnSecondary} ${styles.reportBtn}`}
                  disabled={reportLoading === "audit-log"}
                  onClick={() => downloadReport("audit-log", "/api/admin/logs/audit", logs)}
                >
                  {reportLoading === "audit-log" ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AdminDashboard;
