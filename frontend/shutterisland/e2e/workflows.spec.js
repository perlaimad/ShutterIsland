import { expect, test } from "@playwright/test";

const env = globalThis.process?.env ?? {};
const runE2E = env.RUN_E2E === "1";
const staffEmail = env.E2E_STAFF_EMAIL || "nour@shutterisland.com";
const staffPassword = env.E2E_STAFF_PASSWORD || "Staff123!";
const viewerAccessKey = env.E2E_VIEWER_ACCESS_KEY || "KEY-SES102-B1";
const backendBase = env.E2E_BACKEND_URL || "http://localhost:4000";

test.describe("ShutterIsland end-to-end workflows", () => {
  test.skip(!runE2E, "Set RUN_E2E=1 with running backend/frontend services.");

  test("admin login to dashboard connection", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("test@gmail.com").fill(staffEmail);
    await page.getByPlaceholder("Access phrase").fill(staffPassword);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /admin dashboard/i })).toBeVisible();
  });

  test("sessions workflow path is reachable", async ({ page }) => {
    await page.goto("/sessions");

    await expect(page.getByRole("heading", { name: /sessions/i })).toBeVisible();
    await expect(page.getByText(/browse every arena session/i)).toBeVisible();
  });

  test("session details view loads and presents status cards", async ({ page }) => {
    await page.goto("/sessions/SES-102");

    await expect(page.getByText(/session details/i)).toBeVisible();
    await expect(page.getByText(/participant status/i)).toBeVisible();
  });

  test("viewer auth and bet-placement backend connection", async ({ request }) => {
    const loginResponse = await request.post(`${backendBase}/api/auth/viewer/login`, {
      data: {
        accessKey: viewerAccessKey,
        viewerIdentifier: "viewer3@example.com"
      }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginPayload = await loginResponse.json();
    const token = loginPayload?.token;
    expect(typeof token).toBe("string");

    const placeBetResponse = await request.post(`${backendBase}/api/sessions/SES-102/bets`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      data: {
        betType: "FinalWinner",
        predictedValue: "6",
        betAmount: 15
      }
    });

    expect(placeBetResponse.ok()).toBeTruthy();
  });

  test("admin stream endpoint accepts token query parameter", async ({ request }) => {
    const staffLoginResponse = await request.post(`${backendBase}/api/auth/staff/login`, {
      data: {
        identifier: staffEmail,
        password: staffPassword
      }
    });
    expect(staffLoginResponse.ok()).toBeTruthy();
    const staffPayload = await staffLoginResponse.json();
    const staffToken = staffPayload?.token;
    expect(typeof staffToken).toBe("string");

    const streamResponse = await request.get(
      `${backendBase}/api/admin/stream?access_token=${encodeURIComponent(staffToken)}`
    );

    expect([200, 204]).toContain(streamResponse.status());
  });
});
