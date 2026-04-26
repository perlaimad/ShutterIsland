/**
 * SHUTTER ISLAND — Sessions Page
 * -----------------------------------------------
 * Drop this file into:  src/pages/SessionsPage.jsx
 *
 * Also needs these siblings (all inlined below for portability):
 *   src/services/sessionsService.js   – API layer + mock data
 *   src/hooks/useSessions.js          – data-fetching hook
 *   src/components/sessions/*         – SessionCard, StatusBadge, etc.
 *
 * Everything is exported from this single file for easy copy-paste.
 * In a real project, split into separate files as labelled.
 * -----------------------------------------------
 */

import { useState, useEffect, useMemo, useCallback } from "react";

/* ============================================================
   1. CONFIGURATION
   ============================================================ */
const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL
  ?? `${import.meta?.env?.VITE_API_URL ?? "http://localhost:4000"}/api`;

function mapBackendStatusToCardStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "active") return "live";
  if (normalized === "paused") return "closed";
  if (normalized === "finished") return "finished";
  if (normalized === "cancelled") return "cancelled";
  return "upcoming";
}

function getSessionHref(session) {
  const identifier = session?.id ?? session?.code ?? "";
  return `/sessions/${encodeURIComponent(identifier)}`;
}

/* ============================================================
   2. SESSIONS SERVICE  (src/services/sessionsService.js)
   ============================================================ */
const MOCK_SESSIONS = [
  {
    id: "1", code: "I", date: "2026-03-06", time: "19:00",
    status: "finished", players: 8, capacity: 8, pool: "$41,200",
    note: "Concluded", winner: "Tariq Nasr", duration: "2h 18m",
  },
  {
    id: "2", code: "II", date: "2026-03-13", time: "19:00",
    status: "finished", players: 8, capacity: 8, pool: "$38,750",
    note: "Concluded", winner: "Sera Mikkelsen", duration: "1h 54m",
  },
  {
    id: "3", code: "III", date: "2026-03-20", time: "20:00",
    status: "finished", players: 8, capacity: 8, pool: "$45,100",
    note: "Concluded", winner: "Dario Vale", duration: "2h 06m",
  },
  {
    id: "4", code: "IV", date: "2026-03-27", time: "19:30",
    status: "finished", players: 8, capacity: 8, pool: "$52,000",
    note: "Concluded", winner: "Tariq Nasr", duration: "2h 41m",
  },
  {
    id: "5", code: "V", date: "2026-04-03", time: "19:00",
    status: "finished", players: 8, capacity: 8, pool: "$49,800",
    note: "Concluded", winner: "Yara Cross", duration: "2h 03m",
  },
  {
    id: "6", code: "VI", date: "2026-04-06", time: "20:00",
    status: "finished", players: 8, capacity: 8, pool: "$61,300",
    note: "Concluded", winner: "Felix Osei", duration: "1h 47m",
  },
  {
    id: "7", code: "VII", date: "2026-04-11", time: "20:00",
    status: "live", players: 5, capacity: 8, pool: "$104,402",
    note: "Live Now", round: 3, timeLeft: "00:04:17",
  },
  {
    id: "8", code: "VIII", date: "2026-04-17", time: "19:00",
    status: "open", players: 6, capacity: 8, pool: "TBD",
    note: "Booking Open", spotsLeft: 2,
  },
  {
    id: "9", code: "IX", date: "2026-04-22", time: "20:00",
    status: "upcoming", players: 0, capacity: 8, pool: "TBD",
    note: "Opens Soon",
  },
  {
    id: "10", code: "X", date: "2026-04-28", time: "19:30",
    status: "upcoming", players: 0, capacity: 8, pool: "TBD",
    note: "Opens Soon",
  },
  {
    id: "11", code: "XI", date: "2026-05-05", time: "19:00",
    status: "upcoming", players: 0, capacity: 8, pool: "TBD",
    note: "Opens Soon",
  },
  {
    id: "12", code: "XII", date: "2026-05-12", time: "20:00",
    status: "upcoming", players: 0, capacity: 8, pool: "TBD",
    note: "Opens Soon",
  },
];

function normalizeSession(session) {
  return {
    id: session.id ?? String(session.sessionId ?? session.session_id ?? ""),
    code: session.code ?? session.romanId ?? session.sessionCode ?? session.id ?? "",
    date: session.date ?? (session.startsAt ? String(session.startsAt).slice(0, 10) : ""),
    time: session.time ?? (session.startsAt ? new Date(session.startsAt).toISOString().slice(11, 16) : ""),
    status: session.status ?? "upcoming",
    players: Number(session.players ?? session.playerCount ?? 0),
    capacity: Number(session.capacity ?? session.maxPlayers ?? 0),
    note: session.note
      ?? (session.statusLabel
        ? session.statusLabel
        : session.status === "live"
          ? "Live Now"
          : session.status === "open"
            ? "Booking Open"
            : session.status === "finished"
              ? "Concluded"
              : "Opens Soon"),
    winner: session.winner ?? null,
    duration: session.duration ?? null,
    pool: session.pool ?? "TBD",
    timeLeft: session.timeLeft ?? null,
    round: session.round ?? null,
    spotsLeft: session.spotsLeft ?? Math.max(0, Number(session.capacity ?? 0) - Number(session.players ?? 0)),
    rawStatus: session.rawStatus ?? null,
    startsAt: session.startsAt ?? null,
    endedAt: session.endedAt ?? null,
  };
}

