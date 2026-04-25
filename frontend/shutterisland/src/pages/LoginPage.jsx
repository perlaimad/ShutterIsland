import { useState } from "react";
import styles from "./LoginPage.module.css";

function LoginPage() {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    remember: true,
  });
  const [status, setStatus] = useState("");

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setCredentials((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setStatus("Access request staged. Connect this form to the auth API when credentials are ready.");
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="login-title">
        <div className={styles.accessPanel}>
          <a href="/" className={styles.homeLink}>
            <span aria-hidden="true">←</span>
            Back to home
          </a>
          <div className={styles.brandLock} aria-hidden="true">
            SI
          </div>
          <p className={styles.eyebrow}>Restricted Arena Network</p>
          <h1 id="login-title" className={styles.title}>
            Login
          </h1>
          <p className={styles.copy}>
            Sign in to manage sessions, monitor live participants, and access operator tools.
          </p>
        </div>

        <form className={styles.formPanel} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <span className={styles.formKicker}>Operator Credentials</span>
            <h2>Enter Access Code</h2>
          </div>

          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="test@gmail.com"
              required
            />
          </label>

          <label className={styles.field}>
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              autoComplete="current-password"
              placeholder="Access phrase"
              required
            />
          </label>

          <div className={styles.formOptions}>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                name="remember"
                checked={credentials.remember}
                onChange={handleChange}
              />
              <span>Remember this device</span>
            </label>
          </div>

          <button type="submit" className={styles.submitButton}>
            Sign In
          </button>

          <p className={styles.switchPrompt}>
            New to the arena network? <a href="/register">Create account</a>
          </p>

          {status ? <p className={styles.statusMessage}>{status}</p> : null}
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
