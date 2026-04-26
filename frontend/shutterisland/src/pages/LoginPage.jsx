import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import styles from "./LoginPage.module.css";

function LoginPage() {
  const { login, logout } = useAuth();
  const [credentials, setCredentials] = useState({
    accountType: "admin",
    email: "",
    password: "",
    remember: true,
  });
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setCredentials((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    try {
      if (credentials.accountType === "viewer") {
        logout();
        window.location.href = "/";
        return;
      }

      await login({
        identifier: credentials.email,
        password: credentials.password,
        remember: credentials.remember,
      });

      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("redirect") || "/dashboard";
    } catch (error) {
      setStatus(error?.message ?? "Login failed.");
    } finally {
      setIsSubmitting(false);
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
            <span>Account Type</span>
            <select
              name="accountType"
              value={credentials.accountType}
              onChange={handleChange}
              required
            >
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="test@gmail.com"
              required={credentials.accountType === "admin"}
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
              required={credentials.accountType === "admin"}
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

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? "Signing In..." : "Sign In"}
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
