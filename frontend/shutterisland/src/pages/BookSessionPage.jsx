import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import styles from "./BookSessionPage.module.css";

const API_BASE = import.meta.env?.VITE_API_URL ?? "http://localhost:4000";
const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL ?? `${API_BASE}/api`;
const REFRESH_INTERVAL_MS = 10000;

async function apiFetch(path, fallback = null) {
  try {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`[BookSessionPage] API fetch failed for ${path}:`, error.message);
    return fallback;
  }
}

export default function BookSessionPage() {
  const { authFetch, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    sessionCode: "",
    managerName: "",
    sessionDate: "",
    startTime: "",
    capacity: "7",
    visibility: "Public Watch Listing",
    operatorName: "",
    notes: "",
  });
  const [submitMessage, setSubmitMessage] = useState("");

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    await apiFetch("/api/admin/dashboard/sessions", []);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadPage();
    const intervalId = window.setInterval(loadPage, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [loadPage]);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
    setSubmitMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const sessionCode = formState.sessionCode.trim();
    const maxPlayers = Number(formState.capacity);

    if (!isAuthenticated) {
      window.location.href = `/login?redirect=${encodeURIComponent("/book")}`;
      return;
    }

    if (!sessionCode) {
      setSubmitMessage("Session code is required.");
      return;
    }

    if (!Number.isInteger(maxPlayers) || maxPlayers <= 0 || maxPlayers > 7) {
      setSubmitMessage("Capacity must be a whole number between 1 and 7.");
      return;
    }

    setSubmitting(true);
    setSubmitMessage("");

    authFetch(`${API_BASE_URL}/session-administration/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionCode,
        managerName: formState.managerName.trim(),
        scheduledDate: formState.sessionDate,
        scheduledTime: formState.startTime,
        minPlayers: 1,
        maxPlayers,
        visibility: formState.visibility,
        operatorName: formState.operatorName.trim(),
        notes: formState.notes.trim(),
      }),
    })
      .then(async (response) => {
        let data = {};
        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {
          throw new Error(data?.message || `Failed to create session (${response.status}).`);
        }

        const created = data?.session;
        const identifier = created?.sessionCode || created?.sessionId;

        setSubmitMessage("Session created successfully.");

        if (identifier) {
          window.location.href = `/sessions/${encodeURIComponent(String(identifier))}`;
        }
      })
      .catch((submitError) => {
        setSubmitMessage(submitError?.message || "Failed to create session.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.headerCard}>
          <div>
            <div className={styles.eyebrow}>Session Administration</div>
            <h1 className={styles.title}>Schedule a New Session</h1>
            <div className={styles.headerMeta}>
              <span className={styles.metaText}>
                Plan the next arena before the gates open.
              </span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <a href="/sessions" className={styles.secondaryButton}>All Sessions</a>
          </div>
        </header>

        {error ? (
          <div className={styles.stateCard}>{error}</div>
        ) : loading ? (
          <div className={styles.stateCard}>Loading scheduling deck...</div>
        ) : (
          <>
            <section className={styles.formSection}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <div className={styles.panelTitle}>Create / Schedule Session</div>
                    <div className={styles.panelSub}>Manager-facing form for preparing the next arena</div>
                  </div>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Session Code</span>
                    <input
                      className={styles.input}
                      name="sessionCode"
                      value={formState.sessionCode}
                      onChange={handleFormChange}
                      placeholder="Enter a unique session code"
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Manager Name</span>
                    <input
                      className={styles.input}
                      name="managerName"
                      value={formState.managerName}
                      onChange={handleFormChange}
                      placeholder="Enter the responsible manager"
                      required
                    />
                  </label>

                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Session Date</span>
                      <input
                        className={styles.input}
                        type="date"
                        name="sessionDate"
                        value={formState.sessionDate}
                        onChange={handleFormChange}
                        required
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Start Time</span>
                      <input
                        className={styles.input}
                        type="time"
                        name="startTime"
                        value={formState.startTime}
                        onChange={handleFormChange}
                        required
                      />
                    </label>
                  </div>

                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Capacity</span>
                      <select
                        className={styles.input}
                        name="capacity"
                        value={formState.capacity}
                        onChange={handleFormChange}
                      >
                        {["4", "5", "6", "7"].map((value) => (
                          <option key={value} value={value}>{value} participants</option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Visibility</span>
                      <select
                        className={styles.input}
                        name="visibility"
                        value={formState.visibility}
                        onChange={handleFormChange}
                      >
                        <option value="Public Watch Listing">Public Watch Listing</option>
                        <option value="Private Preview">Private Preview</option>
                      </select>
                    </label>
                  </div>

                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Assigned Operator</span>
                      <input
                        className={styles.input}
                        name="operatorName"
                        value={formState.operatorName}
                        onChange={handleFormChange}
                        placeholder="Optional operator or admin name"
                      />
                    </label>

                  </div>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Manager Notes</span>
                    <textarea
                      className={`${styles.input} ${styles.textarea}`}
                      name="notes"
                      value={formState.notes}
                      onChange={handleFormChange}
                      placeholder="Notes about timing, visibility, staffing, or special setup"
                    />
                  </label>

                  <div className={styles.formFoot}>
                    <button type="submit" className={styles.primaryButton} disabled={submitting}>
                      {submitting ? "Creating..." : "Create Session"}
                    </button>
                  </div>

                  {submitMessage ? <div className={styles.notice}>{submitMessage}</div> : null}
                </form>
              </article>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
