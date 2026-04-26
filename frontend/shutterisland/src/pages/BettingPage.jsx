import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./BettingPage.module.css";

const API_BASE = import.meta.env?.VITE_API_URL ?? "http://localhost:4000";
const POLL_INTERVAL_MS = 5000;

function getSessionIdFromPath() {
  const match = window.location.pathname.match(/\/bet\/([^/]+)/i);
  return match ? match[1] : null;
}

async function apiFetch(path, fallback = null) {
  try {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`[BettingPage] API fetch failed for ${path}:`, error.message);
    return fallback;
  }
}

function formatMoney(value) {
  if (value == null || Number.isNaN(Number(value))) return "TBD";
  return `$${Number(value).toLocaleString()}`;
}

function formatDateTime(value) {
  if (!value) return "—";
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
  if (["active", "live", "running"].includes(normalized)) return "active";
  if (["finished", "completed"].includes(normalized)) return "finished";
  if (["paused"].includes(normalized)) return "paused";
  if (["cancelled"].includes(normalized)) return "cancelled";
  return "waiting";
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

function ContenderCard({ contender, leader = false }) {
  return (
    <article className={`${styles.contenderCard} ${leader ? styles.contenderLeader : ""}`}>
      <div className={styles.contenderTop}>
        <div>
          <div className={styles.contenderName}>{contender.name}</div>
          <div className={styles.contenderMeta}>
            Slot {String(contender.slotNumber ?? "?").padStart(2, "0")} · {contender.state}
          </div>
        </div>
        <div className={styles.contenderOdds}>{contender.oddsLabel}</div>
      </div>
      <div className={styles.contenderBarTrack}>
        <div
          className={styles.contenderBarFill}
          style={{ width: `${contender.confidence}%` }}
        />
      </div>
      <div className={styles.contenderBottom}>
        <span>{contender.supportLabel}</span>
        <a href={`/watch/${encodeURIComponent(contender.sessionId)}`} className={styles.inlineLink}>
          Watch session
        </a>
      </div>
    </article>
  );
}

function ActivityList({ activities }) {
  if (!activities.length) {
    return <div className={styles.emptyState}>No recent market activity yet.</div>;
  }

  return (
    <div className={styles.activityList}>
      {activities.map((item) => (
        <div key={item.id} className={styles.activityItem}>
          <div className={styles.activityTime}>{item.time}</div>
          <div className={styles.activityBody}>
            <div className={styles.activityTitle}>{item.title}</div>
            <div className={styles.activityText}>{item.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketPanel({ sessionId, sessionCode }) {
  /*
    TODO: Missing backend API — Betting summary
    Endpoint needed : GET /api/betting/sessions/:sessionId/summary
    Method          : GET
    Expected shape  : {
                        sessionId: number,
                        sessionCode: string,
                        totalPool: number,
                        currency: string,
                        totalBets: number,
                        openBets: number,
                        markets: [{
                          marketId: number,
                          title: string,
                          status: "Open" | "Suspended" | "Settled",
                          options: [{
                            optionId: number,
                            label: string,
                            odds: number,
                            totalStake: number
                          }]
                        }]
                      }
    Used in         : MarketPanel (BettingPage.jsx)
    Module          : backend/src/modules/LiveStreamingPaymentBetting/live.routes.js
  */

  /*
    TODO: Missing backend API — Place bet
    Endpoint needed : POST /api/betting/sessions/:sessionId/bets
    Method          : POST
    Expected body   : {
                        marketId: number,
                        optionId: number,
                        stake: number
                      }
    Expected shape  : {
                        betId: number,
                        status: "Pending" | "Accepted",
                        message: string
                      }
    Used in         : primary CTA buttons in MarketPanel (BettingPage.jsx)
    Module          : backend/src/modules/LiveStreamingPaymentBetting/live.routes.js
  */

  return (
    <div className={styles.marketPanel}>
      <div className={styles.marketBanner}>
        <div className={styles.marketEyebrow}>Betting Markets</div>
        <div className={styles.marketTitle}>Session {sessionCode || sessionId} markets are not live yet</div>
        <div className={styles.marketText}>
          The page is wired for real betting integration, but the backend market and bet-placement APIs
          still need to be added.
        </div>
      </div>

      <div className={styles.marketGrid}>
        {[
          { title: "Final Winner", state: "Pending API", note: "Choose the player most likely to survive the arena." },
          { title: "First Elimination", state: "Pending API", note: "Predict who will be eliminated before the first room unlock." },
          { title: "Survival Duration", state: "Pending API", note: "Bet on who lasts the longest before the session ends." },
        ].map((market) => (
          <article key={market.title} className={styles.marketCard}>
            <div className={styles.marketCardTop}>
              <div className={styles.marketCardTitle}>{market.title}</div>
              <span className={styles.marketState}>{market.state}</span>
            </div>
            <div className={styles.marketCardText}>{market.note}</div>
            <button type="button" className={styles.marketButton} disabled>
              API required
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function BettingPage() {
  const requestedSessionId = getSessionIdFromPath();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState(requestedSessionId);
  const [sessions, setSessions] = useState([]);
  const [sessionPerformance, setSessionPerformance] = useState([]);
  const [syncState, setSyncState] = useState(null);
  const [progression, setProgression] = useState(null);
  const [timer, setTimer] = useState(null);
  const [eliminations, setEliminations] = useState([]);

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

    const activeOrRequested =
      sessionsRes.find((session) => String(session.sessionId) === String(requestedSessionId || "")) ||
      sessionsRes.find((session) => normalizeStatus(session.status).toLowerCase() === "active") ||
      sessionsRes[0];

    const resolvedSessionId = String(activeOrRequested.sessionId);
    setSelectedSessionId(resolvedSessionId);
    setSessions(sessionsRes);
    setSessionPerformance(Array.isArray(performanceRes) ? performanceRes : []);

    const [syncRes, progressionRes, timerRes, eliminationsRes] = await Promise.all([
      apiFetch(`/api/game-management/sessions/${resolvedSessionId}/state/sync`, null),
      apiFetch(`/api/game-management/sessions/${resolvedSessionId}/levels/progression`, null),
      apiFetch(`/api/game-management/sessions/${resolvedSessionId}/timer`, null),
      apiFetch(`/api/game-management/sessions/${resolvedSessionId}/eliminations`, null),
    ]);

    setSyncState(syncRes);
    setProgression(progressionRes);
    setTimer(timerRes?.timer ?? null);
    setEliminations(eliminationsRes?.eliminations ?? []);
    setLoading(false);
  }, [requestedSessionId]);

  useEffect(() => {
    loadPage();
    const intervalId = window.setInterval(() => {
      loadPage();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [loadPage]);

  const selectedSession = useMemo(
    () => sessions.find((session) => String(session.sessionId) === String(selectedSessionId || "")) ?? null,
    [sessions, selectedSessionId],
  );

  const performanceEntry = useMemo(
    () =>
      sessionPerformance.find((entry) => String(entry.sessionId) === String(selectedSessionId || "")) ?? null,
    [sessionPerformance, selectedSessionId],
  );

  const contenders = useMemo(() => {
    const participants = Array.isArray(syncState?.participants) ? syncState.participants : [];
    const total = participants.length || 1;

    return participants
      .map((participant, index) => {
        const alive = Boolean(participant.isAlive);
        const confidenceBase = alive ? 78 : 34;
        const confidence = Math.max(18, Math.min(96, confidenceBase - (index * 6)));
        const impliedOdds = (alive ? 1.4 + (index * 0.28) : 3.4 + (index * 0.35)).toFixed(2);

        return {
          sessionId: selectedSessionId,
          playerId: participant.playerId,
          name: participant.playerName || `Player ${participant.playerId}`,
          slotNumber: participant.slotNumber,
          state: alive ? "Alive" : "Eliminated",
          confidence,
          oddsLabel: `x${impliedOdds}`,
          supportLabel: `${Math.round((confidence / 100) * total * 12)} support points`,
          alive,
        };
      })
      .sort((a, b) => Number(b.alive) - Number(a.alive) || b.confidence - a.confidence);
  }, [selectedSessionId, syncState?.participants]);

  const activityItems = useMemo(() => {
    const eliminationItems = eliminations.map((entry) => ({
      id: `elim-${entry.eliminationId}`,
      time: formatDateTime(entry.eliminatedAt),
      title: entry.player?.playerName || "Unknown player",
      text: `Market sentiment shifted after ${entry.roomName || "the current room"} elimination.`,
    }));

    const eventItems = (Array.isArray(syncState?.recentEvents) ? syncState.recentEvents : []).map((entry) => ({
      id: `event-${entry.eventId}`,
      time: formatDateTime(entry.createdAt),
      title: entry.eventType || "Arena event",
      text: "Use this event activity to highlight where real betting market movement should plug in.",
    }));

    return [...eliminationItems, ...eventItems]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);
  }, [eliminations, syncState?.recentEvents]);

  const sessionCode = selectedSession?.id || progression?.sessionCode || selectedSessionId;
  const sessionState = selectedSession?.status || timer?.sessionStatus || syncState?.sessionStatus || "Unknown";
  const aliveCount =
    progression?.remainingPlayers ??
    performanceEntry?.alivePlayers ??
    contenders.filter((contender) => contender.alive).length;
  const totalPlayers =
    performanceEntry?.totalPlayers ??
    (Array.isArray(syncState?.participants) ? syncState.participants.length : selectedSession?.participants) ??
    0;
  const estimatedPool = totalPlayers > 0 ? totalPlayers * 12450 : null;
  const openMarkets = contenders.length ? Math.min(3, Math.max(1, contenders.length - 1)) : 0;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.headerCard}>
          <div>
            <div className={styles.eyebrow}>Betting Command</div>
            <h1 className={styles.title}>Session {sessionCode} Betting Floor</h1>
            <div className={styles.headerMeta}>
              <StatusBadge status={sessionState} />
              <span className={styles.metaText}>
                Current room: {progression?.currentRoom?.roomName || "Awaiting activation"}
              </span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <a href={`/watch/${encodeURIComponent(selectedSessionId || "7")}`} className={styles.secondaryButton}>
              Watch Live
            </a>
            <a href={`/sessions/${encodeURIComponent(selectedSessionId || "7")}`} className={styles.secondaryButton}>
              Session Details
            </a>
          </div>
        </header>

        {error ? (
          <div className={styles.stateCard}>{error}</div>
        ) : loading ? (
          <div className={styles.stateCard}>Loading betting floor...</div>
        ) : (
          <>
            <section className={styles.summaryGrid}>
              <SummaryCard label="Estimated Pool" value={formatMoney(estimatedPool)} hint="Derived from active session data until betting API exists" />
              <SummaryCard label="Open Markets" value={String(openMarkets)} hint="Placeholder market count until backend exposes betting markets" />
              <SummaryCard label="Alive Contenders" value={String(aliveCount)} hint={`${totalPlayers} participants tracked in the current session`} />
              <SummaryCard label="Last Sync" value={formatDateTime(syncState?.syncedAt || timer?.serverTime)} hint="Auto-refreshes every 5 seconds" />
            </section>

            <section className={styles.contentGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div className={styles.panelTitle}>Contender Board</div>
                  <div className={styles.panelSub}>Derived from session sync data</div>
                </div>
                {contenders.length ? (
                  <div className={styles.contenderGrid}>
                    {contenders.map((contender, index) => (
                      <ContenderCard
                        key={contender.playerId || contender.name}
                        contender={contender}
                        leader={index === 0}
                      />
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>No participants available for betting analysis yet.</div>
                )}
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div className={styles.panelTitle}>Market Pulse</div>
                  <div className={styles.panelSub}>Session {sessionCode}</div>
                </div>
                <ActivityList activities={activityItems} />
              </article>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitle}>Betting Markets</div>
                <div className={styles.panelSub}>Backend integration pending</div>
              </div>
              <MarketPanel sessionId={selectedSessionId} sessionCode={sessionCode} />
            </section>
          </>
        )}
      </section>
    </main>
  );
}
