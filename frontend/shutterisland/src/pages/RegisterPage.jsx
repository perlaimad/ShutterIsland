import { useState } from "react";
import styles from "./LoginPage.module.css";

function RegisterPage() {
  const [account, setAccount] = useState({
    name: "",
    email: "",
    role: "viewer",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [status, setStatus] = useState("");

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setAccount((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (account.password !== account.confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setStatus("Self-service registration is currently unavailable. Please contact an administrator to create your account.");
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="register-title">
        <div className={styles.accessPanel}>
          <a href="/" className={styles.homeLink}>
            <span aria-hidden="true">←</span>
            Back to home
          </a>
          <div className={styles.brandLock} aria-hidden="true">
            SI
          </div>
          <p className={styles.eyebrow}>Arena Account Request</p>
          <h1 id="register-title" className={styles.title}>
            Register
          </h1>
          <p className={styles.copy}>
            Create an account as an admin, manager, or viewer to access the tools assigned to your role.
          </p>
        </div>

        <form className={styles.formPanel} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <span className={styles.formKicker}>New Credentials</span>
            <h2>Create Access Profile</h2>
          </div>

          <label className={styles.field}>
            <span>Full Name</span>
            <input
              type="text"
              name="name"
              value={account.name}
              onChange={handleChange}
              autoComplete="name"
              placeholder="Enter your name"
              required
            />
          </label>

          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={account.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="test@gmail.com"
              required
            />
          </label>

          <label className={styles.field}>
            <span>Role</span>
            <select
              name="role"
              value={account.role}
              onChange={handleChange}
              required
            >
              <option value="viewer">Viewer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={account.password}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder="Create access phrase"
              required
            />
          </label>

          <label className={styles.field}>
            <span>Confirm Password</span>
            <input
              type="password"
              name="confirmPassword"
              value={account.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder="Repeat access phrase"
              required
            />
          </label>

          <div className={styles.formOptions}>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                name="terms"
                checked={account.terms}
                onChange={handleChange}
                required
              />
              <span>I accept controlled access review</span>
            </label>
          </div>

          <button type="submit" className={styles.submitButton}>
            Create Account
          </button>

          <p className={styles.switchPrompt}>
            Already registered? <a href="/login">Sign in</a>
          </p>

          {status ? <p className={styles.statusMessage}>{status}</p> : null}
        </form>
      </section>
    </main>
  );
}

export default RegisterPage;
