import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";

const routes = [
  "masterplan",
  "plan-editor",
  "cockpit",
  "setup",
  "log",
  "today",
  "timeline",
  "history",
  "mix",
  "climate",
  "calc",
  "nutrients",
  "products",
  "autoflower",
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
] as const;

const knowledge = JSON.parse(
  readFileSync(
    new URL("../../src/data/knowledge-base.json", import.meta.url),
    "utf8",
  ),
);
const audit = JSON.parse(
  readFileSync(
    new URL("../../src/data/legacy-audit.json", import.meta.url),
    "utf8",
  ),
);

async function gotoRoute(
  page: Page,
  route: (typeof routes)[number],
  lens = "expert",
  day = 4,
) {
  await page.goto(`/?lens=${lens}&day=${day}#${route}`);
  await expect(page.locator("#main-content")).toBeVisible();
}

test("all routes render in all experience lenses without console errors", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the mobile project has a dedicated all-route test");
  test.slow();
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  for (const lens of ["guided", "advanced", "expert"]) {
    for (const route of routes) {
      await gotoRoute(page, route, lens);
      await expect(page.locator("#main-content h1")).toBeVisible();
      await expect(page.locator("main")).toHaveClass(
        new RegExp(`lens-${lens}`),
      );
    }
  }

  expect(errors).toEqual([]);
});

test("URL state, saved day, lens and theme persist and clamp safely", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await expect(page.locator("#main-content")).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem("ukd:day", "37");
    localStorage.setItem("ukd:lens", "advanced");
    localStorage.setItem("ukd:theme", "light");
  });
  await page.goto("/#today");

  await expect(page.locator(".day-stepper input")).toHaveValue("37");
  await expect(page.getByTitle("Advanced")).toHaveClass(/active/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(new URL(page.url()).searchParams.get("day")).toBe("37");

  await page.getByTitle("Expert").click();
  await page.getByRole("button", { name: "Farbschema wechseln" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.getByTitle("Expert")).toHaveClass(/active/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".day-stepper input")).toHaveValue("37");

  await page.goto("/?lens=guided&day=999#today");
  await expect(page.locator(".day-stepper input")).toHaveValue("80");
  expect(new URL(page.url()).searchParams.get("day")).toBe("80");
});

test("sidebar, contextual help and command palette navigation work", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop shell interaction test");
  await gotoRoute(page, "cockpit", "expert", 4);

  for (const label of [
    "Heute",
    "Zeitachse",
    "Mischlabor",
    "Klima & Licht",
    "Nährstoffsystem",
    "Produkte",
    "Kompatibilität",
    "Diagnose",
    "Wissen & Quellen",
    "Audit Center",
    "Rohdaten",
    "Cockpit",
  ]) {
    const btn = page
      .locator(".sidebar nav")
      .getByRole("button", { name: new RegExp(`^${label}`) });
    const group = btn.locator("xpath=ancestor::div[contains(@class, 'nav-group')]");
    const header = group.locator(".nav-group-header");
    if ((await header.getAttribute("aria-expanded")) === "false") {
      await header.click();
    }
    await btn.click();
    await expect(page.locator("#main-content h1")).toHaveText(label);
  }

  await page.keyboard.press("?");
  await expect(
    page.getByRole("dialog", { name: /Cockpit verstehen/i }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: /Cockpit verstehen/i }),
  ).toBeHidden();

  await page.keyboard.press("Control+K");
  const palette = page.getByRole("dialog", { name: "Globale Suche" });
  await expect(palette).toBeVisible();
  await expect(palette).toContainText(`${knowledge.claims.length} Claims`);
  const search = palette.getByPlaceholder(/Suche nach Seite/);
  await search.fill("Run-Tag 2");
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page.locator("#main-content h1")).toHaveText("Heute");
  await expect(page.locator(".day-stepper input")).toHaveValue("20");

  await page.keyboard.press("Control+K");
  await palette.getByPlaceholder(/Suche nach Seite/).fill("kein-treffer-xyz");
  await expect(palette).toContainText("Keine Treffer");
  await page.keyboard.press("Escape");
});