function filterSessions(sessions, params = {}) {
  let data = [...sessions];

  if (params.status && params.status !== "all") {
    data = data.filter((session) => session.status === params.status);
  }

  if (params.search) {
    const query = params.search.toLowerCase();
    data = data.filter((session) =>
      session.code.toLowerCase().includes(query)
      || session.id.toLowerCase().includes(query)
      || session.date.includes(query)
    );
  }

  if (params.month !== undefined && params.month !== null) {
    data = data.filter((session) => {
      const month = new Date(session.date).getMonth();
      return month === params.month;
    });
  }

  if (params.sort === "newest") {
    data = data.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  } else {
    data = data.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  return data;
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

const sessionsService = {
  async getSessions(params = {}) {
    try {
      const query = new URLSearchParams();

      if (params.month !== undefined && params.month !== null) {
        query.set("month", `2026-${String(params.month + 1).padStart(2, "0")}`);
      }

      const payload = await fetchJson(`/sessions${query.toString() ? `?${query.toString()}` : ""}`);
      const sessions = Array.isArray(payload?.sessions)
        ? payload.sessions.map(normalizeSession)
        : [];
      const filtered = filterSessions(sessions, params);

      return {
        sessions: filtered,
        total: filtered.length,
      };
    } catch {
      const fallback = filterSessions(MOCK_SESSIONS, params);
      return { sessions: fallback, total: fallback.length };
    }
  },

  async getLiveSession() {
    try {
      const payload = await fetchJson("/sessions");
      const sessions = Array.isArray(payload?.sessions)
        ? payload.sessions.map(normalizeSession)
        : [];

      return sessions.find((session) => session.status === "live") ?? null;
    } catch {
      return MOCK_SESSIONS.find((session) => session.status === "live") ?? null;
    }
  },

  async getSessionById(id) {
    try {
      const payload = await fetchJson(`/sessions/${encodeURIComponent(id)}`);
      return payload?.session ? normalizeSession(payload.session) : null;
    } catch {
      return MOCK_SESSIONS.find((session) => session.id === id || session.code === id) ?? null;
    }
  },

  async createSession(payload) {
    const response = await fetch(`${API_BASE_URL}/session-administration/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data?.message || `Failed to create session (${response.status}).`);
    }

    const session = data?.session;
    if (!session) {
      throw new Error("Backend did not return created session payload.");
    }

    const createdAt = new Date(session.createdAt || Date.now());
    const cardSession = {
      id: String(session.sessionCode || session.sessionId),
      code: String(session.sessionCode || session.sessionId),
      date: createdAt.toISOString().slice(0, 10),
      time: createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      status: mapBackendStatusToCardStatus(session.status),
      players: 0,
      capacity: Number(session.maxPlayers ?? payload.maxPlayers ?? 0),
      pool: "TBD",
      note: "Created now",
      sessionId: session.sessionId,
    };

    MOCK_SESSIONS.unshift(cardSession);
    return { created: session, cardSession };
  },
};

/* ============================================================
   3. HOOK  (src/hooks/useSessions.js)
   ============================================================ */
function useSessions(filters) {
  const [sessions, setSessions] = useState([]);
  const [liveSession, setLiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const filtersKey = JSON.stringify(filters);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsResult, live] = await Promise.all([
        sessionsService.getSessions(filters),
        sessionsService.getLiveSession(),
      ]);
      setSessions(sessionsResult.sessions);
      setTotal(sessionsResult.total);
      setLiveSession(live);
    } catch (err) {
      setError(err?.message ?? "Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { sessions, liveSession, loading, error, total, refetch: fetchData };
}

/* ============================================================
   4. STATUS BADGE  (src/components/sessions/StatusBadge.jsx)
   ============================================================ */
const STATUS_META = {
  live:      { label: "LIVE",      bg: "#A4303F", color: "#FFECCC", dot: true  },
  open:      { label: "OPEN",      bg: "#2d5a3d", color: "#a2ce9c", dot: false },
  upcoming:  { label: "UPCOMING",  bg: "#3a3520", color: "#d4c47a", dot: false },
  closed:    { label: "CLOSED",    bg: "#3d2020", color: "#c08080", dot: false },
  finished:  { label: "FINISHED",  bg: "#252520", color: "#85937f", dot: false },
  cancelled: { label: "CANCELLED", bg: "#1e1818", color: "#6b5050", dot: false },
};

function StatusBadge({ status, size = "sm" }) {
  const meta = STATUS_META[status] ?? STATUS_META.upcoming;
  const pad = size === "lg" ? "5px 12px" : "3px 9px";
  const fs  = size === "lg" ? "10px" : "8px";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      background: meta.bg, color: meta.color,
      padding: pad, borderRadius: "3px",
      fontFamily: "Cinzel, serif", fontSize: fs,
      fontWeight: 700, letterSpacing: "0.12em",
    }}>
      {meta.dot && (
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "#FFECCC", flexShrink: 0,
          animation: "si-pulse 1.4s ease-in-out infinite",
        }} />
      )}
      {meta.label}
    </span>
  );
}

/* ============================================================
   5. SESSION CARD  (src/components/sessions/SessionCard.jsx)
   ============================================================ */
function SessionCard({ session, featured = false }) {
  const dateObj = new Date(session.date);
  const sessionHref = getSessionHref(session);
  const dateStr = dateObj.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).toUpperCase();

  const actionBtn = (() => {
    switch (session.status) {
      case "live":      return { label: "Watch Live", accent: "#A4303F", textColor: "#FFECCC" };
      case "open":      return { label: "Book Now",   accent: "#2d5a3d", textColor: "#a2ce9c" };
      case "upcoming":  return { label: "Notify Me",  accent: "#3a3520", textColor: "#d4c47a" };
      default:          return { label: "View Details", accent: "#2a2a22", textColor: "#85937f" };
    }
  })();

  const cardBg = session.status === "live"
    ? "linear-gradient(135deg, #1e0a0e 0%, #2d0f14 60%, #1a0808 100%)"
    : session.status === "open"
    ? "linear-gradient(135deg, #0d1e12 0%, #112016 100%)"
    : "linear-gradient(135deg, #130f0a 0%, #1a1510 100%)";

  const borderColor = session.status === "live"
    ? "rgba(164,48,63,0.5)"
    : session.status === "open"
    ? "rgba(69,176,108,0.3)"
    : "rgba(93,80,60,0.25)";

  return (
    <article style={{
      background: cardBg,
      border: `1px solid ${borderColor}`,
      borderRadius: 6,
      padding: featured ? "28px 32px" : "20px 22px",
      display: "flex", flexDirection: "column", gap: 14,
      position: "relative", overflow: "hidden",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      cursor: "pointer",
      boxShadow: session.status === "live"
        ? "0 0 0 1px rgba(164,48,63,0.18), 0 8px 32px rgba(164,48,63,0.12)"
        : "0 4px 16px rgba(0,0,0,0.32)",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-3px)";
      e.currentTarget.style.boxShadow = session.status === "live"
        ? "0 0 0 1px rgba(164,48,63,0.32), 0 16px 40px rgba(164,48,63,0.18)"
        : "0 12px 32px rgba(0,0,0,0.48)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = session.status === "live"
        ? "0 0 0 1px rgba(164,48,63,0.18), 0 8px 32px rgba(164,48,63,0.12)"
        : "0 4px 16px rgba(0,0,0,0.32)";
    }}
    onClick={() => {
      window.location.href = sessionHref;
    }}
    >
      {/* Corner decoration */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 60, height: 60, overflow: "hidden", opacity: 0.12,
      }}>
        <div style={{
          position: "absolute", top: -30, right: -30,
          width: 60, height: 60, borderRadius: "50%",
          background: borderColor,
        }} />
      </div>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{
            fontFamily: "Cinzel, serif", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.2em", color: "rgba(164,208,148,0.4)",
            marginBottom: 4,
          }}>
            SESSION
          </div>
          <div style={{
            fontFamily: "Cinzel, serif", fontSize: featured ? 28 : 22,
            fontWeight: 700, color: "#F2D0A4", letterSpacing: "0.04em",
            lineHeight: 1,
          }}>
            {session.code}
          </div>
        </div>
        <StatusBadge status={session.status} size={featured ? "lg" : "sm"} />
      </div>

      {/* Date / time row */}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{
            fontFamily: "Cinzel, serif", fontSize: 8,
            letterSpacing: "0.16em", color: "rgba(164,208,148,0.4)",
          }}>DATE</span>
          <span style={{
            fontFamily: "Cinzel, serif", fontSize: 11, fontWeight: 600,
            color: "#D4C4A8", letterSpacing: "0.06em",
          }}>{dateStr}</span>
        </div>
        <div style={{
          width: 1, height: 28, background: "rgba(164,208,148,0.12)",
        }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{
            fontFamily: "Cinzel, serif", fontSize: 8,
            letterSpacing: "0.16em", color: "rgba(164,208,148,0.4)",
          }}>TIME</span>
          <span style={{
            fontFamily: "Cinzel, serif", fontSize: 11, fontWeight: 600,
            color: "#D4C4A8", letterSpacing: "0.06em",
          }}>{session.time} LOCAL</span>
        </div>
        {session.status === "live" && session.round && (
          <>
            <div style={{ width: 1, height: 28, background: "rgba(164,48,63,0.2)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: "Cinzel, serif", fontSize: 8, letterSpacing: "0.16em", color: "rgba(164,48,63,0.6)" }}>ROUND</span>
              <span style={{ fontFamily: "Cinzel, serif", fontSize: 11, fontWeight: 600, color: "#FFCCD5" }}>{session.round} / 5</span>
            </div>
          </>
        )}
      </div>

      {/* Pool / capacity row */}
      <div style={{
        display: "flex", gap: 12, padding: "10px 12px",
        background: "rgba(0,0,0,0.24)", borderRadius: 4,
        border: "1px solid rgba(93,80,60,0.18)",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "Cinzel, serif", fontSize: 7, letterSpacing: "0.18em",
            color: "rgba(164,208,148,0.38)", marginBottom: 3,
          }}>POOL</div>
          <div style={{
            fontFamily: "Cinzel, serif", fontSize: 13, fontWeight: 700,
            color: session.pool === "TBD" ? "#6b7d65" : "#F2D0A4",
          }}>{session.pool}</div>
        </div>
        <div style={{ width: 1, background: "rgba(93,80,60,0.2)" }} />
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "Cinzel, serif", fontSize: 7, letterSpacing: "0.18em",
            color: "rgba(164,208,148,0.38)", marginBottom: 3,
          }}>PLAYERS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontFamily: "Cinzel, serif", fontSize: 13, fontWeight: 700,
              color: "#D4C4A8",
            }}>{session.players}/{session.capacity}</span>
            {/* mini capacity bar */}
            <div style={{ flex: 1, height: 3, background: "rgba(93,80,60,0.3)", borderRadius: 2 }}>
              <div style={{
                height: "100%", borderRadius: 2,
                width: `${(session.players / session.capacity) * 100}%`,
                background: session.status === "live" ? "#A4303F"
                  : session.status === "open" ? "#45B06C" : "#5b6d56",
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        </div>
        {session.status === "open" && session.spotsLeft && (
          <>
            <div style={{ width: 1, background: "rgba(93,80,60,0.2)" }} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "Cinzel, serif", fontSize: 7, letterSpacing: "0.18em",
                color: "rgba(69,176,108,0.5)", marginBottom: 3,
              }}>SPOTS LEFT</div>
              <div style={{
                fontFamily: "Cinzel, serif", fontSize: 13, fontWeight: 700, color: "#a2ce9c",
              }}>{session.spotsLeft}</div>
            </div>
          </>
        )}
        {session.status === "finished" && session.winner && (
          <>
            <div style={{ width: 1, background: "rgba(93,80,60,0.2)" }} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "Cinzel, serif", fontSize: 7, letterSpacing: "0.18em",
                color: "rgba(164,208,148,0.38)", marginBottom: 3,
              }}>WINNER</div>
              <div style={{
                fontFamily: "Cinzel, serif", fontSize: 10, fontWeight: 600, color: "#D4C4A8",
              }}>{session.winner}</div>
            </div>
          </>
        )}
      </div>

      {/* Note + action */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{
          fontFamily: "Cinzel, serif", fontSize: 9, letterSpacing: "0.14em",
          color: session.status === "live" ? "rgba(255,180,180,0.7)"
            : session.status === "open" ? "rgba(162,206,156,0.6)"
            : "rgba(164,208,148,0.35)",
        }}>
          {session.note}
          {session.status === "live" && session.timeLeft && (
            <span style={{ color: "#FF9999", marginLeft: 8 }}>· {session.timeLeft} remaining</span>
          )}
        </span>
        <button
          type="button"
          style={{
            fontFamily: "Cinzel, serif", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
            padding: "7px 16px", borderRadius: 3,
            background: actionBtn.accent, color: actionBtn.textColor,
            border: "none", cursor: "pointer",
            transition: "opacity 0.15s, transform 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.82"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
          onClick={(event) => {
            event.stopPropagation();
            window.location.href = sessionHref;
          }}
        >
          {actionBtn.label}
        </button>
      </div>
    </article>
  );
}

/* ============================================================
   6. FEATURED SESSION BANNER  (src/components/sessions/FeaturedSessionBanner.jsx)
   ============================================================ */
function FeaturedSessionBanner({ session }) {
  const [viewers, setViewers] = useState(1204);
  const sessionHref = getSessionHref(session);
  useEffect(() => {
    const t = setInterval(() => {
      setViewers((v) => Math.max(0, v + Math.floor(Math.random() * 7) - 2));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      background: "linear-gradient(135deg, #1e0608 0%, #2d0b10 40%, #1a0505 100%)",
      border: "1px solid rgba(164,48,63,0.45)",
      borderRadius: 8,
      padding: "32px 36px",
      position: "relative", overflow: "hidden",
      boxShadow: "0 0 0 1px rgba(164,48,63,0.12), 0 20px 60px rgba(164,48,63,0.15)",
      marginBottom: 40,
    }}>
      {/* Animated scan line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent 0%, rgba(164,48,63,0.6) 50%, transparent 100%)",
        animation: "si-scan 3s linear infinite",
      }} />

      {/* BG decoration */}
      <div style={{
        position: "absolute", top: -80, right: -80, width: 300, height: 300,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(164,48,63,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Left block */}
        <div style={{ flex: "1 1 280px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "#A4303F",
              animation: "si-pulse 1.4s ease-in-out infinite",
              boxShadow: "0 0 6px rgba(164,48,63,0.8)",
            }} />
            <span style={{
              fontFamily: "Cinzel, serif", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.22em", color: "#FF9999",
            }}>LIVE SESSION — HAPPENING NOW</span>
          </div>

          <div style={{
            fontFamily: "Cinzel, serif", fontSize: 48, fontWeight: 700,
            color: "#F2D0A4", letterSpacing: "0.04em", lineHeight: 1,
            marginBottom: 6,
          }}>
            Session {session.code}
          </div>

          <div style={{
            fontFamily: "Cinzel, serif", fontSize: 11, color: "rgba(164,208,148,0.5)",
            letterSpacing: "0.12em", marginBottom: 20,
          }}>
            ROUND {session.round} OF 5 — {session.players} PLAYERS REMAINING
          </div>

          <div style={{ display: "flex", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Pool", value: session.pool, accent: "#F2D0A4" },
              { label: "Watching", value: `${viewers.toLocaleString()}`, accent: "#FF9999" },
              { label: "Time Left", value: session.timeLeft, accent: "#FFCC66" },
            ].map(({ label, value, accent }) => (
              <div key={label}>
                <div style={{
                  fontFamily: "Cinzel, serif", fontSize: 7, letterSpacing: "0.2em",
                  color: "rgba(164,208,148,0.35)", marginBottom: 3,
                }}>{label.toUpperCase()}</div>
                <div style={{
                  fontFamily: "Cinzel, serif", fontSize: 16, fontWeight: 700, color: accent,
                }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" style={{
              fontFamily: "Cinzel, serif", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.14em", padding: "10px 24px", borderRadius: 3,
              background: "#A4303F", color: "#FFECCC", border: "none", cursor: "pointer",
              transition: "background 0.15s",
            }}
            onClick={() => {
              window.location.href = sessionHref;
            }}>
              ▶  Watch Live
            </button>
            <button type="button" style={{
              fontFamily: "Cinzel, serif", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.14em", padding: "10px 20px", borderRadius: 3,
              background: "rgba(164,48,63,0.14)", color: "#FF9999",
              border: "1px solid rgba(164,48,63,0.35)", cursor: "pointer",
            }}
            onClick={() => {
              window.location.href = sessionHref;
            }}>
              Place Bet
            </button>
          </div>
        </div>

        {/* Right — mini stats */}
        <div style={{
          flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 8,
          padding: "20px 24px",
          background: "rgba(0,0,0,0.28)",
          border: "1px solid rgba(164,48,63,0.18)",
          borderRadius: 6, minWidth: 190,
        }}>
          <div style={{
            fontFamily: "Cinzel, serif", fontSize: 8, letterSpacing: "0.2em",
            color: "rgba(164,48,63,0.5)", marginBottom: 8,
          }}>ELIMINATION LOG</div>
          {[
            { time: "01:12:08", name: "Lena Koch" },
            { time: "00:47:33", name: "Ren Alcazar" },
            { time: "00:22:51", name: "Mara Osei" },
          ].map((entry) => (
            <div key={entry.time} style={{
              display: "flex", gap: 10, alignItems: "center",
              padding: "6px 0",
              borderBottom: "1px solid rgba(164,48,63,0.08)",
            }}>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace", fontSize: 9,
                color: "rgba(164,48,63,0.5)", letterSpacing: "0.06em",
              }}>{entry.time}</span>
              <span style={{
                fontFamily: "Cinzel, serif", fontSize: 10, color: "#c08080",
              }}>{entry.name}</span>
              <span style={{ marginLeft: "auto", fontSize: 9, color: "rgba(164,48,63,0.5)" }}>✕</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   7. SESSION FILTERS  (src/components/sessions/SessionFilters.jsx)
   ============================================================ */
const STATUS_OPTIONS = ["all", "live", "open", "upcoming", "finished", "closed", "cancelled"];
const MONTH_OPTIONS = [
  { value: null, label: "All Months" },
  { value: 0, label: "January" }, { value: 1, label: "February" },
  { value: 2, label: "March" },   { value: 3, label: "April" },
  { value: 4, label: "May" },     { value: 5, label: "June" },
  { value: 6, label: "July" },    { value: 7, label: "August" },
  { value: 8, label: "September" },{ value: 9, label: "October" },
  { value: 10, label: "November" },{ value: 11, label: "December" },
];

function SessionFilters({ filters, onChange }) {
  const inputStyle = {
    fontFamily: "Cinzel, serif", fontSize: 10, letterSpacing: "0.1em",
    background: "rgba(0,0,0,0.32)", border: "1px solid rgba(93,80,60,0.32)",
    color: "#D4C4A8", borderRadius: 4, padding: "8px 12px", outline: "none",
    transition: "border-color 0.15s",
  };
  const selectStyle = { ...inputStyle, cursor: "pointer", appearance: "none" };

  return (
    <div style={{
      background: "linear-gradient(135deg, #130f0a 0%, #1a1510 100%)",
      border: "1px solid rgba(93,80,60,0.28)",
      borderRadius: 6, padding: "20px 24px",
      display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center",
      marginBottom: 28,
    }}>
      {/* Search */}
      <div style={{ flex: "1 1 200px", position: "relative" }}>
        <span style={{
          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
          color: "rgba(164,208,148,0.35)", fontSize: 11,
        }}>⌕</span>
        <input
          type="text"
          placeholder="Search code or date…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          style={{ ...inputStyle, width: "100%", paddingLeft: 28 }}
          onFocus={(e) => { e.target.style.borderColor = "rgba(164,48,63,0.5)"; }}
          onBlur={(e) => { e.target.style.borderColor = "rgba(93,80,60,0.32)"; }}
        />
      </div>

      {/* Status filter */}
      <div style={{ position: "relative" }}>
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          style={{ ...selectStyle, paddingRight: 28 }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} style={{ background: "#1a1510" }}>
              {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <span style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          color: "rgba(164,208,148,0.35)", pointerEvents: "none", fontSize: 9,
        }}>▾</span>
      </div>

      {/* Month filter */}
      <div style={{ position: "relative" }}>
        <select
          value={filters.month ?? ""}
          onChange={(e) => onChange({ ...filters, month: e.target.value === "" ? null : Number(e.target.value) })}
          style={{ ...selectStyle, paddingRight: 28 }}
        >
          {MONTH_OPTIONS.map((m) => (
            <option key={String(m.value)} value={m.value ?? ""} style={{ background: "#1a1510" }}>
              {m.label}
            </option>
          ))}
        </select>
        <span style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          color: "rgba(164,208,148,0.35)", pointerEvents: "none", fontSize: 9,
        }}>▾</span>
      </div>

      {/* Sort */}
      <div style={{ position: "relative" }}>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value })}
          style={{ ...selectStyle, paddingRight: 28 }}
        >
          <option value="nearest" style={{ background: "#1a1510" }}>Nearest First</option>
          <option value="newest"  style={{ background: "#1a1510" }}>Newest First</option>
        </select>
        <span style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          color: "rgba(164,208,148,0.35)", pointerEvents: "none", fontSize: 9,
        }}>▾</span>
      </div>

      {/* Clear */}
      {(filters.search || filters.status !== "all" || filters.month !== null || filters.sort !== "nearest") && (
        <button
          type="button"
          onClick={() => onChange({ search: "", status: "all", month: null, sort: "nearest" })}
          style={{
            fontFamily: "Cinzel, serif", fontSize: 9, letterSpacing: "0.12em",
            color: "rgba(164,48,63,0.6)", background: "transparent",
            border: "1px solid rgba(164,48,63,0.2)", borderRadius: 3,
            padding: "7px 12px", cursor: "pointer",
          }}
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}

/* ============================================================
   8. EMPTY STATE  (src/components/sessions/EmptyState.jsx)
   ============================================================ */
function EmptyState({ onClear }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "72px 24px", textAlign: "center",
      border: "1px dashed rgba(93,80,60,0.28)", borderRadius: 6,
      background: "rgba(0,0,0,0.2)",
    }}>
      <div style={{
        fontFamily: "Cinzel, serif", fontSize: 36, marginBottom: 16,
        color: "rgba(164,208,148,0.18)",
      }}>◈</div>
      <div style={{
        fontFamily: "Cinzel, serif", fontSize: 14, fontWeight: 600,
        letterSpacing: "0.12em", color: "#85937f", marginBottom: 8,
      }}>NO SESSIONS FOUND</div>
      <div style={{
        fontFamily: "Space Grotesk, sans-serif", fontSize: 13,
        color: "rgba(164,208,148,0.28)", marginBottom: 24,
      }}>No sessions match your current filters.</div>
      <button
        type="button"
        onClick={onClear}
        style={{
          fontFamily: "Cinzel, serif", fontSize: 9, letterSpacing: "0.14em",
          padding: "8px 20px", borderRadius: 3,
          background: "rgba(93,80,60,0.2)", color: "#85937f",
          border: "1px solid rgba(93,80,60,0.25)", cursor: "pointer",
        }}
      >
        Clear Filters
      </button>
    </div>
  );
}

/* ============================================================
   9. SKELETON CARD
   ============================================================ */
function SkeletonCard() {
  const shimmer = {
    background: "linear-gradient(90deg, rgba(93,80,60,0.1) 25%, rgba(93,80,60,0.18) 50%, rgba(93,80,60,0.1) 75%)",
    backgroundSize: "200% 100%",
    animation: "si-shimmer 1.6s ease-in-out infinite",
    borderRadius: 3,
  };
  return (
    <div style={{
      background: "linear-gradient(135deg, #130f0a 0%, #1a1510 100%)",
      border: "1px solid rgba(93,80,60,0.18)",
      borderRadius: 6, padding: "20px 22px",
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ ...shimmer, width: 48, height: 32 }} />
        <div style={{ ...shimmer, width: 56, height: 18 }} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ ...shimmer, width: 80, height: 30 }} />
        <div style={{ ...shimmer, width: 80, height: 30 }} />
      </div>
      <div style={{ ...shimmer, width: "100%", height: 46 }} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ ...shimmer, width: 60, height: 14 }} />
        <div style={{ ...shimmer, width: 80, height: 28 }} />
      </div>
    </div>
  );
}

/* ============================================================
   10. MINI TIMELINE  (src/components/sessions/SessionTimeline.jsx)
   ============================================================ */
function SessionTimeline({ sessions }) {
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const statusColor = {
    live: "#A4303F", open: "#45B06C", upcoming: "#d4c47a",
    finished: "#5b6d56", closed: "#3d2020", cancelled: "#2a1818",
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #130f0a 0%, #1a1510 100%)",
      border: "1px solid rgba(93,80,60,0.22)",
      borderRadius: 6, padding: "24px 28px", marginBottom: 40,
    }}>
      <div style={{
        fontFamily: "Cinzel, serif", fontSize: 9, letterSpacing: "0.22em",
        color: "rgba(164,208,148,0.38)", marginBottom: 20,
      }}>SESSION TIMELINE — OVERVIEW</div>

      <div style={{
        display: "flex", gap: 0, overflowX: "auto",
        paddingBottom: 8, position: "relative",
      }}>
        {/* spine */}
        <div style={{
          position: "absolute", top: 12, left: 0, right: 0, height: 1,
          background: "rgba(93,80,60,0.2)", zIndex: 0,
        }} />

        {sorted.map((session) => (
          <div key={session.id} style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 8, minWidth: 64, position: "relative", zIndex: 1,
          }}>
            {/* node */}
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              background: statusColor[session.status] ?? "#5b6d56",
              border: `2px solid rgba(0,0,0,0.3)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: session.status === "live"
                ? "0 0 8px rgba(164,48,63,0.7)" : "none",
            }}>
              {session.status === "live" && (
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#FFECCC",
                  animation: "si-pulse 1.4s ease-in-out infinite",
                }} />
              )}
            </div>
            <div style={{
              fontFamily: "Cinzel, serif", fontSize: 9, fontWeight: 700,
              color: "#D4C4A8",
            }}>{session.code}</div>
            <div style={{
              fontFamily: "Cinzel, serif", fontSize: 7, color: "rgba(164,208,148,0.3)",
              whiteSpace: "nowrap",
            }}>{new Date(session.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   11. ERROR STATE
   ============================================================ */
function ErrorState({ message, onRetry }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "72px 24px", textAlign: "center",
      border: "1px solid rgba(164,48,63,0.2)", borderRadius: 6,
      background: "rgba(164,48,63,0.04)",
    }}>
      <div style={{
        fontFamily: "Cinzel, serif", fontSize: 32, marginBottom: 16,
        color: "rgba(164,48,63,0.3)",
      }}>⚠</div>
      <div style={{
        fontFamily: "Cinzel, serif", fontSize: 14, fontWeight: 600,
        letterSpacing: "0.12em", color: "#c08080", marginBottom: 8,
      }}>FAILED TO LOAD SESSIONS</div>
      <div style={{
        fontFamily: "Space Grotesk, sans-serif", fontSize: 13,
        color: "rgba(164,48,63,0.4)", marginBottom: 24,
      }}>{message}</div>
      <button
        type="button"
        onClick={onRetry}
        style={{
          fontFamily: "Cinzel, serif", fontSize: 9, letterSpacing: "0.14em",
          padding: "8px 20px", borderRadius: 3,
          background: "rgba(164,48,63,0.14)", color: "#c08080",
          border: "1px solid rgba(164,48,63,0.3)", cursor: "pointer",
        }}
      >
        Retry
      </button>
    </div>
  );
}

