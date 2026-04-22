import { useEffect, useMemo, useState } from "react";
import homepageData from "../data/homepageData.json";
import styles from "./HomePage.module.css";

const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function dateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function MapGraphic({ markers }) {
  const arenaPath =
    "M120,18 C138,14 158,22 170,36 C185,52 188,68 184,84 C192,96 196,112 190,128 C196,144 194,162 182,174 C188,190 184,208 172,220 C160,234 142,242 124,246 C106,250 88,246 74,236 C58,228 50,212 48,196 C36,184 30,166 34,150 C26,136 26,118 34,104 C28,88 32,70 44,58 C54,44 70,34 86,26 C96,20 108,20 120,18 Z";
  const sourceWidth = 348;
  const sourceHeight = 440;
  const viewWidth = 240;
  const viewHeight = 300;

  const projectX = (x) => (x / sourceWidth) * viewWidth;
  const projectY = (y) => (y / sourceHeight) * viewHeight;
  const projectDx = (dx) => (dx / sourceWidth) * viewWidth;
  const projectDy = (dy) => (dy / sourceHeight) * viewHeight;

  return (
    <svg className={styles.mapSvg} viewBox="0 0 240 300" width="230" height="282" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="arenaBoundaryClip">
          <path d={arenaPath} />
        </clipPath>
      </defs>

      <path
        d={arenaPath}
        fill="none"
        stroke="#F2D0A4"
        strokeWidth="1.5"
        opacity="0.9"
      />

      <g clipPath="url(#arenaBoundaryClip)">
        <ellipse cx="120" cy="140" rx="80" ry="98" fill="none" stroke="rgba(164,48,63,0.18)" strokeWidth="0.8" strokeDasharray="4 3" />
        <ellipse cx="120" cy="140" rx="62" ry="78" fill="none" stroke="rgba(164,48,63,0.28)" strokeWidth="0.8" strokeDasharray="4 3" />

        <line x1="120" y1="18" x2="120" y2="262" stroke="rgba(164,48,63,0.1)" strokeWidth="0.8" strokeDasharray="2 8" />
        <line x1="32" y1="140" x2="208" y2="140" stroke="rgba(164,48,63,0.1)" strokeWidth="0.8" strokeDasharray="2 8" />

        <path d="M64,42 Q86,88 74,140 Q68,188 78,236" fill="none" stroke="#A4303F" strokeDasharray="3 5" strokeWidth="0.8" opacity="0.35" />
        <path d="M112,34 Q130,88 124,144 Q118,198 136,242" fill="none" stroke="#b8860b" strokeDasharray="3 5" strokeWidth="0.8" opacity="0.35" />
        <path d="M172,42 Q154,98 166,146 Q176,192 162,246" fill="none" stroke="#8b4513" strokeDasharray="3 5" strokeWidth="0.8" opacity="0.35" />

        <g>
          <rect className={styles.obstacleBlock} x="74" y="76" width="16" height="12" rx="1" />
          <line className={styles.obstacleLine} x1="74" y1="82" x2="60" y2="90" />
        </g>
        <g>
          <rect className={styles.obstacleBlock} x="150" y="66" width="18" height="10" rx="1" />
          <line className={styles.obstacleLine} x1="168" y1="70" x2="180" y2="78" />
        </g>
        <g>
          <rect className={styles.obstacleBlock} x="168" y="134" width="14" height="14" rx="1" />
          <line className={styles.obstacleLine} x1="168" y1="141" x2="156" y2="148" />
        </g>
        <g>
          <rect className={styles.obstacleBlock} x="84" y="182" width="14" height="14" rx="1" />
          <line className={styles.obstacleLine} x1="98" y1="188" x2="112" y2="182" />
        </g>
        <g>
          <rect className={styles.obstacleBlock} x="114" y="130" width="12" height="16" rx="1" />
          <line className={styles.obstacleLine} x1="120" y1="146" x2="128" y2="158" />
        </g>

        <circle cx="104" cy="42" r="5" fill="#F2D0A4" opacity="0.9" />
        <text className={styles.mapCaption} x="113" y="44" fontFamily="Cinzel, serif" fontSize="6" style={{ fill: "#F2D0A4" }}>START</text>

        <g>
          <polygon points="196,18 192,24 200,24" fill="rgba(164,48,63,0.55)" />
          <text className={styles.mapCaption} x="196" y="15" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="6" style={{ fill: "#A4303F" }}>N</text>
        </g>

        {markers.map((marker) => {
          const px = projectX(marker.x);
          const py = projectY(marker.y);
          const labelX = px + projectDx(marker.labelDx);
          const labelY = py + projectDy(marker.labelDy);

          return (
          <g key={marker.name}>
            <circle cx={px} cy={py} r="9" fill={marker.color} opacity="0.15" />
            <circle cx={px} cy={py} r="5.5" fill={marker.color} />
            <circle className={styles.markerCore} cx={px} cy={py} r="2" />
            <text
              className={styles.mapCaption}
              x={labelX}
              y={labelY}
              fontFamily="'Share Tech Mono', monospace"
              fontSize="6"
              style={{ fill: marker.color }}
            >
              {marker.name}
            </text>
          </g>
        );
        })}

        <g className={styles.mapTarget} transform="translate(138,248)">
          <circle cx="0" cy="0" r="10" fill="none" stroke="#A4303F" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
          <circle cx="0" cy="0" r="6" fill="none" stroke="#A4303F" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.25" />
        </g>
        <text className={`${styles.mapCaption} ${styles.markLabel}`} x="128" y="265" fontFamily="Cinzel, serif" fontSize="6">MARK</text>
      </g>

      <text
        className={styles.mapCaption}
        x="120"
        y="286"
        textAnchor="middle"
        fontFamily="Cinzel, serif"
        fontSize="7"
        fontWeight="600"
        letterSpacing="3"
        opacity="0.6"
      >
        SHUTTER ISLAND
      </text>
    </svg>
  );
}

