import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./SessionDetailsPage.module.css";
import { useAdminRealtime } from "../hooks/useAdminRealtime";
import { getAuthHeaders } from "../lib/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const REQUEST_TIMEOUT_MS = 5000;
const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

function formatDateTime(value) {
  if (!value) return "-";

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

function formatDuration(start, end) {
  if (!start) return "-";

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "-";
  }

  const totalSeconds = Math.max(0, Math.floor((endDate - startDate) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function normalizeStatus(value) {
  return (value || "Unknown").toString().trim();
}

function statusTone(status) {
  const normalized = normalizeStatus(status).toLowerCase();

  if (["active", "live", "running", "in progress"].includes(normalized)) return "active";
  if (["finished", "completed", "done"].includes(normalized)) return "finished";
  if (["paused", "on hold"].includes(normalized)) return "paused";
  if (["cancelled", "terminated", "stopped"].includes(normalized)) return "cancelled";
  if (["eliminated", "out"].includes(normalized)) return "eliminated";
  if (["checked-in", "checked in", "ready"].includes(normalized)) return "ready";

  return "default";
}

function getSessionCodeFromPath() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const rawValue = segments[1] || segments[0] || "";
  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

async function fetchJson(path) {
  return requestJson(path);
}

async function requestJson(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
      method: options.method || "GET",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Backend did not respond at ${API_BASE}. Make sure the backend server is running.`);
    }
    if (error instanceof TypeError) {
      throw new Error(`Could not reach backend at ${API_BASE}. Make sure the backend server is running.`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchJsonOrDefault(path, fallback) {
  try {
    return await fetchJson(path);
  } catch {
    return fallback;
  }
}

function sameSessionCode(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function matchesSessionIdentifier(entry, identifier) {
  const normalizedIdentifier = String(identifier || "").trim().toLowerCase();

  if (!normalizedIdentifier) return false;

  return sameSessionCode(entry.id ?? entry.sessionCode, normalizedIdentifier)
    || String(entry.sessionId ?? "").trim() === String(identifier || "").trim();
}

function mapParticipant(participant) {
  return {
    id: participant.id ?? participant.playerId ?? participant.player_id ?? participant.participantId ?? "-",
    name: participant.name ?? participant.playerName ?? participant.display_name ?? participant.fullName ?? null,
    session: participant.session ?? participant.sessionCode ?? participant.session_code ?? null,
    status: participant.status ?? participant.playerStatus ?? (participant.isAlive === false ? "Eliminated" : participant.isAlive === true ? "Active" : "Unknown"),
    currentLevel: participant.currentLevel ?? participant.currentRoom ?? participant.level ?? participant.room ?? null,
    rank: participant.finalRank ?? participant.rank ?? null,
    updatedAt: participant.updatedAt ?? participant.lastUpdate ?? participant.lastSeenAt ?? participant.joinedAt ?? participant.update ?? null,
  };
}

function mapProgressionRoom(room, index) {
  return {
    id: room.sessionRoomId ?? room.roomId ?? room.id ?? index,
    name: room.roomName ?? room.name ?? room.title ?? `Step ${index + 1}`,
    status: room.roomStatus ?? room.status ?? room.state ?? "Unknown",
    startedAt: room.startedAt ?? room.startTime ?? null,
    endedAt: room.endedAt ?? room.endTime ?? null,
    minimumEliminationsRequired: room.minEliminationsToUnlock ?? room.minimumEliminationsRequired ?? room.requiredEliminations ?? null,
    difficultyLevel: room.difficultyLevel ?? null,
  };
}

function mapAuditLog(log) {
  return {
    id: log.auditId ?? log.logId ?? log.id ?? `${log.actionTime}-${log.actionType}`,
    timestamp: log.actionTime ?? log.createdAt ?? log.time ?? null,
    actorName: log.managerUsername ?? log.admin ?? log.actorName ?? log.user ?? "System",
    action: log.actionType ?? log.action ?? log.message ?? "performed an action",
    target: log.sessionId ? `Session ${log.sessionId}` : log.target ?? log.entity ?? log.targetName ?? null,
    sessionId: log.sessionId ?? null,
  };
}

function formatAuditActor(value) {
  const actor = String(value || "System").trim();
  if (!actor) return "System";

  return actor
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAuditAction(value) {
  const action = String(value || "performed an action").trim();
  if (!action) return "performed an action";

  const normalized = action
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const actionMap = {
    create_session: "created a session",
    start_session: "started the session",
    finish_session: "finished the session",
    pause_session: "paused the session",
    resume_session: "resumed the session",
    cancel_session: "cancelled the session",
    terminate_session: "terminated the session",
    eliminate_player: "eliminated a player",
    update_player_status: "updated a player status",
    log_event: "logged an event",
  };

  if (actionMap[normalized]) {
    return actionMap[normalized];
  }

  const readable = normalized
    .split("_")
    .filter(Boolean)
    .join(" ");

  if (!readable) {
    return "performed an action";
  }

  return readable.endsWith("ed") ? readable : `performed ${readable}`;
}

function formatAuditTarget(value) {
  const target = String(value || "").trim();
  if (!target) return "";

  return target.replace(/^session\s+/i, "Session ");
}

function formatMetricLabel(key) {
  const labels = {
    remainingPlayers: "Remaining Players",
    alivePlayers: "Alive Players",
    eliminatedPlayers: "Eliminated Players",
    overallScore: "Overall Score",
    completionRate: "Completion Rate",
    survivalRate: "Survival Rate",
    challengeTriggerRate: "Challenge Trigger Rate",
    averagePacePercent: "Average Pace Percent",
    finishReason: "Finish Reason",
  };

  return labels[key]
    || key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMetricValue(key, value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (["completionRate", "survivalRate", "challengeTriggerRate", "averagePacePercent"].includes(key)) {
    return `${value}%`;
  }

  if (key === "overallScore" && typeof value === "number") {
    return value.toFixed(2);
  }

  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function isBackendOfflineError(message) {
  const normalized = String(message || "").toLowerCase();
  return normalized.includes("could not reach backend")
    || normalized.includes("backend did not respond")
    || normalized.includes("make sure the backend server is running");
}

function SessionDetailsPage() {
  const sessionCode = getSessionCodeFromPath();
  const timelineRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [timelineMaxHeight, setTimelineMaxHeight] = useState(null);
  const [bundle, setBundle] = useState({
    session: null,
    participants: [],
    progression: [],
    logs: [],
    metrics: null,
    source: "unknown",
  });
  const [actionLoading, setActionLoading] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const backendOffline = isBackendOfflineError(error);

  const loadSessionDetails = useCallback(async ({ silent = false } = {}) => {
    if (!sessionCode) {
      setError("No session ID was found in the URL.");
      setLoading(false);
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const dashboardSessions = await fetchJson("/api/admin/dashboard/sessions");
      const sessionEntry = (Array.isArray(dashboardSessions) ? dashboardSessions : []).find((entry) =>
        matchesSessionIdentifier(entry, sessionCode),
      );

      const parsedSessionIdFromUrl = Number(sessionCode);
      const numericSessionIdFromUrl = Number.isInteger(parsedSessionIdFromUrl) && parsedSessionIdFromUrl > 0
        ? parsedSessionIdFromUrl
        : null;

      const resolvedSessionEntry = sessionEntry || (numericSessionIdFromUrl
        ? {
            id: sessionCode,
            sessionId: numericSessionIdFromUrl,
            status: "Unknown",
            participants: null,
            room: null,
          }
        : null);

      if (!resolvedSessionEntry) {
        throw new Error(`No backend session matched "${sessionCode}".`);
      }

      const numericSessionId = Number(resolvedSessionEntry.sessionId);
      if (!Number.isFinite(numericSessionId) || numericSessionId <= 0) {
        throw new Error(`Session "${sessionCode}" does not have a valid backend session ID.`);
      }

      const [
        adminSessionData,
        sessionPerformanceReport,
        participantsData,
        auditLogsData,
        progressionData,
        syncStateData,
        performanceFlowData,
      ] = await Promise.all([
        fetchJsonOrDefault(`/api/session-administration/sessions/${numericSessionId}`, null),
        fetchJsonOrDefault("/api/admin/reports/session-performance", []),
        fetchJsonOrDefault("/api/admin/dashboard/participants", []),
        fetchJsonOrDefault("/api/admin/logs/audit", []),
        fetchJsonOrDefault(`/api/game-management/sessions/${numericSessionId}/levels/progression`, null),
        fetchJsonOrDefault(`/api/game-management/sessions/${numericSessionId}/state/sync`, null),
        fetchJsonOrDefault(`/api/game-management/sessions/${numericSessionId}/performance/flow`, null),
      ]);

      const performanceEntry = (Array.isArray(sessionPerformanceReport) ? sessionPerformanceReport : []).find((entry) =>
        Number(entry.sessionId) === numericSessionId || sameSessionCode(entry.sessionCode, sessionCode),
      );

      const rawParticipants = Array.isArray(syncStateData?.participants) && syncStateData.participants.length > 0
        ? syncStateData.participants
        : (Array.isArray(participantsData) ? participantsData : []).filter((participant) =>
            sameSessionCode(participant.session ?? participant.sessionCode ?? participant.session_code, sessionCode),
          );

      const participants = rawParticipants.map(mapParticipant);

      const rawProgression = Array.isArray(progressionData?.rooms) && progressionData.rooms.length > 0
        ? progressionData.rooms
        : Array.isArray(syncStateData?.rooms)
          ? syncStateData.rooms
          : [];

      const progression = rawProgression.map(mapProgressionRoom);

      const logs = (Array.isArray(auditLogsData) ? auditLogsData : [])
        .filter((log) => Number(log.sessionId) === numericSessionId)
        .map(mapAuditLog);

      const currentRoom = progressionData?.currentRoom || syncStateData?.currentRoom || null;
      const latestLog = logs[0] ?? null;
      const perfSummary = performanceFlowData?.summary ?? null;
      const adminSession = adminSessionData?.session ?? null;

      const session = {
        session_id: numericSessionId,
        sessionCode: adminSession?.sessionCode ?? resolvedSessionEntry.id ?? sessionCode,
        name: resolvedSessionEntry.name ?? `Session ${adminSession?.sessionCode ?? resolvedSessionEntry.id ?? sessionCode}`,
        status:
          adminSession?.status
          ?? resolvedSessionEntry.status
          ?? performanceEntry?.status
          ?? progressionData?.sessionStatus
          ?? syncStateData?.sessionStatus
          ?? "Unknown",
        room: resolvedSessionEntry.room ?? currentRoom?.roomName ?? null,
        currentRoom: currentRoom?.roomName ?? null,
        currentLevel: currentRoom?.roomName || (currentRoom?.difficultyLevel ? `Level ${currentRoom.difficultyLevel}` : null),
        createdAt: performanceEntry?.createdAt ?? null,
        minPlayers: adminSession?.minPlayers ?? null,
        maxPlayers: adminSession?.maxPlayers ?? null,
        startedAt: performanceEntry?.startedAt ?? performanceFlowData?.startedAt ?? syncStateData?.timer?.startedAt ?? null,
        endedAt: performanceEntry?.endedAt ?? performanceFlowData?.endedAt ?? syncStateData?.timer?.endedAt ?? null,
        updatedAt: latestLog?.timestamp ?? null,
        capacity: adminSession?.maxPlayers ?? resolvedSessionEntry.capacity ?? null,
        attendance: performanceEntry?.totalPlayers ?? resolvedSessionEntry.participants ?? participants.length,
        totalParticipants: performanceEntry?.totalPlayers ?? resolvedSessionEntry.participants ?? participants.length,
        checkedInCount: performanceEntry?.alivePlayers ?? perfSummary?.aliveCount ?? null,
        assignedAdmin: latestLog?.actorName ?? null,
      };

      const metrics = {
        sourceSessionId: numericSessionId,
        remainingPlayers: progressionData?.remainingPlayers ?? null,
        alivePlayers: performanceEntry?.alivePlayers ?? perfSummary?.aliveCount ?? null,
        eliminatedPlayers: performanceEntry?.eliminatedPlayers ?? perfSummary?.eliminatedCount ?? null,
        overallScore: perfSummary?.overallScore ?? null,
        completionRate: perfSummary?.completionRate ?? null,
        survivalRate: perfSummary?.survivalRate ?? null,
        challengeTriggerRate: perfSummary?.challengeTriggerRate ?? null,
        averagePacePercent: perfSummary?.averagePacePercent ?? null,
        finishReason: syncStateData?.finishConditions?.finishReason ?? null,
        isFinished: syncStateData?.finishConditions?.isFinished ?? null,
        shouldFinish: syncStateData?.finishConditions?.shouldFinish ?? null,
      };

      setBundle({
        session,
        participants,
        progression,
        logs,
        metrics,
        source: "admin-dashboard + game-management",
      });
    } catch (loadError) {
      setError(loadError.message || "Failed to load session details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionCode]);

  useEffect(() => {
    loadSessionDetails();
  }, [loadSessionDetails]);

  const liveSessionId = bundle.metrics?.sourceSessionId ?? bundle.session?.session_id ?? null;

  const handleRealtimeUpdate = useCallback((event) => {
    const eventSessionId = Number(event?.sessionId);

    if (!Number.isFinite(eventSessionId) || !liveSessionId || eventSessionId === Number(liveSessionId)) {
      loadSessionDetails({ silent: true });
    }
  }, [liveSessionId, loadSessionDetails]);

  useAdminRealtime({
    enabled: true,
    sessionId: liveSessionId,
    onUpdate: handleRealtimeUpdate,
  });

  const session = useMemo(() => bundle.session ?? EMPTY_OBJECT, [bundle.session]);
  const participants = useMemo(
    () => (Array.isArray(bundle.participants) ? bundle.participants : EMPTY_ARRAY),
    [bundle.participants]
  );
  const progression = useMemo(
    () => (Array.isArray(bundle.progression) ? bundle.progression : EMPTY_ARRAY),
    [bundle.progression]
  );
  const logs = useMemo(
    () => (Array.isArray(bundle.logs) ? bundle.logs : EMPTY_ARRAY),
    [bundle.logs]
  );
  const numericSessionId = Number(session.session_id || session.sessionId || bundle.metrics?.sourceSessionId);
  const hasValidSessionId = Number.isFinite(numericSessionId) && numericSessionId > 0;

  useEffect(() => {
    if (!timelineRef.current || progression.length <= 3) {
      setTimelineMaxHeight(null);
      return undefined;
    }

    const updateTimelineHeight = () => {
      const node = timelineRef.current;
      if (!node) return;

      const items = Array.from(node.children).slice(0, 3);
      if (items.length < 3) {
        setTimelineMaxHeight(null);
        return;
      }

      const rowGap = Number.parseFloat(window.getComputedStyle(node).rowGap || "0");
      const totalHeight = items.reduce((sum, item) => sum + item.getBoundingClientRect().height, 0) + (rowGap * 2);
      setTimelineMaxHeight(Math.ceil(totalHeight));
    };

    updateTimelineHeight();

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => updateTimelineHeight())
      : null;

    if (resizeObserver) {
      resizeObserver.observe(timelineRef.current);
      Array.from(timelineRef.current.children).slice(0, 3).forEach((child) => resizeObserver.observe(child));
    } else {
      window.addEventListener("resize", updateTimelineHeight);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", updateTimelineHeight);
      }
    };
  }, [progression]);

  const computed = useMemo(() => {
    const activeParticipants = participants.filter((participant) =>
      ["active", "checked-in", "checked in", "ready", "survivedroom"].includes(
        normalizeStatus(participant.status).toLowerCase(),
      ),
    ).length;

    const eliminatedParticipants = participants.filter((participant) =>
      ["eliminated", "out", "eliminatedinthisroom"].includes(
        normalizeStatus(participant.status).toLowerCase(),
      ),
    ).length;

    const currentStep =
      progression.find((item) =>
        ["active", "current", "in progress", "unlocked"].includes(
          normalizeStatus(item.status).toLowerCase(),
        ),
      ) || null;

    const completedCount = progression.filter((item) =>
      ["finished", "completed", "done"].includes(
        normalizeStatus(item.status).toLowerCase(),
      ),
    ).length;

    return {
      totalParticipants:
        session.totalParticipants ||
        session.playerCount ||
        session.participantCount ||
        participants.length ||
        0,
      activeParticipants,
      eliminatedParticipants,
      completedCount,
      currentStep,
    };
  }, [participants, progression, session]);

  const metricsEntries = useMemo(() => {
    if (!bundle.metrics || typeof bundle.metrics !== "object") return [];

    const preferredOrder = [
      "remainingPlayers",
      "alivePlayers",
      "eliminatedPlayers",
      "overallScore",
      "completionRate",
      "survivalRate",
      "challengeTriggerRate",
      "averagePacePercent",
      "finishReason",
    ];

    return preferredOrder
      .filter((key) => {
        const value = bundle.metrics[key];
        if (value === null || value === undefined || value === "") return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
          return false;
        }
        return true;
      })
      .map((key) => [key, bundle.metrics[key]]);
  }, [bundle.metrics]);

  const normalizedSessionStatus = normalizeStatus(session.status || session.state || session.currentState).toLowerCase();
  const canTerminateSession = ["lobby", "active", "paused"].includes(normalizedSessionStatus);
  const canDeleteSession = ["lobby", "finished", "cancelled", "terminated"].includes(normalizedSessionStatus);

  const clearActionMessages = useCallback(() => {
    setActionError("");
    setActionSuccess("");
  }, []);

  const runSessionAction = useCallback(
    async ({ path, method, body, successMessage, onSuccess }) => {
      if (!hasValidSessionId) {
        setActionError("Could not resolve a valid session ID.");
        return;
      }

      clearActionMessages();
      setActionLoading(path);

      try {
        const response = await requestJson(path, { method, body });
        setActionSuccess(successMessage);
        if (typeof onSuccess === "function") {
          await onSuccess(response);
        } else {
          await loadSessionDetails({ silent: true });
        }
      } catch (actionErr) {
        setActionError(actionErr?.message || "Session action failed.");
      } finally {
        setActionLoading("");
      }
    },
    [clearActionMessages, hasValidSessionId, loadSessionDetails],
  );

  const handleTerminateSession = async () => {
    if (!window.confirm("Terminate this session now?")) {
      return;
    }

    await runSessionAction({
      path: `/api/session-administration/sessions/${numericSessionId}/terminate`,
      method: "POST",
      successMessage: "Session terminated.",
    });
  };

  const handleDeleteSession = async () => {
    if (!window.confirm("Delete this session permanently? This cannot be undone.")) {
      return;
    }

    await runSessionAction({
      path: `/api/session-administration/sessions/${numericSessionId}`,
      method: "DELETE",
      successMessage: "Session removed successfully.",
      onSuccess: async () => {
        window.location.href = "/sessions";
      },
    });
  };

  const pageTitle =
    session.name ||
    session.title ||
    session.sessionName ||
    `Session ${session.sessionCode || session.session_id || sessionCode}`;

  const sessionStatus = session.status || session.sessionStatus || session.state || "Unknown";

  const currentLevelLabel =
    computed.currentStep?.name ||
    computed.currentStep?.title ||
    computed.currentStep?.levelName ||
    computed.currentStep?.roomName ||
    session.currentLevel ||
    session.currentRoom ||
    "-";

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        {backendOffline && (
          <div className={styles.backendBanner} role="alert">
            <div className={styles.backendBannerTitle}>Backend offline</div>
            <div className={styles.backendBannerText}>
              Session details could not load because the API at <strong>{API_BASE}</strong> is not reachable.
              Start the backend server and refresh this page.
            </div>
          </div>
        )}

        <div className={styles.headerCard}>
          <div className={styles.headerTopRow}>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => window.history.back()}
            >
              ← Back
            </button>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => loadSessionDetails({ silent: true })}
                disabled={refreshing}
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                className={styles.warnButton}
                disabled={!canTerminateSession || Boolean(actionLoading)}
                onClick={handleTerminateSession}
              >
                Terminate
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                disabled={!canDeleteSession || Boolean(actionLoading)}
                onClick={handleDeleteSession}
              >
                Delete
              </button>
            </div>
          </div>

          <div className={styles.headerMain}>
            <div>
              <p className={styles.eyebrow}>Session details</p>
              <h1 className={styles.title}>{pageTitle}</h1>
              <div className={styles.metaRow}>
                <span className={`${styles.statusBadge} ${styles[statusTone(sessionStatus)]}`}>
                  {normalizeStatus(sessionStatus)}
                </span>
                <span className={styles.metaItem}>
                  {session.sessionCode || session.bookingIdentifier || sessionCode}
                </span>
                <span className={styles.metaItem}>
                  {formatDateTime(
                    session.date ||
                      session.scheduledAt ||
                      session.startTime ||
                      session.createdAt,
                  )}
                </span>
                {(session.sessionType || session.type || session.room) && (
                  <span className={styles.metaItem}>
                    {session.sessionType || session.type || session.room}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.headerSummary}>
              <div className={styles.summaryMini}>
                <span className={styles.summaryMiniLabel}>Elapsed</span>
                <strong>
                  {formatDuration(
                    session.startedAt || session.startTime,
                    session.endedAt || session.endTime,
                  )}
                </strong>
              </div>
              <div className={styles.summaryMini}>
                <span className={styles.summaryMiniLabel}>Current level</span>
                <strong>{currentLevelLabel}</strong>
              </div>
              <div className={styles.summaryMini}>
                <span className={styles.summaryMiniLabel}>Last update</span>
                <strong>
                  {formatDateTime(session.updatedAt || session.lastUpdatedAt)}
                </strong>
              </div>
            </div>
          </div>
        </div>
        {actionError ? <div className={styles.stateCardError}>{actionError}</div> : null}
        {actionSuccess ? <div className={styles.stateCard}>{actionSuccess}</div> : null}

        {loading ? (
          <div className={styles.stateCard}>Loading session details...</div>
        ) : error ? (
          <div className={styles.stateCardError}>{error}</div>
        ) : !bundle.session ? (
          <div className={styles.stateCard}>No session data found.</div>
        ) : (
          <>
            <section className={styles.statsGrid}>
              <article className={styles.statCard}>
                <p className={styles.statLabel}>Total participants</p>
                <h2 className={styles.statValue}>{computed.totalParticipants}</h2>
              </article>
              <article className={styles.statCard}>
                <p className={styles.statLabel}>Active participants</p>
                <h2 className={styles.statValue}>{computed.activeParticipants}</h2>
              </article>
              <article className={styles.statCard}>
                <p className={styles.statLabel}>Eliminated</p>
                <h2 className={styles.statValue}>{computed.eliminatedParticipants}</h2>
              </article>
              <article className={styles.statCard}>
                <p className={styles.statLabel}>Completed levels</p>
                <h2 className={styles.statValue}>{computed.completedCount}</h2>
              </article>
              <article className={styles.statCard}>
                <p className={styles.statLabel}>Current level</p>
                <h2 className={styles.statValueSmall}>{currentLevelLabel}</h2>
              </article>

            </section>

            <section className={styles.contentGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3>Session Information</h3>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Booking / Session ID</span>
                    <span className={styles.detailValue}>
                      {session.bookingIdentifier ||
                        session.sessionCode ||
                        session.session_id ||
                        sessionCode}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>State</span>
                    <span className={styles.detailValue}>{normalizeStatus(sessionStatus)}</span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Created</span>
                    <span className={styles.detailValue}>
                      {formatDateTime(session.createdAt)}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Started</span>
                    <span className={styles.detailValue}>
                      {formatDateTime(session.startedAt || session.startTime)}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Ended</span>
                    <span className={styles.detailValue}>
                      {formatDateTime(session.endedAt || session.endTime)}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Capacity / Attendance</span>
                    <span className={styles.detailValue}>
                      {session.capacity || session.maxCapacity || "-"} /{" "}
                      {session.attendance ||
                        session.checkedInCount ||
                        computed.totalParticipants}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Assigned admin</span>
                    <span className={styles.detailValue}>
                      {session.managerName ||
                        session.adminName ||
                        session.assignedAdmin ||
                        session.manager_id ||
                        "-"}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Last updated</span>
                    <span className={styles.detailValue}>
                      {formatDateTime(session.updatedAt || session.lastUpdatedAt)}
                    </span>
                  </div>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3>Level / Room Progression</h3>
                </div>

                {progression.length === 0 ? (
                  <p className={styles.emptyText}>No progression data available.</p>
                ) : (
                  <div
                    ref={timelineRef}
                    className={`${styles.timeline} ${
                      progression.length > 3 ? styles.timelineScrollable : ""
                    }`}
                    style={timelineMaxHeight ? { maxHeight: `${timelineMaxHeight}px` } : undefined}
                  >
                    {progression.map((item, index) => {
                      const itemStatus = item.status || item.state || "Unknown";
                      return (
                        <div key={item.id || item.levelId || item.roomId || index} className={styles.timelineItem}>
                          <div className={styles.timelineMarker} />
                          <div className={styles.timelineContent}>
                            <div className={styles.timelineTop}>
                              <strong>
                                {item.name ||
                                  item.title ||
                                  item.levelName ||
                                  item.roomName ||
                                  `Step ${index + 1}`}
                              </strong>
                              <span className={`${styles.statusBadgeSmall} ${styles[statusTone(itemStatus)]}`}>
                                {normalizeStatus(itemStatus)}
                              </span>
                            </div>
                            <div className={styles.timelineMeta}>
                              <span>
                                Started: {formatDateTime(item.startedAt || item.startTime)}
                              </span>
                              <span>
                                Ended: {formatDateTime(item.endedAt || item.endTime)}
                              </span>
                              <span>
                                Min eliminations:{" "}
                                {item.minimumEliminationsRequired ??
                                  item.requiredEliminations ??
                                  "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className={`${styles.panel} ${styles.fullWidth}`}>
                <div className={styles.panelHeader}>
                  <h3>Participant Status</h3>
                </div>

                {participants.length === 0 ? (
                  <p className={styles.emptyText}>No participant data available.</p>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Participant</th>
                          <th>ID</th>
                          <th>Current level</th>
                          <th>Status</th>
                          <th>Rank</th>
                          <th>Last update</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map((participant, index) => {
                          const participantStatus = participant.status || "Unknown";

                          return (
                            <tr key={participant.id || participant.playerId || participant.participantId || index}>
                              <td>
                                {participant.name ||
                                  participant.fullName ||
                                  participant.playerName ||
                                  `Participant ${index + 1}`}
                              </td>
                              <td>
                                {participant.participantId ||
                                  participant.playerId ||
                                  participant.id ||
                                  "-"}
                              </td>
                              <td>
                                {participant.currentLevel ||
                                  participant.currentRoom ||
                                  participant.level ||
                                  participant.room ||
                                  "-"}
                              </td>
                              <td>
                                <span className={`${styles.statusBadgeSmall} ${styles[statusTone(participantStatus)]}`}>
                                  {normalizeStatus(participantStatus)}
                                </span>
                              </td>
                              <td>{participant.finalRank || participant.rank || "-"}</td>
                              <td>
                                {formatDateTime(
                                  participant.updatedAt ||
                                    participant.lastUpdate ||
                                    participant.lastSeenAt,
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3>Activity / Audit Log</h3>
                </div>

                {logs.length === 0 ? (
                  <p className={styles.emptyText}>No activity log entries available.</p>
                ) : (
                  <div className={styles.logList}>
                    {logs.map((log, index) => (
                      <div
                        key={log.id || log.logId || log.auditId || index}
                        className={styles.logItem}
                      >
                        <div className={styles.logHeaderRow}>
                          <div className={styles.logTime}>
                            {formatDateTime(log.timestamp || log.createdAt || log.time)}
                          </div>
                          {(log.target || log.entity || log.targetName) && (
                            <span className={styles.logTarget}>
                              {formatAuditTarget(log.target || log.entity || log.targetName)}
                            </span>
                          )}
                        </div>

                        <div className={styles.logEvent}>
                          <strong className={styles.logActor}>
                            {formatAuditActor(
                              log.actorName ||
                                log.admin ||
                                log.actorId ||
                                log.user ||
                                "System",
                            )}
                          </strong>
                          <span className={styles.logAction}>
                            {formatAuditAction(
                              log.action ||
                                log.description ||
                                log.message ||
                                "performed an action",
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3>Metrics Summary</h3>
                </div>

                {metricsEntries.length === 0 ? (
                  <p className={styles.emptyText}>No metrics available from backend.</p>
                ) : (
                  <div className={styles.metricsGrid}>
                    {metricsEntries.map(([key, value]) => (
                      <div key={key} className={styles.metricCard}>
                        <span className={styles.metricKey}>{formatMetricLabel(key)}</span>
                        <strong className={styles.metricValue}>
                          {formatMetricValue(key, value)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

export default SessionDetailsPage;
