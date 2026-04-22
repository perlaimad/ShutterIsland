import styles from "./HomeStatusBar.module.css";

function HomeStatusBar({
  sessionLabel = "VII of XII",
  playersActive = "5",
  round = "3",
  brand = "Atlas Systems Group - CSC490",
}) {
  return (
    <div className={styles.statusBar}>
      <div className={styles.statItem}>
        <div className={styles.statDotGreen} />
        System Online
      </div>
      <div className={styles.statItem}>
        Session
        <span className={styles.statVal}>{sessionLabel}</span>
      </div>
      <div className={styles.statItem}>
        Players Active
        <span className={styles.statVal}>{playersActive}</span>
      </div>
      <div className={styles.statItem}>
        Round
        <span className={styles.statVal}>{round}</span>
      </div>
      <div className={styles.statBrand}>{brand}</div>
    </div>
  );
}

export default HomeStatusBar;
