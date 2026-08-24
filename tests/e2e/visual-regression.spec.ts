import { expect, test } from "@playwright/test";

const routes = [
  "masterplan",
  "plan-editor",
  "autoflower",
  "cockpit",
  "setup",
  "log",
  "today",
  "timeline",
  "history",
  "mix",
  "climate",
  "nutrients",
  "products",
  "inventory",
  "reservoir",
  "post-harvest",
  "energy",
  "media",
  "compatibility",
  "diagnostics",
  "knowledge",
  "audit",
  "raw",
  "legal",
  "reports",
  "system",
  "equipment",
  "ipm",
  "incidents",
  "connector",
  "profiles",
  "calc",
] as const;

test.describe("approved route visuals", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !["desktop", "mobile"].includes(testInfo.project.name),
      "Visual baselines use canonical Chromium viewports.",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install({ time: new Date("2026-08-20T08:00:00.000Z") });
  });

  for (const theme of ["dark", "light"] as const) {
    test(`all routes · ${theme}`, async ({ page }) => {
      test.setTimeout(600_000);
      await page.addInitScript((nextTheme) => {
        localStorage.setItem("ukd:theme", nextTheme);
      }, theme);
      for (const route of routes) {
        await page.goto(`/?lens=expert&day=4#${route}`, {
          waitUntil: "networkidle",
        });
        const main = page.locator("#main-content");
        await expect(main).toBeVisible();
        await expect(main.locator("h1")).toBeVisible();
        await page.waitForTimeout(200);
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(page).toHaveScreenshot(`${route}-${theme}.png`, {
          animations: "disabled",
          caret: "hide",
          maxDiffPixelRatio: 0.01,
          timeout: 15_000,
        });
      }
    });
  }
});

test.describe("critical interactive visuals", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !["desktop", "mobile"].includes(testInfo.project.name),
      "Visual baselines use canonical Chromium viewports.",
    );
    await page.clock.install({ time: new Date("2026-08-20T08:00:00.000Z") });
    await page.goto("/?lens=guided&day=0#today");
    await expect(page.locator("#main-content")).toBeVisible();
  });

  test("Command Center", async ({ page }) => {
    await page
      .getByRole("button", {
        name: "Betriebsmodus und globale Aktionen öffnen",
      })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Command Center" }),
    ).toHaveScreenshot("command-center.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.015,
    });
  });

  test("Quick Log", async ({ page }) => {
    await page.getByRole("button", { name: "Quick Log" }).click();
    await expect(
      page.getByRole("dialog", { name: "Quick Log" }),
    ).toHaveScreenshot("quick-log.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.015,
    });
  });

  test("Live Preflight", async ({ page }) => {
    await page
      .getByRole("button", {
        name: "Betriebsmodus und globale Aktionen öffnen",
      })
      .click();
    await page.getByRole("button", { name: /Live starten/ }).click();
    await expect(
      page.getByRole("dialog", { name: "Simulation als Live-Run starten" }),
    ).toHaveScreenshot("live-preflight.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.015,
    });
  });
});
