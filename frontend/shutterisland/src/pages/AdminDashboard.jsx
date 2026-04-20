import { useEffect, useState } from "react";
import styles from "./AdminDashboard.module.css";

const fallbackSessions = [
  { id: "S-201", room: "Arena A", level: "Level 3", participants: 5, status: "Active" },
  { id: "S-202", room: "Arena B", level: "Level 2", participants: 4, status: "Paused" },
  { id: "S-203", room: "Arena C", level: "Level 5", participants: 6, status: "Active" },
];

const fallbackParticipants = [
  { id: "P-01", session: "S-201", level: "3", status: "Active", update: "2 min ago" },
  { id: "P-02", session: "S-201", level: "2", status: "Waiting", update: "1 min ago" },
  { id: "P-08", session: "S-202", level: "2", status: "Disconnected", update: "5 min ago" },
  { id: "P-14", session: "S-203", level: "5", status: "Completed", update: "Just now" },
];

const adminLogs = [
  { time: "00:14", admin: "Admin-01", action: "Started session", target: "S-201" },
  { time: "00:22", admin: "Admin-02", action: "Paused session", target: "S-202" },
  { time: "00:30", admin: "Admin-01", action: "Updated level", target: "P-14" },
  { time: "00:41", admin: "Admin-03", action: "Generated report", target: "Session Summary" },
];

function AdminDashboard() {
  const [isDark, setIsDark] = useState(() => {
    // Sync initial state with the actual class on <html>
    return document.documentElement.classList.contains("dark");
  });

  const [overview, setOverview] = useState({
    activeSessions: 0,
    participants: 0,
    completedSessions: 0,
    averageLevel: 0,
  });
  const [sessions, setSessions] = useState(fallbackSessions);
  const [participantsData, setParticipantsData] = useState(fallbackParticipants);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/admin/dashboard/overview");
        if (!response.ok) throw new Error("Overview failed");
        const data = await response.json();
        setOverview(data);
      } catch (err) {
        console.error("Overview fetch error:", err);
      }
    };

    const fetchSessions = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/admin/dashboard/sessions");
        if (!res.ok) throw new Error("Sessions failed");
        const data = await res.json();
        setSessions(data);
      } catch (err) {
        console.error("Sessions fetch error:", err);
        // fallbackSessions already set as initial state
      }
    };

    const fetchParticipants = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/admin/dashboard/participants");
        if (!res.ok) throw new Error("Participants failed");
        const data = await res.json();
        setParticipantsData(data);
      } catch (err) {
        console.error("Participants fetch error:", err);
        // fallbackParticipants already set as initial state
      }
    };

    fetchOverview();
    fetchSessions();
    fetchParticipants();
  }, []);

  const handleThemeToggle = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    // Add or remove the class to match the new state
    document.documentElement.classList.toggle("dark", newDark);
  };

  return (
    <main
      className={`${styles.page} min-h-screen w-full overflow-x-hidden bg-[#fff8f0] text-[#2e1a10] dark:!bg-[#140b08] dark:!text-[#f2d0a4]`}
    >
      <div className={styles.root}>
        <div className={styles.ticker}>
          <div className={styles.tickerTrack}>
            <span className={styles.tickerItem}>MONITORING & REPORTING</span>
            <span className={styles.tickerDiamond}>◆</span>
            <span className={styles.tickerItem}>ADMIN DASHBOARD ONLINE</span>
            <span className={styles.tickerDiamond}>◆</span>
            <span className={styles.tickerItem}>LIVE SESSION TRACKING ACTIVE</span>
            <span className={styles.tickerDiamond}>◆</span>
            <span className={styles.tickerItem}>REPORTS READY</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <span className={styles.navBrand}>Atlas Group</span>

          <div className={styles.navLinks}>
            <button type="button" className={styles.navLink}>Dashboard</button>
            <button type="button" className={styles.navLink}>Sessions</button>
            <button type="button" className={styles.navLink}>Participants</button>
            <button type="button" className={styles.navLink}>Reports</button>

            <button
              type="button"
              className={`${styles.themeToggle} ${isDark ? styles.themeToggleOn : ""}`}
              onClick={handleThemeToggle}
            >
              <span className={styles.themeToggleTrack}>
                <span className={styles.themeToggleThumb} />
              </span>
              <span className={styles.themeToggleText}>{isDark ? "Light" : "Dark"}</span>
            </button>

            <button type="button" className={styles.navCta}>Admin Panel</button>
          </div>
        </nav>

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
              Track all active sessions, monitor participant states, follow level
              progression, review administrative actions, and generate historical reports.
            </p>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Active Sessions</div>
                <div className={styles.summaryValue}>{overview.activeSessions}</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Participants Online</div>
                <div className={styles.summaryValue}>{overview.participants}</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Completed Sessions</div>
                <div className={styles.summaryValue}>{overview.completedSessions}</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Average Level</div>
                <div className={styles.summaryValue}>{overview.averageLevel}</div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Active Sessions</div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Room</th>
                  <th>Level</th>
                  <th>Participants</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>{session.id}</td>
                    <td>{session.room}</td>
                    <td>{session.level}</td>
                    <td>{session.participants}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          session.status === "Active" ? styles.badgeActive : styles.badgePaused
                        }`}
                      >
                        {session.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Participant Status</div>
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
                {participantsData.map((participant) => (
                  <tr key={participant.id}>
                    <td>{participant.id}</td>
                    <td>{participant.session}</td>
                    <td>{participant.level}</td>
                    <td>{participant.status}</td>
                    <td>{participant.update}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Recent Administrative Actions</div>
            <div className={styles.logList}>
              {adminLogs.map((log, index) => (
                <div key={index} className={styles.logItem}>
                  <div className={styles.logTime}>{log.time}</div>
                  <div className={styles.logContent}>
                    <strong>{log.admin}</strong> {log.action}
                    <span className={styles.logTarget}> — {log.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Quick Reports</div>
            <div className={styles.reportCards}>
              <div className={styles.reportCard}>
                <div className={styles.reportLabel}>Participant Progression</div>
                <div className={styles.reportText}>Highest level reached, completion rate, and progress trends.</div>
              </div>
              <div className={styles.reportCard}>
                <div className={styles.reportLabel}>Session Performance</div>
                <div className={styles.reportText}>Overall room performance and completion summary.</div>
              </div>
              <div className={styles.reportCard}>
                <div className={styles.reportLabel}>Administrative History</div>
                <div className={styles.reportText}>Track actions taken by admins during live operation.</div>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.statusBar}>
          <div className={styles.statItem}>
            <div className={styles.statDotGreen} />
            Monitoring Online
          </div>
          <div className={styles.statItem}>
            Sessions <span className={styles.statVal}>{overview.activeSessions} Live</span>
          </div>
          <div className={styles.statItem}>
            Participants <span className={styles.statVal}>{overview.participants} Active</span>
          </div>
          <div className={styles.statItem}>
            Reports <span className={styles.statVal}>Available</span>
          </div>
          <div className={styles.statBrand}>Atlas Systems Group - CSC490</div>
        </div>
      </div>
    </main>
  );
}

export default AdminDashboard;