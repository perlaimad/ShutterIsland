import { afterEach, describe, expect, it } from "vitest";
import {
  clearAuthSession,
  getAuthHeaders,
  loadAuthSession,
  saveAuthSession
} from "./auth";

describe("auth helpers", () => {
  afterEach(() => {
    clearAuthSession();
  });

  it("saves and loads auth session from local storage", () => {
    const session = {
      token: "token-value",
      actorType: "staff",
      profile: { id: 1 }
    };

    saveAuthSession(session);
    expect(loadAuthSession()).toEqual(session);
  });

  it("returns empty headers when no auth token exists", () => {
    clearAuthSession();
    expect(getAuthHeaders()).toEqual({});
  });

  it("returns bearer authorization header when token exists", () => {
    saveAuthSession({ token: "abc123" });
    expect(getAuthHeaders()).toEqual({
      Authorization: "Bearer abc123"
    });
  });
});
