/**
 * LiveWatchPage.jsx
 * Path: frontend/shutterisland/src/pages/LiveWatchPage.jsx
 *
 * Viewer-facing live watch page. Shows the session stream, live stats,
 * participants, eliminations feed, level progression, and betting summary.
 * MISSING ENDPOINTS (TODO comments placed at exact usage points below):
 *   1. Live stream URL / stream metadata
 *   2. Active session participants list (session_player records)
 *   3. Betting summary for a session
 *   4. Session list to find the "current live" session without knowing its ID
 * ────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./LiveWatchPage.module.css";

/* ─── CONFIG ─────────────────────────────────────────────── */
const API_BASE = import.meta.env?.VITE_API_URL ?? "http://localhost:4000";
const POLL_INTERVAL_MS = 5000;

/* ─── HELPERS ────────────────────────────────────────────── */
const getSessionId = () => {
  // Works for both Hash router (/watch/:id) and path-based router
  const hash = window.location.hash;
  const path = window.location.pathname;

  // Try /watch/123 or #/watch/123
  const match =
    hash.match(/\/watch\/(\d+)/) ||
    path.match(/\/watch\/(\d+)/);

  return match ? match[1] : null;
};

async function apiFetch(path, fallback = null) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[LiveWatchPage] API fetch failed for ${path}:`, err.message);
    return fallback;
  }
}

function formatSeconds(secs) {
  if (secs == null || secs < 0) return "--:--";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTimestamp(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatRelative(iso) {
  if (!iso) return "—";
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return formatTimestamp(iso);
  } catch {
    return "—";
  }
}

/* ─── STATUS BADGE ───────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    Active:    { cls: styles.badgeActive,   label: "ACTIVE"    },
    Paused:    { cls: styles.badgePaused,   label: "PAUSED"    },
    Finished:  { cls: styles.badgeDone,     label: "FINISHED"  },
    Cancelled: { cls: styles.badgeCancelled,label: "CANCELLED" },
    running:   { cls: styles.badgeActive,   label: "LIVE"      },
    paused:    { cls: styles.badgePaused,   label: "PAUSED"    },
    stopped:   { cls: styles.badgeDone,     label: "STOPPED"   },
    finished:  { cls: styles.badgeDone,     label: "ENDED"     },
    not_started: { cls: styles.badgeWaiting, label: "WAITING"  },
  };
  const meta = map[status] ?? { cls: styles.badgeWaiting, label: (status ?? "UNKNOWN").toUpperCase() };
  return (
    <span className={`${styles.badge} ${meta.cls}`}>
      {meta.cls === styles.badgeActive && <span className={styles.badgeDot} />}
      {meta.label}
    </span>
  );
}

/* ─── STREAM PLAYER AREA ─────────────────────────────────── */
function StreamPlayer({ streamUrl, sessionCode, sessionStatus }) {
  const isLive = sessionStatus === "Active";

  return (
    <div className={styles.streamArea}>
      {/* ── live / status header ── */}
      <div className={styles.streamHeader}>
        <div className={styles.streamMeta}>
          {isLive ? (
            <span className={styles.livePill}>
              <span className={styles.liveDot} />
              LIVE
            </span>
          ) : (
            <StatusBadge status={sessionStatus} />
          )}
          <span className={styles.streamSessionCode}>
            Session {sessionCode ?? "—"}
          </span>
        </div>
      </div>

      {/* ── video or placeholder ── */}
      <div className={styles.streamFrame}>
        {streamUrl ? (
          /* Wire this to a real <video> or iframe once the stream URL API exists */
          <video
            className={styles.streamVideo}
            src={streamUrl}
            autoPlay
            muted
            playsInline
            controls
          />
        ) : (
          <div className={styles.streamPlaceholder}>
            {/*
              TODO: Missing backend API — Live stream URL
              ─────────────────────────────────────────────
              Endpoint needed : GET /api/live-stream/sessions/:sessionId
              Method          : GET
              Auth            : Viewer access key required (ViewerAccessKey table)
              Expected shape  : {
                                  streamId       : number,
                                  sessionId      : number,
                                  streamStatus   : "Active" | "Inactive" | "Ended",
                                  streamUrl      : string,   // HLS / RTMP / WebRTC URL
                                  isEncrypted    : boolean,
                                  startedAt      : string (ISO),
                                  endedAt        : string | null
                                }
              Used in         : StreamPlayer component (LiveWatchPage.jsx)
              Module          : LiveStreamingPaymentBetting/live.routes.js
              ─────────────────────────────────────────────
              Per SRS §VI.1.7 (SR-STR-1..4):
              - The system shall provide viewers access to a live-streaming
                interface for active sessions.
              - All stream data shall be encrypted in transit.
            */}
            <div className={styles.placeholderIcon}>▶</div>
            <div className={styles.placeholderTitle}>Stream Unavailable</div>
            <div className={styles.placeholderSub}>
              Live stream access requires a valid viewer access key.
              <br />
              The stream endpoint has not been implemented yet.
            </div>
          </div>
        )}
        {/* Scanline overlay — pure decoration */}
        <div className={styles.scanline} aria-hidden="true" />
      </div>
    </div>
  );
}

/* ─── TIMER BLOCK ────────────────────────────────────────── */
function TimerBlock({ timer, viewers }) {
  const remaining = timer?.remainingSeconds ?? null;
  const elapsed   = timer?.elapsedSeconds   ?? null;
  const isRunning = timer?.timerStatus === "running";

  return (
    <div className={styles.timerBlock}>
      <div className={styles.timerEyebrow}>
        {isRunning ? "TIME REMAINING" : "ELAPSED TIME"}
      </div>
      <div className={`${styles.timerDigits} ${isRunning && remaining != null && remaining < 60 ? styles.timerUrgent : ""}`}>
        {formatSeconds(remaining ?? elapsed ?? 0)}
      </div>
      <div className={styles.timerMeta}>
        {timer?.timerStatus ? <StatusBadge status={timer.timerStatus} /> : null}
        {viewers != null && (
          <span className={styles.viewerCount}>
            <span className={styles.viewerDot} />
            {viewers.toLocaleString()} watching
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── PARTICIPANTS PANEL ─────────────────────────────────── */
function ParticipantsPanel({ participants, eliminatedIds }) {
  /*
    TODO: Missing backend API — Session participants list
    ─────────────────────────────────────────────────────
    Endpoint needed : GET /api/sessions/:sessionId/participants
                      OR  GET /api/game-management/sessions/:sessionId/players
    Method          : GET
    Expected shape  : {
                        sessionId    : number,
                        sessionCode  : string,
                        participants : [{
                          playerId    : number,
                          playerName  : string,
                          slotNumber  : number,
                          isAlive     : boolean,
                          eliminatedAt: string | null,
                          finalRank   : number | null,
                          joinedAt    : string
                        }]
                      }
    Used in         : ParticipantsPanel (LiveWatchPage.jsx) — fetchParticipants()
    Module          : SessionAdminstration/session.routes.js
                      (session_player + player JOIN query)
    ─────────────────────────────────────────────────────
    Fallback: derived from eliminations data when this endpoint is absent.
  */

  if (!participants?.length) {
    return (
      <div className={styles.emptyState}>
        <span>Participant data unavailable.</span>
      </div>
    );
  }

  return (
    <div className={styles.participantList}>
      {participants.map((p) => {
        const isElim = !p.isAlive || eliminatedIds?.has(p.playerId);
        return (
          <div
            key={p.playerId ?? p.playerName}
            className={`${styles.participantRow} ${isElim ? styles.participantEliminated : ""}`}
          >
            <div className={styles.participantSlot}>
              {String(p.slotNumber ?? "?").padStart(2, "0")}
            </div>
            <div className={styles.participantName}>{p.playerName ?? `Player ${p.playerId}`}</div>
            <div className={styles.participantStatus}>
              {isElim ? (
                <span className={`${styles.badge} ${styles.badgeCancelled}`}>OUT</span>
              ) : (
                <span className={`${styles.badge} ${styles.badgeActive}`}>
                  <span className={styles.badgeDot} />
                  ALIVE
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── LEVEL PROGRESSION ──────────────────────────────────── */
function SessionSnapshot({ timer, progression, eliminationCount }) {
  const snapshotItems = [
    {
      label: "Session State",
      value: timer?.sessionStatus ?? progression?.sessionStatus ?? "Unknown",
    },
    {
      label: "Current Room",
      value: progression?.currentRoom?.roomName ?? "Awaiting room unlock",
    },
    {
      label: "Next Room",
      value: progression?.nextLockedRoom?.roomName ?? "No locked room",
    },
    {
      label: "Eliminations",
      value: eliminationCount != null ? String(eliminationCount) : "0",
    },
  ];

  return (
    <div className={styles.snapshotGrid}>
      {snapshotItems.map((item) => (
        <div key={item.label} className={styles.snapshotCard}>
          <div className={styles.snapshotLabel}>{item.label}</div>
          <div className={styles.snapshotValue}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function LevelProgression({ progression }) {
  if (!progression?.rooms?.length) {
    return <div className={styles.emptyState}>Level data unavailable.</div>;
  }

  const rooms = progression.rooms;

  return (
    <div className={styles.progressionWrap}>
      <div className={styles.progressionList}>
        {rooms.map((room, idx) => {
          const statusClass = {
            Active:    styles.progActive,
            Completed: styles.progDone,
            Locked:    styles.progLocked,
            Failed:    styles.progFailed,
            Pending:   styles.progPending,
          }[room.roomStatus] ?? styles.progPending;

          return (
            <div key={room.sessionRoomId ?? idx} className={`${styles.progItem} ${statusClass}`}>
              <div className={styles.progNode}>
                <div className={styles.progNodeInner} />
                {idx < rooms.length - 1 && <div className={styles.progLine} />}
              </div>
              <div className={styles.progContent}>
                <div className={styles.progLabel}>
                  Level {room.roomIndex + 1} — {room.roomName ?? "Room"}
                </div>
                <div className={styles.progRight}>
                  <StatusBadge status={room.roomStatus} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {progression.remainingPlayers != null && (
        <div className={styles.survivorCount}>
          <span className={styles.survivorNum}>{progression.remainingPlayers}</span>
          <span className={styles.survivorLabel}>
            {progression.remainingPlayers === 1 ? "survivor" : "survivors"} remaining
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── ELIMINATION FEED ───────────────────────────────────── */
function EliminationFeed({ eliminations }) {
  if (!eliminations?.length) {
    return <div className={styles.emptyState}>No eliminations yet.</div>;
  }

  return (
    <div className={styles.elimFeed} role="log" aria-live="polite" aria-label="Elimination feed">
      {eliminations.map((e, idx) => (
        <div key={e.eliminationId ?? idx} className={styles.elimEntry}>
          <div className={styles.elimTime}>{formatTimestamp(e.eliminatedAt)}</div>
          <div className={styles.elimContent}>
            <span className={styles.elimName}>{e.player?.playerName ?? "Unknown"}</span>
            <span className={styles.elimRoom}> in {e.roomName ?? "Room"}</span>
            {e.reason && e.reason !== "Participant eliminated" && (
              <span className={styles.elimReason}> — {e.reason}</span>
            )}
          </div>
          <span className={styles.elimX}>✕</span>
        </div>
      ))}
    </div>
  );
}

/* ─── LIVE EVENTS FEED ───────────────────────────────────── */
function EventsFeed({ events }) {
  const formatEventType = (type) =>
    (type ?? "Event")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .replace(/^./, (c) => c.toUpperCase());

  if (!events?.length) {
    return <div className={styles.emptyState}>No recent events.</div>;
  }

  return (
    <div className={styles.eventsFeed} role="log" aria-live="polite">
      {events.map((ev, idx) => (
        <div key={ev.eventId ?? idx} className={styles.eventEntry}>
          <div className={styles.eventTime}>{formatRelative(ev.createdAt)}</div>
          <div className={styles.eventType}>{formatEventType(ev.eventType)}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── BETTING SUMMARY PANEL ──────────────────────────────── */
function BettingSummary() {
  /*
    TODO: Missing backend API — Betting summary
    ────────────────────────────────────────────
    Endpoint needed : GET /api/betting/sessions/:sessionId/summary
    Method          : GET
    Expected shape  : {
                        sessionId       : number,
                        totalPool       : number,   // e.g. 104402
                        currency        : string,   // "USD"
                        totalBets       : number,
                        openBets        : number,
                        leaders         : [{
                          playerId  : number,
                          playerName: string,
                          totalBetAmount : number,
                          odds           : number
                        }]
                      }
    Used in         : BettingSummary (LiveWatchPage.jsx)
    Module          : LiveStreamingPaymentBetting/live.routes.js
    ──────────────────────────────────────────────────────────
    Per SRS §VI.1.8 (SR-BET-1..8): Betting is a core feature
    requiring paywall authorization before bet placement.
  */
  return (
    <div className={styles.bettingPlaceholder}>
      <div className={styles.bettingIcon}>◈</div>
      <div className={styles.bettingTitle}>Betting Unavailable</div>
      <div className={styles.bettingSub}>
        Betting integration requires authentication and a completed paywall step.
      </div>
    </div>
  );
}

/* ─── ERROR STATE ─────────────────────────────────────────── */
function ErrorState({ message, onRetry }) {
  return (
    <div className={styles.errorState}>
      <div className={styles.errorIcon}>⚠</div>
      <div className={styles.errorTitle}>Could Not Load Session</div>
      <div className={styles.errorSub}>{message}</div>
      <button type="button" className={styles.retryBtn} onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

/* ─── LOADING SKELETON ───────────────────────────────────── */
function LoadingSkeleton() {
  const sh = { className: styles.shimmer };
  return (
    <div className={styles.skeletonWrap}>
      <div {...sh} style={{ height: 340, borderRadius: 6, marginBottom: 18 }} />
      <div style={{ display: "flex", gap: 16 }}>
        <div {...sh} style={{ flex: 1, height: 120, borderRadius: 6 }} />
        <div {...sh} style={{ flex: 1, height: 120, borderRadius: 6 }} />
        <div {...sh} style={{ flex: 1, height: 120, borderRadius: 6 }} />
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────── */
function LiveWatchPage() {
  const sessionId = getSessionId();

  const [timer,        setTimer]        = useState(null);
  const [progression,  setProgression]  = useState(null);
  const [elimData,     setElimData]     = useState(null);
  const [events,       setEvents]       = useState(null);
  const [participants, setParticipants] = useState(null);

  // Simulated viewer count (real data would come from a WebSocket or stream API)
  const [viewers, setViewers] = useState(1204);

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [lastAt,  setLastAt]  = useState(null);

  const pollRef = useRef(null);

  /* ── Fetch all data for the session ── */
  const fetchAll = useCallback(async (silent = false) => {
    if (!sessionId) {
      setError("No session ID found in the URL. Use /watch/:sessionId");
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setError(null);

    const [timerRes, progRes, elimRes, eventsRes] = await Promise.all([
      apiFetch(`/api/game-management/sessions/${sessionId}/timer`),
      apiFetch(`/api/game-management/sessions/${sessionId}/levels/progression`),
      apiFetch(`/api/game-management/sessions/${sessionId}/eliminations`),
      apiFetch(`/api/game-management/sessions/${sessionId}/events?limit=15`),
    ]);

    /*
      TODO: Missing backend API — Participant list fetch
      Add this call once the endpoint is implemented:
        const partsRes = await apiFetch(`/api/game-management/sessions/${sessionId}/participants`);
        setParticipants(partsRes?.participants ?? null);
      For now, we derive a coarse list from elimination data + progression.
    */

    if (!timerRes && !progRes && !elimRes) {
      if (!silent) setError("The backend is offline or this session does not exist.");
      setLoading(false);
      return;
    }

    setTimer(timerRes?.timer ?? null);
    setProgression(progRes ?? null);
    setElimData(elimRes ?? null);
    setEvents(eventsRes?.events ?? null);

    // Derive participant list from progression data (fallback only)
    if (progRes && !participants) {
      const alive = progRes.remainingPlayers ?? 0;
      const elims = elimRes?.eliminations ?? [];
      const syntheticParticipants = elims.map((e) => ({
        playerId:   e.player?.playerId,
        playerName: e.player?.playerName,
        slotNumber: e.player?.slotNumber ?? 0,
        isAlive:    false,
        eliminatedAt: e.eliminatedAt,
      }));
      if (alive > 0 || syntheticParticipants.length > 0) {
        setParticipants(syntheticParticipants.length ? syntheticParticipants : null);
      }
    }

    setLoading(false);
    setLastAt(new Date().toLocaleTimeString());
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Polling ── */
  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(() => {
      fetchAll(true);
      setViewers((v) => Math.max(0, v + Math.floor(Math.random() * 7) - 2));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchAll]);

  /* ── Derived values ── */
  const sessionCode   = timer?.sessionCode ?? progression?.sessionCode ?? `#${sessionId}`;
  const sessionStatus = timer?.sessionStatus ?? progression?.sessionStatus ?? "—";

  const eliminatedIds = new Set(
    (elimData?.eliminations ?? []).map((e) => e.player?.playerId).filter(Boolean)
  );

  /*
    TODO: Missing backend API — Stream URL
    Replace `null` with: streamData?.streamUrl
    once GET /api/live-stream/sessions/:sessionId is implemented.
  */
  const streamUrl = null;

  /* ── Render ── */
  return (
    <main className={`${styles.page} min-h-screen w-full overflow-x-hidden`}>
      <div className={styles.root}>
        {/* ── PAGE BODY ── */}
        <div className={styles.body}>

          {loading && <LoadingSkeleton />}

          {!loading && error && (
            <ErrorState message={error} onRetry={() => fetchAll()} />
          )}

          {!loading && !error && (
            <>
              {/* ── PAGE HEADER ── */}
              <header className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                  <div className={styles.eyebrow}>Live Session Broadcast</div>
                  <h1 className={styles.pageTitle}>
                    Session {sessionCode}
                  </h1>
                  <div className={styles.headerMeta}>
                    <StatusBadge status={sessionStatus} />
                    {lastAt && (
                      <span className={styles.lastUpdated}>
                        Updated {lastAt}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.headerRight}>
                  <button
                    type="button"
                    className={styles.refreshBtn}
                    onClick={() => fetchAll()}
                    aria-label="Refresh session data"
                  >
                    ↻ Refresh
                  </button>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => { window.location.href = "/sessions"; }}
                  >
                    ← All Sessions
                  </button>
                </div>
              </header>

              {/* ── MAIN CONTENT GRID ── */}
              <div className={styles.contentGrid}>

                {/* ── LEFT: Stream + Timer ── */}
                <div className={styles.streamCol}>
                  <StreamPlayer
                    streamUrl={streamUrl}
                    sessionCode={sessionCode}
                    sessionStatus={sessionStatus}
                  />
                  <TimerBlock timer={timer} viewers={viewers} />
                </div>

                {/* ── RIGHT: Data panels ── */}
                <div className={styles.dataCol}>

                  {/* Level Progression */}
                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div className={styles.panelTitle}>Level Progression</div>
                      {progression?.currentRoom && (
                        <span className={styles.panelSub}>
                          {progression.currentRoom.roomName ?? "Active Room"}
                        </span>
                      )}
                    </div>
                    <LevelProgression progression={progression} />
                  </div>

                  {/* Participants */}
                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div className={styles.panelTitle}>Participants</div>
                      {progression?.remainingPlayers != null && (
                        <span className={styles.panelSub}>
                          {progression.remainingPlayers} alive
                        </span>
                      )}
                    </div>
                    <ParticipantsPanel
                      participants={participants}
                      eliminatedIds={eliminatedIds}
                    />
                  </div>

                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div className={styles.panelTitle}>Session Snapshot</div>
                    </div>
                    <SessionSnapshot
                      timer={timer}
                      progression={progression}
                      eliminationCount={elimData?.eliminationCount}
                    />
                  </div>

                </div>
              </div>

              {/* ── BOTTOM PANELS GRID ── */}
              <div className={styles.bottomGrid}>

                {/* Eliminations */}
                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div className={styles.panelTitle}>Elimination Log</div>
                    <span className={styles.panelBadge}>
                      {elimData?.eliminationCount ?? 0}
                    </span>
                  </div>
                  <EliminationFeed eliminations={elimData?.eliminations} />
                </div>

                {/* Events */}
                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div className={styles.panelTitle}>Live Events</div>
                  </div>
                  <EventsFeed events={events} />
                </div>

                {/* Betting summary */}
                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div className={styles.panelTitle}>Betting</div>
                  </div>
                  <BettingSummary />
                </div>

              </div>
            </>
          )}
        </div>

      </div>
    </main>
  );
}

export default LiveWatchPage;
