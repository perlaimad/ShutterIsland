import React, { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useAdminRealtime } from "./useAdminRealtime";
import { clearAuthSession, saveAuthSession } from "../lib/auth";

class MockEventSource {
  constructor(url) {
    this.url = url;
    this.handlers = new Map();
    MockEventSource.instances.push(this);
  }

  addEventListener(name, handler) {
    this.handlers.set(name, handler);
  }

  removeEventListener(name) {
    this.handlers.delete(name);
  }

  close() {}
}

MockEventSource.instances = [];

function HookHarness({ onUpdate }) {
  useAdminRealtime({
    sessionId: 12,
    enabled: true,
    onUpdate
  });

  useEffect(() => () => {}, []);
  return null;
}

describe("useAdminRealtime", () => {
  afterEach(() => {
    clearAuthSession();
    MockEventSource.instances = [];
    vi.restoreAllMocks();
  });

  it("adds access_token query parameter when auth token exists", () => {
    saveAuthSession({ token: "stream-token" });
    window.EventSource = MockEventSource;

    render(<HookHarness onUpdate={() => {}} />);

    expect(MockEventSource.instances).toHaveLength(1);
    const streamUrl = MockEventSource.instances[0].url;
    expect(streamUrl).toContain("/api/admin/stream");
    expect(streamUrl).toContain("sessionId=12");
    expect(streamUrl).toContain("access_token=stream-token");
  });
});
