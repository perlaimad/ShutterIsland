import styles from "./Header.module.css";

const navItems = [
  { href: "#entry", label: "Entry", code: "01" },
  { href: "#offers", label: "Modes", code: "02" },
  { href: "#sequence", label: "Flow", code: "03" },
  { href: "#systems", label: "Systems", code: "04" },
  { href: "#broadcast", label: "Live", code: "05" },
];

function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.utilityBar}>
          <span className={styles.utilityText}>Private Island Entertainment Platform</span>
          <div className={styles.utilityLinks}>
            <span className={styles.statusChip}>Session Net: Online</span>
            <a href="#broadcast">Watch live</a>
            <a href="#systems">Operator view</a>
          </div>
        </div>

        <div className={styles.heroNav}>
          <a href="/" className={styles.brand} aria-label="Shutter Island home">
            <span className={styles.brandMark} aria-hidden="true">SI</span>
            <span className={styles.brandCopy}>
              <span className={styles.brandName}>Shutter Island</span>
              <span className={styles.brandSub}>Invitation-only arena access</span>
            </span>
          </a>

          <nav className={styles.nav} aria-label="Primary">
            <ul role="list" className={styles.navList}>
              {navItems.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className={styles.navLink}>
                    <span className={styles.navCode}>{item.code}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <span className={styles.actionLabel}>Launch Actions</span>
            <a href="#entry" className="btn btn-secondary">
              Book
            </a>
            <a href="#broadcast" className="btn btn-primary">
              Watch
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
