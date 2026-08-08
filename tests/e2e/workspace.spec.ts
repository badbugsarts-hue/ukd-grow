import { expect, test } from "@playwright/test";

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
  ];
  for (const route of routes) {
    await page.goto(`/?lens=expert&day=4#${route}`);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("#main-content")).toBeVisible();
  }

  await page.goto("/?lens=expert#knowledge");
  await expect(page.locator(".knowledge-summary")).toContainText(
    "17 High-impact Claims",
  );
  await page.goto("/?lens=expert#audit");
  await expect(page.locator(".audit-stats")).toContainText("55");

  await expect(errors).toEqual([]);
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