test("cockpit, today checklist and timeline controls update the shared day", async ({
  page,
}) => {
  await gotoRoute(page, "cockpit", "guided", 4);
  await page.getByRole("button", { name: /Nächster Tag/ }).click();
  expect(new URL(page.url()).searchParams.get("day")).toBe("5");

  await page.getByRole("button", { name: "Vollansicht →" }).click();
  await expect(page.locator("#main-content h1")).toHaveText("Heute");
  await page
    .getByRole("button", { name: "Schritt 3: Maßnahmen & Bestätigung" })
    .click();
  const checklist = page.getByRole("heading", { name: /Tages-Aufgaben/ })
    .locator("xpath=following-sibling::div[1]")
    .getByRole("checkbox");
  await expect(checklist).toHaveCount(5);
  for (let index = 0; index < 5; index += 1) await checklist.nth(index).check();
  for (let index = 0; index < 5; index += 1)
    await expect(checklist.nth(index)).toBeChecked();
  await page.getByRole("button", { name: /Zum Nährstoff-Mixer/ }).click();
  await expect(page.locator("#main-content h1")).toHaveText("Mischlabor");

  await gotoRoute(page, "timeline", "advanced", 0);
  await page.getByRole("button", { name: "Vorheriger Tag" }).click();
  expect(new URL(page.url()).searchParams.get("day")).toBe("0");
  await page.getByRole("button", { name: "Nächster Tag" }).click();
  expect(new URL(page.url()).searchParams.get("day")).toBe("1");
  await page.getByRole("slider", { name: "Run-Tag auswählen" }).fill("40");
  expect(new URL(page.url()).searchParams.get("day")).toBe("40");
  await page
    .locator(".timeline-table tbody")
    .getByRole("button", { name: "10", exact: true })
    .click();
  expect(new URL(page.url()).searchParams.get("day")).toBe("10");
});

test("mix calculator, climate formulas and nutrient detail modes work", async ({
  page,
}) => {
  await gotoRoute(page, "mix", "guided", 4);
  const volume = page.getByLabel("Mischvolumen in Litern");
  await volume.fill("10");
  await expect(
    page.getByRole("row").filter({ hasText: "HESI TNT" }),
  ).toContainText("12.5 ml");
  await expect(
    page.getByRole("row").filter({ hasText: "Wurzel Complex" }),
  ).toContainText("25.0 ml");
  await volume.fill("-5");
  await expect(volume).toHaveValue("1");

  await page.getByTitle("Advanced").click();
  await expect(page.getByRole("heading", { name: /Schritt 7/ })).toBeVisible();
  await page.getByTitle("Expert").click();
  await expect(page.getByTitle("Expert")).toHaveClass(/active/);

  await gotoRoute(page, "climate", "expert", 4);
  await expect(page.locator("pre.code-block").filter({ hasText: "DLI = PPFD" })).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Kurvendiagramm: PPFD/ }),
  ).toHaveCount(1);

  await gotoRoute(page, "nutrients", "guided", 4);
  await expect(page.locator(".slice-grid")).toHaveCount(0);
  await page.getByTitle("Advanced").click();
  await expect(page.locator(".slice-grid")).toBeVisible();
  await page.getByTitle("Expert").click();
  await expect(page.locator(".slice-grid code").first()).toBeVisible();
  await page.getByRole("button", { name: "Batch berechnen" }).click();
  await expect(page.locator("#main-content h1")).toHaveText("Mischlabor");
});

test("product, compatibility and diagnostic filters behave correctly", async ({
  page,
}) => {
  await gotoRoute(page, "products", "advanced");
  const productSearch = page.getByPlaceholder("In Tabelle filtern");
  await productSearch.fill("Athena Balance");
  await expect(page.locator(".data-table tr")).toHaveCount(2);
  await expect(page.locator(".data-table tr").nth(1)).toContainText(
    /Athena\s*Balance/,
  );
  await expect(page.locator(".panel > header small")).toContainText("TREFFER");
  await productSearch.fill("kein-produkt-xyz");
  await expect(page.locator(".panel > header small")).toContainText(
    "0 TREFFER",
  );

  await gotoRoute(page, "compatibility", "advanced");
  await page.getByPlaceholder("In Tabelle filtern").fill("HESI TNT");
  await expect(page.locator(".data-table")).toContainText("HESI TNT");

  await gotoRoute(page, "diagnostics", "advanced");
  const checks = page.locator(".check-grid input");
  await expect(checks).toHaveCount(7);
  for (let index = 0; index < 5; index += 1) await checks.nth(index).check();
  await expect(page.getByText("BEREIT FÜR HYPOTHESEN")).toBeVisible();
  await checks.nth(0).uncheck();
  await expect(page.getByText("DATEN FEHLEN")).toBeVisible();
  await expect(page.getByText("Legacy-Diagnostik")).toBeVisible();
});

