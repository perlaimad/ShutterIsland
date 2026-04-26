import { Router } from "express";
import { pool } from "../../config/db.js";

export const liveStreamingPaymentBettingRouter = Router();

const asPositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const toIsoString = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const formatMoney = (amount) => {
  const numeric = Number(amount || 0);
  return `$${numeric.toLocaleString("en-US", {
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const normalizeSessionStatus = (status) => {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "active") return "live";
  if (normalized === "paused") return "paused";
  if (normalized === "finished") return "finished";
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "lobby") return "upcoming";

  return normalized || "unknown";
};

const findSessionByIdentifier = async (connection, identifier) => {
  const numericId = asPositiveInteger(identifier);
  const [rows] = await connection.execute(
    `SELECT
       gs.session_id,
       gs.session_code,
       gs.status,
       gs.created_at,
       gs.started_at,
       gs.ended_at,
       ls.stream_id,
       ls.stream_status,
       ls.stream_url,
       ls.encryption_mode,
       ls.started_at AS stream_started_at,
       ls.ended_at AS stream_ended_at
     FROM game_session gs
     LEFT JOIN live_stream ls
       ON ls.session_id = gs.session_id
     WHERE gs.session_id = ? OR LOWER(gs.session_code) = LOWER(?)
     LIMIT 1`,
    [numericId ?? 0, String(identifier || "").trim()]
  );

  return rows[0] ?? null;
};

liveStreamingPaymentBettingRouter.get("/sessions/:sessionIdentifier/live", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const session = await findSessionByIdentifier(connection, req.params.sessionIdentifier);

    if (!session) {
      return res.status(404).json({
        message: "Session not found.",
      });
    }

    const [participantsRows] = await connection.execute(
      `SELECT
         sp.player_id,
         p.display_name,
         sp.slot_number,
         sp.is_alive,
         sp.final_rank,
         sp.joined_at,
         sp.eliminated_at,
         sr.session_room_id,
         sr.room_index,
         sr.status AS room_status,
         r.name AS room_name,
         COALESCE(player_bets.total_bet_amount, 0) AS total_bet_amount,
         COALESCE(player_bets.pending_bet_amount, 0) AS pending_bet_amount,
         COALESCE(player_bets.bet_count, 0) AS bet_count
       FROM session_player sp
       JOIN player p
         ON p.player_id = sp.player_id
       LEFT JOIN (
         SELECT
           srp.player_id,
           sr.session_id,
           srp.session_room_id
         FROM session_room_player srp
         JOIN session_room sr
           ON sr.session_room_id = srp.session_room_id
         INNER JOIN (
           SELECT
             srp2.player_id,
             sr2.session_id,
             MAX(CONCAT(
               DATE_FORMAT(srp2.entered_at, '%Y%m%d%H%i%s'),
               LPAD(srp2.session_room_id, 10, '0')
             )) AS latest_marker
           FROM session_room_player srp2
           JOIN session_room sr2
             ON sr2.session_room_id = srp2.session_room_id
           WHERE sr2.session_id = ?
           GROUP BY srp2.player_id, sr2.session_id
         ) latest
           ON latest.player_id = srp.player_id
          AND latest.session_id = sr.session_id
          AND CONCAT(
            DATE_FORMAT(srp.entered_at, '%Y%m%d%H%i%s'),
            LPAD(srp.session_room_id, 10, '0')
          ) = latest.latest_marker
       ) latest_room
         ON latest_room.player_id = sp.player_id
        AND latest_room.session_id = sp.session_id
       LEFT JOIN session_room sr
         ON sr.session_room_id = latest_room.session_room_id
       LEFT JOIN room r
         ON r.room_id = sr.room_id
       LEFT JOIN (
         SELECT
           b.session_id,
           b.player_id,
           SUM(b.bet_amount) AS total_bet_amount,
           SUM(CASE WHEN LOWER(b.bet_status) = 'pending' THEN b.bet_amount ELSE 0 END) AS pending_bet_amount,
           COUNT(*) AS bet_count
         FROM bet b
         WHERE b.player_id IS NOT NULL
         GROUP BY b.session_id, b.player_id
       ) player_bets
         ON player_bets.session_id = sp.session_id
        AND player_bets.player_id = sp.player_id
       WHERE sp.session_id = ?
       ORDER BY sp.slot_number ASC, sp.player_id ASC`,
      [session.session_id, session.session_id]
    );

    const [poolRows] = await connection.execute(
      `SELECT
         COALESCE(SUM(bet_amount), 0) AS total_pool,
         COALESCE(SUM(CASE WHEN LOWER(bet_status) = 'pending' THEN bet_amount ELSE 0 END), 0) AS open_pool,
         COUNT(*) AS total_bets,
         COUNT(DISTINCT viewer_identifier) AS unique_viewers
       FROM bet
       WHERE session_id = ?`,
      [session.session_id]
    );

    const [oddsRows] = await connection.execute(
      `SELECT
         sp.player_id,
         p.display_name,
         COALESCE(SUM(b.bet_amount), 0) AS amount_backed,
         COUNT(b.bet_id) AS bet_count
       FROM session_player sp
       JOIN player p
         ON p.player_id = sp.player_id
       LEFT JOIN bet b
         ON b.session_id = sp.session_id
        AND b.player_id = sp.player_id
       WHERE sp.session_id = ?
       GROUP BY sp.player_id, p.display_name
       ORDER BY amount_backed DESC, bet_count DESC, sp.player_id ASC`,
      [session.session_id]
    );

    const [accessRows] = await connection.execute(
      `SELECT
         access_status,
         COUNT(*) AS count
       FROM viewer_access_key
       WHERE stream_id = ?
       GROUP BY access_status`,
      [session.stream_id ?? 0]
    );

    const [topBetRows] = await connection.execute(
      `SELECT
         b.bet_id,
         b.viewer_identifier,
         b.bet_type,
         b.predicted_value,
         b.bet_amount,
         b.bet_status,
         b.placed_at,
         p.display_name AS player_name
       FROM bet b
       LEFT JOIN player p
         ON p.player_id = b.player_id
       WHERE b.session_id = ?
       ORDER BY b.bet_amount DESC, b.placed_at ASC
       LIMIT 1`,
      [session.session_id]
    );

    const totalPool = Number(poolRows[0]?.total_pool || 0);
    const openPool = Number(poolRows[0]?.open_pool || 0);
    const totalBets = Number(poolRows[0]?.total_bets || 0);
    const activePlayerCount = participantsRows.filter((row) => Number(row.is_alive) === 1).length;
    const totalBackedAmount = oddsRows.reduce((sum, row) => sum + Number(row.amount_backed || 0), 0);

    const participants = participantsRows.map((row) => ({
      playerId: Number(row.player_id),
      displayName: row.display_name,
      slotNumber: Number(row.slot_number),
      isAlive: Boolean(row.is_alive),
      finalRank: row.final_rank === null ? null : Number(row.final_rank),
      joinedAt: toIsoString(row.joined_at),
      eliminatedAt: toIsoString(row.eliminated_at),
      room: row.session_room_id ? {
        sessionRoomId: Number(row.session_room_id),
        roomIndex: Number(row.room_index),
        roomName: row.room_name,
        roomStatus: row.room_status,
      } : null,
      betting: {
        totalBetAmount: Number(row.total_bet_amount || 0),
        totalBetDisplay: formatMoney(row.total_bet_amount || 0),
        pendingBetAmount: Number(row.pending_bet_amount || 0),
        pendingBetDisplay: formatMoney(row.pending_bet_amount || 0),
        betCount: Number(row.bet_count || 0),
      },
    }));

    const odds = oddsRows.map((row) => {
      const amountBacked = Number(row.amount_backed || 0);
      const marketShare = totalBackedAmount > 0 ? amountBacked / totalBackedAmount : 0;
      const impliedOdds = marketShare > 0 ? Number((1 / marketShare).toFixed(2)) : null;

      return {
        playerId: Number(row.player_id),
        displayName: row.display_name,
        amountBacked,
        amountBackedDisplay: formatMoney(amountBacked),
        betCount: Number(row.bet_count || 0),
        marketSharePercent: Number((marketShare * 100).toFixed(2)),
        impliedOdds,
      };
    });

    const topBet = topBetRows[0]
      ? {
          betId: Number(topBetRows[0].bet_id),
          viewerIdentifier: topBetRows[0].viewer_identifier,
          betType: topBetRows[0].bet_type,
          predictedValue: topBetRows[0].predicted_value,
          amount: Number(topBetRows[0].bet_amount || 0),
          amountDisplay: formatMoney(topBetRows[0].bet_amount || 0),
          status: topBetRows[0].bet_status,
          placedAt: toIsoString(topBetRows[0].placed_at),
          playerName: topBetRows[0].player_name || null,
        }
      : null;

    const mvpCandidate = [...participants].sort((a, b) => {
      const rankA = a.finalRank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.finalRank ?? Number.MAX_SAFE_INTEGER;

      if (rankA !== rankB) return rankA - rankB;
      if (a.isAlive !== b.isAlive) return Number(b.isAlive) - Number(a.isAlive);

      return b.betting.totalBetAmount - a.betting.totalBetAmount;
    })[0] ?? null;

    return res.json({
      session: {
        sessionId: Number(session.session_id),
        id: session.session_code,
        status: normalizeSessionStatus(session.status),
        startsAt: toIsoString(session.started_at ?? session.created_at),
        endedAt: toIsoString(session.ended_at),
        stream: session.stream_id ? {
          streamId: Number(session.stream_id),
          status: String(session.stream_status || "").toLowerCase(),
          url: session.stream_url,
          encryptionMode: session.encryption_mode,
          startedAt: toIsoString(session.stream_started_at),
          endedAt: toIsoString(session.stream_ended_at),
        } : null,
        pool: {
          amount: totalPool,
          display: formatMoney(totalPool),
          openAmount: openPool,
          openDisplay: formatMoney(openPool),
          totalBets,
          uniqueViewers: Number(poolRows[0]?.unique_viewers || 0),
        },
      },
      streamAccess: {
        totalKeys: accessRows.reduce((sum, row) => sum + Number(row.count || 0), 0),
        byStatus: accessRows.map((row) => ({
          status: row.access_status,
          count: Number(row.count || 0),
        })),
      },
      activePlayerCount,
      participants,
      odds,
      mvp: mvpCandidate ? {
        playerId: mvpCandidate.playerId,
        displayName: mvpCandidate.displayName,
        isAlive: mvpCandidate.isAlive,
        finalRank: mvpCandidate.finalRank,
        totalBetAmount: mvpCandidate.betting.totalBetAmount,
        totalBetDisplay: mvpCandidate.betting.totalBetDisplay,
      } : null,
      topBet,
    });
  } catch (error) {
    console.error("Live session metrics error:", error);
    return res.status(500).json({
      message: "Failed to load live session metrics",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});