/* ============================================================
   12.  SESSIONS PAGE  (src/pages/SessionsPage.jsx)
   ============================================================ */
const PAGE_SIZE = 8;

export default function SessionsPage({ isDark }) {
  const [filters, setFilters] = useState({
    search: "", status: "all", month: null, sort: "nearest",
  });
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({
    managerId: "",
    sessionCode: "",
    minPlayers: "1",
    maxPlayers: "7",
  });

  const { sessions, liveSession, loading, error, total, refetch } = useSessions(filters);

  const handleOpenCreate = () => {
    setCreateError("");
    setShowCreateModal(true);
  };

  const handleCreateSession = async () => {
    const createdByManagerId = Number(createForm.managerId);
    const minPlayers = Number(createForm.minPlayers);
    const maxPlayers = Number(createForm.maxPlayers);
    const sessionCode = createForm.sessionCode.trim();

    if (!Number.isInteger(createdByManagerId) || createdByManagerId <= 0) {
      setCreateError("Manager ID must be a positive integer.");
      return;
    }
    if (!sessionCode) {
      setCreateError("Session code is required.");
      return;
    }
    if (!Number.isInteger(minPlayers) || minPlayers <= 0) {
      setCreateError("Min players must be a positive integer.");
      return;
    }
    if (!Number.isInteger(maxPlayers) || maxPlayers <= 0 || maxPlayers > 7) {
      setCreateError("Max players must be an integer between 1 and 7.");
      return;
    }
    if (minPlayers > maxPlayers) {
      setCreateError("Min players cannot exceed max players.");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const { created } = await sessionsService.createSession({
        createdByManagerId,
        sessionCode,
        minPlayers,
        maxPlayers,
      });

      await refetch();
      setShowCreateModal(false);
      setCreateForm({
        managerId: "",
        sessionCode: "",
        minPlayers: "1",
        maxPlayers: "7",
      });

      const identifier = created?.sessionCode || created?.sessionId;
      if (identifier) {
        window.location.href = `/sessions/${encodeURIComponent(String(identifier))}`;
      }
    } catch (err) {
      setCreateError(err?.message || "Failed to create session.");
    } finally {
      setCreating(false);
    }
  };

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [JSON.stringify(filters)]);
  const handleFiltersChange = useCallback((nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
  }, []);

  const paginated = useMemo(() => sessions.slice(0, page * PAGE_SIZE), [sessions, page]);
  const hasMore = paginated.length < sessions.length;

  return (
    <>
      {/* ── Keyframe injector ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes si-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.6; transform:scale(0.85); }
        }
        @keyframes si-scan {
          0% { transform:translateX(-100%); }
          100% { transform:translateX(200%); }
        }
        @keyframes si-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes si-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes si-fade-up {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(164,208,148,0.25); }
        select option { background: #1a1510; color: #D4C4A8; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(93,80,60,0.4); border-radius: 2px; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: isDark
          ? "linear-gradient(180deg, #0d0a07 0%, #110e09 40%, #0d0a07 100%)"
          : "linear-gradient(180deg, #fff8f0 0%, #fdf4e7 42%, #fff8f0 100%)",
        color: isDark ? "#D4C4A8" : "#2e1a10",
        fontFamily: "Space Grotesk, sans-serif",
      }}>
        <div style={{
          minHeight: "100vh",
          filter: isDark ? "none" : "invert(1) hue-rotate(180deg) saturate(0.68) brightness(1.01) contrast(0.94) sepia(0.16)",
          transition: "filter 0.2s ease, background 0.2s ease, color 0.2s ease",
        }}>
        {/* ── MAIN ── */}
        <main style={{
          maxWidth: 1280, margin: "0 auto",
          padding: "48px 28px 80px",
          animation: "si-fade-up 0.6s ease both",
        }}>

          {/* ── PAGE HEADER ── */}
          <header style={{ marginBottom: 40 }}>
            <div style={{
              fontFamily: "Cinzel, serif", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.24em", color: "rgba(164,48,63,0.55)",
              marginBottom: 10,
            }}>SHUTTER ISLAND — ARENA SCHEDULE</div>
            <h1 style={{
              fontFamily: "Cinzel, serif", fontSize: "clamp(2.4rem, 5vw, 4rem)",
              fontWeight: 700, letterSpacing: "0.04em",
              color: "#F2D0A4", lineHeight: 1, marginBottom: 12,
            }}>Sessions</h1>
            <p style={{
              fontFamily: "Space Grotesk, sans-serif", fontSize: 14,
              color: "rgba(164,208,148,0.45)", maxWidth: 500,
              lineHeight: 1.6,
            }}>
              Browse every arena session — live, upcoming, and completed.
              Book your spot, place a bet, or watch the live feed.
            </p>

            {/* Ornament divider */}
            <div style={{
              display: "flex", alignItems: "center", gap: 16,
              marginTop: 20, maxWidth: 360,
            }}>
              <div style={{ flex: 1, height: 1, background: "rgba(93,80,60,0.25)" }} />
              <div style={{
                fontFamily: "Cinzel, serif", fontSize: 9,
                color: "rgba(164,208,148,0.25)", letterSpacing: "0.18em",
              }}>◆</div>
              <div style={{ flex: 1, height: 1, background: "rgba(93,80,60,0.25)" }} />
            </div>
          </header>

          {/* ── LIVE BANNER ── */}
          {!loading && !error && liveSession && (
            <FeaturedSessionBanner session={liveSession} />
          )}

          {/* ── TIMELINE ── */}
          {!loading && !error && sessions.length > 0 && (
            <SessionTimeline sessions={sessions.filter((_, i) => i < 20)} />
          )}

          {/* ── FILTERS ── */}
          <SessionFilters
            filters={filters}
            onChange={handleFiltersChange}
          />

          {/* ── RESULTS COUNT ── */}
          {!loading && !error && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
              flexWrap: "wrap",
            }}>
              <div style={{
                fontFamily: "Cinzel, serif", fontSize: 8, letterSpacing: "0.18em",
                color: "rgba(164,208,148,0.3)",
              }}>
                {sessions.length > 0
                  ? `SHOWING ${paginated.length} OF ${total} SESSION${total !== 1 ? "S" : ""}`
                  : "NO RESULTS"}
              </div>

              <button
                type="button"
                onClick={handleOpenCreate}
                style={{
                  fontFamily: "Cinzel, serif",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "10px 16px",
                  borderRadius: 4,
                  border: "1px solid rgba(164,48,63,0.45)",
                  background: "rgba(164,48,63,0.18)",
                  color: "#F2D0A4",
                  cursor: "pointer",
                }}
              >
                + Create Session
              </button>
            </div>
          )}

          {/* ── STATES ── */}
          {error && <ErrorState message={error} onRetry={refetch} />}

          {loading && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 18,
            }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loading && !error && sessions.length === 0 && (
            <EmptyState onClear={() => handleFiltersChange({ search: "", status: "all", month: null, sort: "nearest" })} />
          )}

          {/* ── SESSIONS GRID ── */}
          {!loading && !error && paginated.length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 18,
            }}>
              {paginated.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}

          {/* ── LOAD MORE ── */}
          {!loading && !error && hasMore && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                style={{
                  fontFamily: "Cinzel, serif", fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.16em", padding: "12px 36px",
                  borderRadius: 4,
                  background: "rgba(93,80,60,0.14)",
                  color: "#D4C4A8",
                  border: "1px solid rgba(93,80,60,0.28)",
                  cursor: "pointer", transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(164,48,63,0.18)";
                  e.currentTarget.style.borderColor = "rgba(164,48,63,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(93,80,60,0.14)";
                  e.currentTarget.style.borderColor = "rgba(93,80,60,0.28)";
                }}
              >
                Load More Sessions
              </button>
            </div>
          )}
        </main>

        {showCreateModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(8, 5, 4, 0.72)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 1000,
          }}>
            <div style={{
              width: "min(560px, 100%)",
              background: "#18110d",
              border: "1px solid rgba(164,48,63,0.35)",
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{
                  margin: 0,
                  fontFamily: "Cinzel, serif",
                  fontSize: 18,
                  color: "#F2D0A4",
                  letterSpacing: "0.06em",
                }}>
                  Create Session
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(242,208,164,0.8)",
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              <p style={{ margin: "0 0 16px", color: "rgba(212,196,168,0.72)", fontSize: 13 }}>
                Fill the required details. After creation, you will be redirected to the new session page.
              </p>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                {[
                  { key: "managerId", label: "Manager ID", type: "number", min: 1, placeholder: "e.g. 1" },
                  { key: "sessionCode", label: "Session Code", type: "text", placeholder: "e.g. SESSION-27" },
                  { key: "minPlayers", label: "Min Players", type: "number", min: 1, max: 7 },
                  { key: "maxPlayers", label: "Max Players", type: "number", min: 1, max: 7 },
                ].map((field) => (
                  <label key={field.key} style={{ display: "grid", gap: 6 }}>
                    <span style={{
                      fontFamily: "Cinzel, serif",
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      color: "rgba(164,208,148,0.5)",
                      textTransform: "uppercase",
                    }}>
                      {field.label}
                    </span>
                    <input
                      type={field.type}
                      min={field.min}
                      max={field.max}
                      placeholder={field.placeholder}
                      value={createForm[field.key]}
                      onChange={(event) => {
                        setCreateError("");
                        setCreateForm((prev) => ({ ...prev, [field.key]: event.target.value }));
                      }}
                      style={{
                        minHeight: 40,
                        borderRadius: 4,
                        border: "1px solid rgba(93,80,60,0.42)",
                        background: "rgba(0,0,0,0.24)",
                        color: "#D4C4A8",
                        padding: "0 10px",
                      }}
                    />
                  </label>
                ))}
              </div>

              {createError ? (
                <div style={{
                  marginTop: 14,
                  padding: "10px 12px",
                  borderRadius: 4,
                  border: "1px solid rgba(164,48,63,0.45)",
                  color: "#ffb3bf",
                  background: "rgba(164,48,63,0.18)",
                  fontSize: 13,
                }}>
                  {createError}
                </div>
              ) : null}

              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    padding: "10px 14px",
                    borderRadius: 4,
                    border: "1px solid rgba(93,80,60,0.35)",
                    background: "rgba(93,80,60,0.16)",
                    color: "#D4C4A8",
                    cursor: creating ? "not-allowed" : "pointer",
                    opacity: creating ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateSession}
                  disabled={creating}
                  style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    padding: "10px 16px",
                    borderRadius: 4,
                    border: "1px solid rgba(164,48,63,0.5)",
                    background: "rgba(164,48,63,0.24)",
                    color: "#F2D0A4",
                    cursor: creating ? "not-allowed" : "pointer",
                    opacity: creating ? 0.6 : 1,
                  }}
                >
                  {creating ? "Creating..." : "Create Session"}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}