function HomePage() {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [viewers, setViewers] = useState(1204);
  const [bets, setBets] = useState(342);
  const [winnerImageBroken, setWinnerImageBroken] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(257);
  const [isCountdownFlashing, setIsCountdownFlashing] = useState(false);
  const [curYear, setCurYear] = useState(2026);
  const [curMonth, setCurMonth] = useState(3);
  const [selectedDay, setSelectedDay] = useState(null);

  const sessions = useMemo(
    () => homepageData.sessions.map((session) => {
      const [year, month, day] = session.date.split("-").map(Number);
      return { ...session, dateObj: new Date(year, month - 1, day) };
    }),
    [],
  );

  const players = useMemo(() => homepageData.overlayPlayers, []);
  const livePlayers = useMemo(() => homepageData.livePlayers, []);
  const eliminationLog = useMemo(() => homepageData.eliminationLog, []);
  const mapMarkers = useMemo(() => homepageData.mapMarkers, []);

  const leadingPlayer = useMemo(() => players.find((player) => player.leading) ?? players[0], [players]);
  const leadingOdds = useMemo(() => (1.25 + (100 - leadingPlayer.survival) / 75).toFixed(2), [leadingPlayer.survival]);

  const countdown = useMemo(() => {
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    const s = secondsLeft % 60;
    return {
      h: String(h).padStart(2, "0"),
      m: String(m).padStart(2, "0"),
      s: String(s).padStart(2, "0"),
    };
  }, [secondsLeft]);

  useEffect(() => {
    const viewerTimer = window.setInterval(() => {
      setViewers((prev) => Math.max(0, prev + Math.floor(Math.random() * 9) - 3));
    }, 3200);

    const betTimer = window.setInterval(() => {
      setBets((prev) => prev + Math.floor(Math.random() * 3));
    }, 4800);

    const countdownTimer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(viewerTimer);
      window.clearInterval(betTimer);
      window.clearInterval(countdownTimer);
    };
  }, []);

  useEffect(() => {
    if (secondsLeft > 0) {
      setIsCountdownFlashing(false);
      return undefined;
    }

    const flashTimer = window.setInterval(() => {
      setIsCountdownFlashing((prev) => !prev);
    }, 450);

    return () => {
      window.clearInterval(flashTimer);
    };
  }, [secondsLeft]);

  useEffect(() => {
    setWinnerImageBroken(false);
  }, [leadingPlayer.id]);

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(curYear, curMonth, 1).getDay();
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ type: "empty", key: `empty-${curYear}-${curMonth}-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(curYear, curMonth, day);
      const sessionItems = sessions.filter((session) => dateKey(session.dateObj) === dateKey(date));
      cells.push({
        type: "day",
        key: dateKey(date),
        day,
        date,
        sessions: sessionItems,
      });
    }

    return cells;
  }, [curMonth, curYear, sessions]);

  const upcomingSessions = useMemo(
    () => sessions.filter((session) => session.status === "upcoming"),
    [sessions],
  );

  const handleDaySelect = (dayCell) => {
    if (!dayCell.sessions.length) {
      return;
    }
    const clickedKey = dateKey(dayCell.date);
    setSelectedDay((prev) => (prev === clickedKey ? null : clickedKey));
  };

  const handleMonthChange = (delta) => {
    setSelectedDay(null);
    setCurMonth((prevMonth) => {
      const next = prevMonth + delta;
      if (next < 0) {
        setCurYear((prevYear) => prevYear - 1);
        return 11;
      }
      if (next > 11) {
        setCurYear((prevYear) => prevYear + 1);
        return 0;
      }
      return next;
    });
  };

  return (
    <main className={`${styles.page} min-h-screen w-full overflow-x-hidden bg-[#fff8f0] text-[#2e1a10] dark:bg-[#140b08]! dark:text-[#f2d0a4]!`}>
      <div className={`${styles.root} min-h-screen`}>
        <h2 className="sr-only">Project Shutter Island - live arena platform</h2>

        <section className={`${styles.hero} min-h-0`}>
          <div className={styles.heroMap}>
            <div className={`${styles.mapCorner} ${styles.mapCornerTl}`} />
            <div className={`${styles.mapCorner} ${styles.mapCornerTr}`} />
            <div className={`${styles.mapCorner} ${styles.mapCornerBl}`} />
            <div className={`${styles.mapCorner} ${styles.mapCornerBr}`} />
            <MapGraphic markers={mapMarkers} />
          </div>

          <div className={styles.heroCenter}>
            <div className={styles.heroEyebrow}>Session VII - Live Now</div>
            <h1 className={styles.heroTitle}>
              Step into
              <br />
              the Arena
            </h1>
            <div className={styles.heroTitleSub}>Project Shutter Island</div>
            <div className={styles.dividerOrnament}>
              <div className={styles.dividerLine} />
              <div className={styles.dividerDiamond} />
              <div className={styles.dividerLine} />
            </div>
            <p className={styles.heroDesc}>
              A sealed indoor playground. Only one survives. Meet the players, study
              their history, and place your bet before the gates close.
            </p>

            <div className={styles.countdownBlock}>
              <div className={`${styles.heroEyebrow} ${isCountdownFlashing ? styles.flash : ""}`}>BET WINDOW CLOSES IN</div>
              <div className={styles.countdownDigits}>
                {countdown.h}
                <em>H</em>
                {countdown.m}
                <em>M</em>
                {countdown.s}
                <em>S</em>
              </div>
            </div>

            <button type="button" className={styles.btnArena}>Book a Session</button>
            <div className={styles.spacer} />
            <button type="button" className={styles.btnPlayers} onClick={() => setOverlayOpen(true)}>
              Meet the Players
            </button>
          </div>

          <aside className={styles.heroLive}>
            <div className={styles.liveLabel}>Live Feed</div>
            <div className={styles.liveScreen}>
              <div className={styles.liveGridBg} />
              <div className={styles.liveVignette} />
              <div className={styles.liveBadge}>
                <span className={styles.liveBadgeDot} />
                Live
              </div>
              <div className={styles.liveViewers}>{viewers.toLocaleString()} watching</div>
              <div className={styles.livePulseWrap}>
                <div className={styles.pulseRing}>
                  <div className={styles.pulseDot} />
                </div>
                <div className={styles.liveArenaText}>Arena Feed</div>
              </div>
            </div>

            <div className={styles.liveMeta}>
              <div className={styles.liveMetaLeft}>
                <div className={styles.sessionName}>Session VII - Round 3</div>
                <div className={styles.sessionSub}>5 players remaining</div>
              </div>
              <button type="button" className={styles.btnWatch}>Watch</button>
            </div>

            <div className={styles.liveLower}>
              <div className={styles.winnerPopup} aria-label="Leading player card">
                <span className={styles.mvpBadge}>MVP</span>
                {leadingPlayer.image && !winnerImageBroken ? (
                  <img
                    className={styles.winnerPortrait}
                    src={leadingPlayer.image}
                    alt={`${leadingPlayer.name} portrait`}
                    onError={() => setWinnerImageBroken(true)}
                  />
                ) : (
                  <div className={styles.winnerSilhouette} aria-hidden="true">
                    <span className={styles.silhouetteHead} />
                    <span className={styles.silhouetteBody} />
                  </div>
                )}
                <div className={styles.winnerDetails}>
                  <span className={styles.winnerKicker}>Current Favorite</span>
                  <strong>{leadingPlayer.name}</strong>
                  <span className={styles.winnerRole}>{leadingPlayer.role}</span>
                  <span className={styles.winnerBet}>Top Bet: $13,504</span>
                  <div className={styles.winnerMetaRow}>
                    <span className={styles.winnerMetaChip}>Odds x{leadingOdds}</span>
                    <span className={styles.winnerMetaChip}>Pool $104,402</span>
                  </div>
                </div>
              </div>

              <div className={styles.elimLog}>
                <div className={styles.elimLogLabel}>Elimination Log</div>
                {eliminationLog.map((entry) => (
                  <div key={`${entry.time}-${entry.name}`} className={styles.elimEntry}>
                    {entry.time} - <span className={styles.elimEntryName}>{entry.name}</span> eliminated
                  </div>
                ))}
              </div>

              <div className={styles.miniStats}>
                <div className={styles.miniCard}>
                  <div className={styles.miniLabel}>Active Bets</div>
                  <div className={styles.miniValue}>{bets}</div>
                </div>
                <div className={styles.miniCard}>
                  <div className={styles.miniLabel}>Eliminated</div>
                  <div className={styles.miniValueDanger}>3</div>
                </div>
              </div>

              {livePlayers.map((player) => (
                <article key={player.name} className={styles.livePlayerCard}>
                  <div className={styles.livePlayerHead}>
                    <div>
                      <div className={styles.livePlayerName}>{player.name}</div>
                      <div className={styles.livePlayerStat}>{player.stat}</div>
                    </div>
                    {player.mvp ? <div className={styles.mvpTag}>MVP</div> : null}
                  </div>
                  {player.topBet ? <div className={styles.livePlayerTopBet}>Top Bet: {player.topBet}</div> : null}
                  <div className={styles.livePlayerMeta}>
                    <span className={styles.livePlayerPill}>ODDS x{player.odds}</span>
                    <span className={styles.livePlayerPill}>{player.pool}</span>
                  </div>
                  <div className={styles.livePlayerBarTrack}>
                    <div className={styles.livePlayerBarFill} style={{ width: `${player.width}%`, background: player.accent }} />
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className={styles.statsStrip}>
          <div className={styles.statsStripItem}>
            <div className={styles.statsStripValue}>342</div>
            <div className={styles.statsStripLabel}>ACTIVE BETS</div>
          </div>
          <div className={styles.statsStripItem}>
            <div className={styles.statsStripValue}>$104.4K</div>
            <div className={styles.statsStripLabel}>TOTAL POOL</div>
          </div>
          <div className={styles.statsStripItem}>
            <div className={styles.statsStripValue}>3</div>
            <div className={styles.statsStripLabel}>ELIMINATED</div>
          </div>
          <div className={styles.statsStripItem}>
            <div className={styles.statsStripValue}>VII / XII</div>
            <div className={styles.statsStripLabel}>SESSION</div>
          </div>
        </section>

        <section className={styles.calendarSection}>
          <div className={styles.calendarPanel}>
            <div className={styles.calendarHead}>
              <div className={styles.overlayEyebrow}>SESSION CALENDAR</div>
              <div className={styles.calendarNav}>
                <button type="button" className={styles.calNavBtn} onClick={() => handleMonthChange(-1)}>
                  &#8249;
                </button>
                <div className={styles.calMonthLabel}>{MONTHS[curMonth]} {curYear}</div>
                <button type="button" className={styles.calNavBtn} onClick={() => handleMonthChange(1)}>
                  &#8250;
                </button>
              </div>
            </div>

            <div className={styles.calGrid}>
              {DAYS.map((dayLabel) => (
                <div key={dayLabel} className={styles.calDayHeader}>{dayLabel}</div>
              ))}

              {calendarCells.map((cell) => {
                if (cell.type === "empty") {
                  return <div key={cell.key} className={styles.calDayEmpty} />;
                }

                const today = new Date();
                const isToday =
                  today.getDate() === cell.date.getDate() &&
                  today.getMonth() === cell.date.getMonth() &&
                  today.getFullYear() === cell.date.getFullYear();
                const isLive = cell.sessions.some((session) => session.status === "live");
                const hasSession = cell.sessions.length > 0;
                const isSelected = selectedDay === cell.key;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={`${styles.calDay} ${hasSession ? styles.hasSession : ""} ${isToday ? styles.isToday : ""} ${isLive ? styles.isLive : ""} ${isSelected ? styles.isSelected : ""}`}
                    onClick={() => handleDaySelect(cell)}
                  >
                    <span>{cell.day}</span>
                    {hasSession ? (
                      <span className={styles.calPips}>
                        {cell.sessions.map((session) => (
                          <span
                            key={`${cell.key}-${session.id}`}
                            className={`${styles.calPip} ${
                              session.status === "live"
                                ? styles.calPipLive
                                : session.status === "open"
                                  ? styles.calPipOpen
                                  : session.status === "upcoming"
                                    ? styles.calPipUpcoming
                                    : styles.calPipClosed
                            }`}
                          />
                        ))}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.sessionListPanel}>
            <div className={styles.sessionListHeader}>
              <div className={styles.sessionListTitle}>UPCOMING SESSIONS</div>
              <a href="/sessions" className={styles.sessionListLink}>
                View All Sessions
              </a>
            </div>
            {upcomingSessions.map((session) => (
              <article
                key={`${session.id}-${dateKey(session.dateObj)}`}
                className={`${styles.sessionEntry} ${session.status === "live" ? styles.sessionEntryLive : ""}`}
              >
                <div>
                  <div className={styles.sessionEntryId}>SESSION {session.id}</div>
                  <div className={styles.sessionEntryDate}>
                    {session.dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
                  </div>
                  <div className={styles.sessionEntryTime}>{session.time} LOCAL</div>
                </div>
                <div>
                  <div
                    className={`${styles.sessionBadge} ${
                      session.status === "live"
                        ? styles.sessionBadgeLive
                        : session.status === "open"
                          ? styles.sessionBadgeOpen
                          : session.status === "upcoming"
                            ? styles.sessionBadgeUpcoming
                            : styles.sessionBadgeClosed
                    }`}
                  >
                    {session.status.toUpperCase()}
                  </div>
                  <div className={styles.sessionPool}>
                    {session.status === "live"
                      ? "$104,402 POOL"
                      : session.status === "open"
                        ? "BOOKING OPEN"
                        : session.status === "closed"
                          ? `${session.pool} FINAL`
                          : "TBD"}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className={`${styles.playersOverlay} ${overlayOpen ? styles.playersOverlayOpen : ""}`}>
          <div className={styles.overlayHeader}>
            <div className={styles.overlayTitleWrap}>
              <div className={styles.overlayEyebrow}>Session VII - Active Roster</div>
              <div className={styles.overlayTitle}>The Players</div>
            </div>
            <button type="button" className={styles.btnClose} onClick={() => setOverlayOpen(false)}>
              &larr; Back
            </button>
          </div>

          <div className={styles.overlaySubtitle}>
            <p>Study each contender carefully.</p>
            <strong>Choose Your Favorite</strong>
          </div>

          <div className={styles.playersGrid}>
            {players.map((player) => (
              <article key={player.id} className={`${styles.pcard} ${player.leading ? styles.pcardLeader : ""}`}>
                <div className={styles.pcardNumber}>{player.id}</div>
                <div className={styles.pcardTop}>
                  <div className={styles.pcardAvatar} style={{ background: player.bg, color: player.color }}>
                    {player.initials}
                  </div>
                  <div>
                    <div className={styles.pcardName}>{player.name}</div>
                    <div className={styles.pcardRole} style={{ color: player.color }}>{player.role}</div>
                  </div>
                </div>

                <div className={styles.pcardBody}>
                  {player.leading ? (
                    <div className={styles.leaderFlag}>
                      <span className={styles.leaderFlagDot} />
                      Leading
                    </div>
                  ) : null}

                  <div className={styles.pcardQuote}>{player.quote}</div>

                  <div className={styles.pcardStat}>
                    <div className={styles.pcardStatRow}>
                      <span className={styles.pcardStatLabel}>Endurance</span>
                      <span className={styles.pcardStatVal}>{player.endurance}%</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${player.endurance}%`, background: player.barColor }} />
                    </div>
                  </div>

                  <div className={styles.pcardOddsRow}>
                    <span className={styles.pcardChip}>ODDS x{player.odds}</span>
                    <span className={styles.pcardChip}>{player.pool}</span>
                  </div>

                  <div className={styles.metricsRow}>
                    <div>
                      <div className={styles.metricLabel}>Challenges</div>
                      <div className={styles.metricValue}>{player.challenges}</div>
                    </div>
                    <div>
                      <div className={styles.metricLabel}>Wins</div>
                      <div className={styles.metricValue}>{player.wins}</div>
                    </div>
                    <div>
                      <div className={styles.metricLabel}>Sessions</div>
                      <div className={styles.metricValue}>{player.sessions}</div>
                    </div>
                  </div>

                  <div className={styles.pcardTags}>
                    {player.tags.map((tag) => (
                      <span key={tag} className={styles.pcardTag}>{tag}</span>
                    ))}
                  </div>

                  <button type="button" className={styles.btnBet}>
                    Bet on {player.name.split(" ")[0]}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default HomePage;
