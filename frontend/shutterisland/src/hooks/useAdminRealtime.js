import { useEffect, useRef } from "react";

const API_BASE = import.meta.env?.VITE_API_URL ?? "http://localhost:4000";

export function useAdminRealtime({ sessionId = null, enabled = true, onUpdate }) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof window.EventSource === "undefined") {
      return undefined;
    }

    const streamUrl = new URL(`${API_BASE}/api/admin/stream`);

    if (sessionId) {
      streamUrl.searchParams.set("sessionId", String(sessionId));
    }

    const source = new window.EventSource(streamUrl.toString());

    const handleUpdate = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onUpdateRef.current?.(payload);
      } catch {
        onUpdateRef.current?.(null);
      }
    };

    source.addEventListener("update", handleUpdate);

    return () => {
      source.removeEventListener("update", handleUpdate);
      source.close();
    };
  }, [enabled, sessionId]);
}
