import { useAuth } from "../../context/AuthContext";
import styles from "./HomeTopBar.module.css";

function HomeTopBar({ tickerItems, isDark, onToggleTheme }) {
  const { isAuthenticated, staff, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className={styles.topBar}>
      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {tickerItems.map((message, index) => (
            <span key={`${message}-${index}`} className={styles.tickerChunk}>
              <span className={styles.tickerItem}>{message}</span>
              <span className={styles.tickerDiamond}>{"\u25C6"}</span>
            </span>
          ))}
        </div>
      </div>

      <nav className={styles.nav}>
        <a href="/" className={styles.navBrand}>Atlas Group</a>
        <div className={styles.navLinks}>
          <a href="/sessions" className={styles.navLink}>Sessions</a>
          <button type="button" className={styles.navLink}>Book Session</button>
          <button type="button" className={styles.navLink}>Bet</button>
          <button type="button" className={styles.navLink}>Watch</button>
          
          <button
            type="button"
            className={`${styles.themeToggle} ${isDark ? styles.themeToggleOn : ""}`}
            onClick={onToggleTheme}
            aria-label="Toggle dark mode"
            aria-pressed={isDark}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className={styles.themeToggleTrack}>
              <span className={styles.themeToggleThumb} />
            </span>
            <span className={styles.themeToggleText}>{isDark ? "Dark" : "Light"}</span>
          </button>
          {isAuthenticated ? (
            <>
              <a href="/dashboard" className={styles.navLink}>{staff?.username ?? "Dashboard"}</a>
              <button type="button" className={styles.navCta} onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <a href="/login" className={styles.navCta}>Enter Arena</a>
          )}
        </div>
      </nav>
    </div>
  );
}

export default HomeTopBar;
