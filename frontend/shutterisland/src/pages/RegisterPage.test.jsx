import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RegisterPage from "./RegisterPage";

describe("RegisterPage", () => {
  it("shows admin-managed registration message on submit", async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText("Enter your name"), {
      target: { value: "Test User" }
    });
    fireEvent.change(screen.getByPlaceholderText("test@gmail.com"), {
      target: { value: "test@example.com" }
    });
    fireEvent.change(screen.getByPlaceholderText("Create access phrase"), {
      target: { value: "Password123!" }
    });
    fireEvent.change(screen.getByPlaceholderText("Repeat access phrase"), {
      target: { value: "Password123!" }
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      await screen.findByText(/self-service registration is currently unavailable/i)
    ).toBeInTheDocument();
  });
});
