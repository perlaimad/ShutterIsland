import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "./LoginPage";
import { clearAuthSession, loadAuthSession } from "../lib/auth";

describe("LoginPage", () => {
  beforeEach(() => {
    clearAuthSession();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAuthSession();
  });

  it("stores auth token on successful login", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "token-123",
        tokenType: "Bearer",
        expiresAt: "2099-01-01T00:00:00.000Z",
        staff: { id: 1, username: "admin_nour", role: "Administrator" }
      })
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
      target: { value: "nour@shutterisland.com" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Password123!" }
    });
    fireEvent.submit(screen.getByRole("button", { name: "Sign In" }).closest("form"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(loadAuthSession()?.token).toBe("token-123");
    });
  });

  it("shows backend error message when login fails", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        message: "Invalid credentials."
      })
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
      target: { value: "nour@shutterisland.com" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "bad-password" }
    });
    fireEvent.submit(screen.getByRole("button", { name: "Sign In" }).closest("form"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(loadAuthSession()).toBeNull();
    });
  });
});
