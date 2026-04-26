import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./BookSessionPage.module.css";

const API_BASE = import.meta.env?.VITE_API_URL ?? "http://localhost:4000";
const REFRESH_INTERVAL_MS = 10000;

function getSessionIdFromPath() {
  const match = window.location.pathname.match(/\/book\/([^/]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

async function apiFetch(path, fallback = null) {
  try {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`[BookSessionPage] API fetch failed for ${path}:`, error.message);
    return fallback;
  }
}

function formatDateTime(value) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatus(status) {
  return String(status || "Unknown").trim();
}

function statusTone(status) {
  const normalized = normalizeStatus(status).toLowerCase();
  if (["open", "booking open", "lobby"].includes(normalized)) return "open";
  if (["upcoming", "scheduled"].includes(normalized)) return "upcoming";
  if (["active", "live", "running"].includes(normalized)) return "active";
  if (["finished", "completed"].includes(normalized)) return "finished";
  if (["paused"].includes(normalized)) return "paused";
  if (["cancelled"].includes(normalized)) return "cancelled";
  return "waiting";
}

function romanize(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return String(value ?? "");

  const numerals = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let remaining = num;
  let output = "";
  numerals.forEach(([amount, symbol]) => {
    while (remaining >= amount) {
      output += symbol;
      remaining -= amount;
    }
  });
  return output;
}

function StatusBadge({ status }) {
  return (
    <span className={`${styles.statusBadge} ${styles[statusTone(status)]}`}>
      {normalizeStatus(status)}
    </span>
  );
}

function SummaryCard({ label, value, hint }) {
  return (
    <article className={styles.summaryCard}>
      <div className={styles.summaryLabel}>{label}</div>
      <div className={styles.summaryValue}>{value}</div>
      {hint ? <div className={styles.summaryHint}>{hint}</div> : null}
    </article>
  );
}

export default function BookSessionPage() {
  const requestedSessionId = getSessionIdFromPath();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [sessionPerformance, setSessionPerformance] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(requestedSessionId);
  const [formState, setFormState] = useState({
    managerName: "",
    sessionDate: "",
    startTime: "",
    capacity: "8",
    visibility: "Public Watch Listing",
    operatorName: "",
    notes: "",
  });
  const [submitMessage, setSubmitMessage] = useState("");

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    const [sessionsRes, performanceRes] = await Promise.all([
      apiFetch("/api/admin/dashboard/sessions", []),
      apiFetch("/api/admin/reports/session-performance", []),
    ]);

    if (!Array.isArray(sessionsRes) || sessionsRes.length === 0) {
      setError("No sessions were returned from the backend.");
      setLoading(false);
      return;
    }

    setSessions(sessionsRes);
    setSessionPerformance(Array.isArray(performanceRes) ? performanceRes : []);

    const requestedMatch = sessionsRes.find(
      (session) => String(session.sessionId) === String(requestedSessionId || ""),
    );

    const preferredSession =
      requestedMatch ||
      sessionsRes.find((session) => {
        const tone = statusTone(session.status);
        return tone === "upcoming" || tone === "open";
      }) ||
      sessionsRes[0];

    setSelectedSessionId(String(preferredSession.sessionId));
    setLoading(false);
  }, [requestedSessionId]);

  useEffect(() => {
    loadPage();
    const intervalId = window.setInterval(loadPage, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [loadPage]);

  useEffect(() => {
    if (!selectedSessionId) return;
    window.history.replaceState({}, "", `/book/${encodeURIComponent(selectedSessionId)}`);
  }, [selectedSessionId]);

  const selectedSession = useMemo(
    () =>
      sessions.find((session) => String(session.sessionId) === String(selectedSessionId || "")) ?? null,
    [sessions, selectedSessionId],
  );

  const selectedPerformance = useMemo(
    () =>
      sessionPerformance.find((entry) => String(entry.sessionId) === String(selectedSessionId || "")) ?? null,
    [sessionPerformance, selectedSessionId],
  );

  const selectedSessionCode = useMemo(
    () => romanize(selectedSession?.sessionId ?? selectedSessionId ?? ""),
    [selectedSession?.sessionId, selectedSessionId],
  );

  const registeredParticipants = Number(
    selectedPerformance?.totalPlayers ??
    selectedSession?.totalPlayers ??
    selectedSession?.currentPlayers ??
    0,
  );

  const scheduledCount = sessions.filter((session) => {
    const tone = statusTone(session.status);
    return tone === "upcoming" || tone === "open";
  }).length;

  const liveCount = sessions.filter((session) => statusTone(session.status) === "active").length;

  const visibleToViewersCount = sessions.filter((session) => {
    const tone = statusTone(session.status);
    return tone === "upcoming" || tone === "open" || tone === "active";
  }).length;

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
    setSubmitMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    /*
      TODO: Missing backend API - create or schedule a new session
      Endpoint needed : POST /api/session-administration/sessions
      Method          : POST
      Expected body   : {
                          scheduledDate: string,
                          scheduledTime: string,
                          capacity: number,
                          visibility: "Public Watch Listing" | "Private Preview",
                          managerName: string,
                          operatorName?: string,
                          notes?: string,
                          basedOnSessionId?: number
                        }
      Expected shape  : {
                          sessionId: number,
                          status: "Lobby" | "Upcoming",
                          message: string,
                          session: {
                            sessionId: number,
                            createdAt: string,
                            status: string,
                            capacity: number
                          }
                        }
      Used in         : handleSubmit in BookSessionPage.jsx
      Module          : backend/src/modules/SessionAdminstration/session.routes.js
    */

    setSubmitMessage(
      "Scheduling UI is ready. Add the backend create-session endpoint so new sessions appear in Sessions immediately and become watchable once they go live.",
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.headerCard}>
          <div>
            <div className={styles.eyebrow}>Session Administration</div>
            <h1 className={styles.title}>Schedule a New Session</h1>
            <div className={styles.headerMeta}>
              <span className={styles.metaText}>
                Plan the next arena before the gates open.
              </span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <a href="/sessions" className={styles.secondaryButton}>All Sessions</a>
          </div>
        </header>

        {error ? (
          <div className={styles.stateCard}>{error}</div>
        ) : loading ? (
          <div className={styles.stateCard}>Loading scheduling deck...</div>
        ) : (
          <>
            <section className={styles.formSection}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <div className={styles.panelTitle}>Create / Schedule Session</div>
                    <div className={styles.panelSub}>Manager-facing form for preparing the next arena</div>
                  </div>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Manager Name</span>
                    <input
                      className={styles.input}
                      name="managerName"
                      value={formState.managerName}
                      onChange={handleFormChange}
                      placeholder="Enter the responsible manager"
                      required
                    />
                  </label>

                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Session Date</span>
                      <input
                        className={styles.input}
                        type="date"
                        name="sessionDate"
                        value={formState.sessionDate}
                        onChange={handleFormChange}
                        required
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Start Time</span>
                      <input
                        className={styles.input}
                        type="time"
                        name="startTime"
                        value={formState.startTime}
                        onChange={handleFormChange}
                        required
                      />
                    </label>
                  </div>

                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Capacity</span>
                      <select
                        className={styles.input}
                        name="capacity"
                        value={formState.capacity}
                        onChange={handleFormChange}
                      >
                        {["4", "6", "8", "10", "12"].map((value) => (
                          <option key={value} value={value}>{value} participants</option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Visibility</span>
                      <select
                        className={styles.input}
                        name="visibility"
                        value={formState.visibility}
                        onChange={handleFormChange}
                      >
                        <option value="Public Watch Listing">Public Watch Listing</option>
                        <option value="Private Preview">Private Preview</option>
                      </select>
                    </label>
                  </div>

                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Assigned Operator</span>
                      <input
                        className={styles.input}
                        name="operatorName"
                        value={formState.operatorName}
                        onChange={handleFormChange}
                        placeholder="Optional operator or admin name"
                      />
                    </label>

                  </div>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Manager Notes</span>
                    <textarea
                      className={`${styles.input} ${styles.textarea}`}
                      name="notes"
                      value={formState.notes}
                      onChange={handleFormChange}
                      placeholder="Notes about timing, visibility, staffing, or special setup"
                    />
                  </label>

                  <div className={styles.formFoot}>
                    <div className={styles.formHint}>
                      Once the backend create-session API is connected, new sessions from this form should appear in `Sessions` immediately and become watchable when they transition live.
                    </div>
                    <button type="submit" className={styles.primaryButton}>
                      Create Session
                    </button>
                  </div>

                  {submitMessage ? <div className={styles.notice}>{submitMessage}</div> : null}
                </form>
              </article>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
