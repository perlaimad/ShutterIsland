import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import styles from "./LoginPage.module.css";

function RegisterPage() {
  const { register, logout } = useAuth();
  const [account, setAccount] = useState({
    accountType: "admin",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setAccount((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (account.password !== account.confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      if (account.accountType === "viewer") {
        logout();
        window.location.href = "/";
        return;
      }

      await register({
        username: account.username,
        email: account.email,
        password: account.password,
      });

      window.location.href = "/dashboard";
    } catch (error) {
      setStatus(error?.message ?? "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
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
            Admin accounts can access operator tools. Viewer accounts return to the public home experience.
          </p>
        </div>

        <form className={styles.formPanel} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <span className={styles.formKicker}>New Credentials</span>
            <h2>Create Access Profile</h2>
          </div>

          <label className={styles.field}>
            <span>Account Type</span>
            <select
              name="accountType"
              value={account.accountType}
              onChange={handleChange}
              required
            >
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Username</span>
            <input
              type="text"
              name="username"
              value={account.username}
              onChange={handleChange}
              autoComplete="username"
              placeholder="new_staff"
              required={account.accountType === "admin"}
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
              required={account.accountType === "admin"}
            />
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
              required={account.accountType === "admin"}
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
              required={account.accountType === "admin"}
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

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Account"}
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
