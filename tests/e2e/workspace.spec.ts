import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const knowledgeData = JSON.parse(
  readFileSync(
    new URL("../../src/data/knowledge-base.json", import.meta.url),
    "utf8",
  ),
);

test("direct file opening explains the required local server", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "one protocol diagnosis check is sufficient");
  await page.goto(new URL("../../index.html", import.meta.url).href);
  await expect(
    page.getByRole("heading", { name: "Lokaler Webserver erforderlich" }),
  ).toBeVisible();
  await expect(page.getByText("START_UKD.cmd")).toBeVisible();
});

test("loads canonical data and exposes all workspace routes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  const routes = [
    "cockpit",
    "setup",
    "log",
    "today",
    "timeline",
    "mix",
    "climate",
    "nutrients",
    "products",
    "compatibility",
    "diagnostics",
    "knowledge",
    "audit",
    "raw",
    "legal",
    "reports",
    "system",
  ];
  for (const route of routes) {
    await page.goto(`/?lens=expert&day=4#${route}`);
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.locator("#main-content h1").first()).toBeVisible();
  }

  await page.goto("/?lens=expert#knowledge");
  await expect(page.locator(".knowledge-summary")).toContainText(
    `${knowledgeData.claims.length} High-impact Claims`,
  );
  await page.goto("/?lens=expert#audit");
  await expect(page.locator(".audit-stats")).toContainText("55");

  await expect(errors).toEqual([]);
});

test("all workspace views pass automated WCAG 2.2 AA checks", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const issues: string[] = [];
  for (const theme of ["dark", "light"] as const) {
    for (const route of [
      "cockpit",
      "setup",
      "log",
      "today",
      "timeline",
      "mix",
      "climate",
      "nutrients",
      "products",
      "compatibility",
      "diagnostics",
      "knowledge",
      "audit",
      "raw",
      "legal",
      "reports",
      "system",
    ]) {
      await page.goto(`/?lens=guided&day=4#${route}`);
      await expect(page.locator("#main-content")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        /^(dark|light)$/,
      );
      const currentTheme = await page
        .locator("html")
        .getAttribute("data-theme");
      if (currentTheme !== theme) {
        await page.getByRole("button", { name: "Farbschema wechseln" }).click();
      }
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      if (results.violations.length > 0) {
        issues.push(
          `${theme}/${route}: ${results.violations
            .map(
              (violation) =>
                `${violation.id} (${violation.nodes.length}): ${violation.nodes
                  .map((node) => node.target.join(" "))
                  .join("; ")}`,
            )
            .join(", ")}`,
        );
      }
    }
  }
  expect(issues, issues.join("\n")).toEqual([]);
});

test("experience lens, help, search and batch calculation work", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop command interaction test");
  await page.goto("/?lens=guided&day=4#cockpit");
  await page.getByTitle("Expert").click();
  await expect(page.getByText("EXPERT TRACE").first()).toBeVisible();

  await page.getByRole("button", { name: "Hilfe zur Ansicht" }).click();
  await expect(
    page.getByRole("dialog", { name: /Cockpit verstehen/i }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+K");
  await expect(
    page.getByRole("dialog", { name: "Globale Suche" }),
  ).toBeVisible();

  await page.goto("/?lens=expert&day=4#mix");
  await expect(page.locator(".mix-list")).toContainText("6.25 ml");
});

test("mobile workspace stays within the viewport", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile layout test");
  await page.goto("/?lens=guided&day=0#cockpit");
  await expect(page.locator(".mobile-bar")).toBeVisible();
  const sizes = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport);
});
