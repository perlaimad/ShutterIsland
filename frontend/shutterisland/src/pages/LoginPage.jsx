import { useState } from "react";
import styles from "./LoginPage.module.css";
import { saveAuthSession } from "../lib/auth";

const API_BASE = import.meta.env?.VITE_API_URL ?? "http://localhost:4000";

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

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");

    try {
      const response = await fetch(`${API_BASE}/api/auth/staff/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          identifier: credentials.email,
          password: credentials.password
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Login failed.");
      }

      saveAuthSession({
        actorType: "staff",
        token: payload.token,
        tokenType: payload.tokenType,
        expiresAt: payload.expiresAt,
        profile: payload.staff,
        remember: credentials.remember
      });
      setStatus("Login successful. Redirecting to dashboard...");
      window.setTimeout(() => {
        window.location.href = "/dashboard";
      }, 350);
    } catch (error) {
      setStatus(error.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
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

          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? "Signing In..." : "Sign In"}
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