test("knowledge claims and audit findings filter, expand and expose sources", async ({
  page,
}) => {
  await gotoRoute(page, "knowledge", "expert");
  await page
    .locator("#main-content .filter-tabs")
    .getByRole("button", { name: "A", exact: true })
    .click();
  const expectedA = knowledge.claims.filter(
    (claim: { evidence: string }) => claim.evidence === "A",
  ).length;
  await expect(page.locator("article.claim")).toHaveCount(expectedA);
  const firstClaim = page.locator("article.claim").first();
  const head = firstClaim.locator(".claim-head");
  if ((await head.getAttribute("aria-expanded")) !== "true") await head.click();
  await expect(head).toHaveAttribute("aria-expanded", "true");
  await expect(firstClaim.locator(".source-links a").first()).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(firstClaim.locator("pre.code-block")).toBeVisible();
  await head.click();
  await expect(head).toHaveAttribute("aria-expanded", "false");

  await gotoRoute(page, "audit", "advanced");
  await page.getByRole("button", { name: "P0", exact: true }).click();
  const expectedP0 = audit.rows.filter(
    (finding: { priority: string }) => finding.priority === "P0",
  ).length;
  await expect(page.locator(".audit-list article")).toHaveCount(expectedP0);
  await expect(page.locator(".audit-list article").first()).toContainText("P0");
  await page.getByRole("button", { name: "Alle", exact: true }).click();
  await expect(page.locator(".audit-list article")).toHaveCount(
    audit.rows.length,
  );
});

test("raw sheet switching, formula toggle and JSON export preserve data", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "download integrity is browser-independent");
  await gotoRoute(page, "raw", "expert");
  const select = page.getByLabel("Blatt");
  await expect(select.locator("option")).toHaveCount(29);
  await select.selectOption("02_Daily_Master");
  await expect(page.locator(".raw-toolbar")).toContainText("82 Zeilen");
  const formulaToggle = page.getByLabel("Formeln");
  await expect(formulaToggle).toBeChecked();
  await expect(page.locator(".data-table")).toContainText("=IF(");
  await formulaToggle.uncheck();
  await expect(formulaToggle).not.toBeChecked();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("02_Daily_Master.json");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exported = JSON.parse(await readFile(downloadPath as string, "utf8"));
  expect(exported.values).toHaveLength(82);
  expect(exported.formulas).toHaveLength(82);
});

test("data load failure is visible and retryable", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "one network failure path is sufficient");
  await page.route("**/data/evidence-guarded-workbook-v8.json", (route) =>
    route.fulfill({ status: 503, body: "offline" }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Datenbasis konnte nicht geladen werden",
    }),
  ).toBeVisible();
  await expect(page.getByText("HTTP 503")).toBeVisible();
  await page.getByRole("button", { name: "Erneut laden" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Datenbasis konnte nicht geladen werden",
    }),
  ).toBeVisible();
});

test("mobile navigation and every route remain inside the viewport", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile-only interaction and overflow test");
  test.slow();
  await gotoRoute(page, "cockpit", "guided", 4);
  await page.getByRole("button", { name: "Navigation öffnen" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/is-open/);
  await page
    .getByRole("button", { name: "Navigation schließen" })
    .first()
    .click();
  await expect(page.locator(".sidebar")).not.toHaveClass(/is-open/);
  await page
    .getByRole("navigation", { name: "Mobile Schnellnavigation" })
    .getByRole("button", { name: /Heute/ })
    .click();
  await expect(page.locator("#main-content h1")).toHaveText("Heute");

  for (const route of routes) {
    await gotoRoute(page, route, "expert", 4);
    const sizes = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(sizes.body, `${route} overflows horizontally`).toBeLessThanOrEqual(
      sizes.viewport,
    );
  }
});
