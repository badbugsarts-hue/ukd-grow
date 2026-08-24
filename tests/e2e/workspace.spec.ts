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
    "masterplan",
    "plan-editor",
    "cockpit",
    "setup",
    "log",
    "today",
    "timeline",
    "history",
    "mix",
    "reservoir",
    "energy",
    "post-harvest",
    "climate",
    "calc",
    "nutrients",
    "products",
    "inventory",
    "autoflower",
    "compatibility",
    "diagnostics",
    "knowledge",
    "audit",
    "raw",
    "legal",
    "reports",
    "media",
    "system",
    "connector",
    "profiles",
    "equipment",
    "ipm",
    "incidents",
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

for (const route of [
  "masterplan",
  "plan-editor",
  "cockpit",
  "setup",
  "log",
  "today",
  "timeline",
  "history",
  "mix",
  "reservoir",
  "energy",
  "post-harvest",
  "climate",
  "calc",
  "nutrients",
  "products",
  "inventory",
  "autoflower",
  "compatibility",
  "diagnostics",
  "knowledge",
  "audit",
  "raw",
  "legal",
  "reports",
  "media",
  "system",
  "connector",
  "profiles",
  "equipment",
  "ipm",
  "incidents",
] as const) {
  test(`workspace view ${route} passes automated WCAG 2.2 AA checks`, async ({
    page,
  }) => {
    const issues: string[] = [];
    for (const theme of ["dark", "light"] as const) {
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
    expect(issues, issues.join("\n")).toEqual([]);
  });
}

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
  const tntRow = page.getByRole("row").filter({ hasText: "HESI TNT" });
  await expect(page.getByText(/Pflanzen-\/Batch-Freigabe fehlt/)).toBeVisible();
  await expect(tntRow).toContainText("Gesperrt");
});

async function expectNoAxeViolations(page: Page, state: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations,
    `${state}: ${results.violations
      .map((violation) => `${violation.id} (${violation.nodes.length})`)
      .join(", ")}`,
  ).toEqual([]);
}

test("calibration and PPFD capture dialogs remain honest and accessible", async ({
  page,
}) => {
  // Full axe passes over the equipment workspace are intentionally expensive.
  test.setTimeout(900_000);

  await page.goto("/?lens=guided&day=4#equipment");
  await page.getByRole("button", { name: "+ Messgerät kalibrieren" }).click();
  await expect(
    page.getByRole("dialog", { name: /Messgerät-Kalibrierungs-Assistent/ }),
  ).toBeVisible();
  await expectNoAxeViolations(page, "calibration step 1");
  await page.getByLabel("Geräte-ID / Asset-ID").fill("PH-METER-01");
  await page
    .getByLabel("Referenz-Kalibrierlösung (Standard)")
    .fill("Puffercharge TEST-01");
  await page.getByRole("button", { name: /Weiter zu Schritt 2/ }).click();
  await expectNoAxeViolations(page, "calibration step 2");
  await page.getByRole("button", { name: /☑|Erfolgreich/ }).click();
  await page.getByRole("button", { name: /Weiter zu Schritt 3/ }).click();
  await page
    .getByLabel("Gültigkeit laut Hersteller-/Laborvorgabe (Tage)")
    .fill("14");
  await expectNoAxeViolations(page, "calibration step 3");
  await page.getByRole("button", { name: "Kalibrierung Abschließen" }).click();
  await expect(page.getByText("✓ Gültig").first()).toBeVisible();

  await page
    .getByRole("button", { name: "+ Neues PPFD-Grid erfassen" })
    .click();
  await expect(
    page.getByRole("dialog", { name: /9-Punkt.*Mapping/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Lampenabstand (Höhe in cm)")).toHaveValue("0");
  await expect(page.locator('input[id^="ppfd-"]')).toHaveCount(9);
  await expectNoAxeViolations(page, "empty PPFD capture");
  await page.getByLabel("Lampenabstand (Höhe in cm)").fill("40");
  await page
    .getByLabel("Messgerät / Sensor")
    .fill("PAR-METER-01 / Seriennummer TEST");
  for (const input of await page.locator('input[id^="ppfd-"]').all()) {
    await input.fill("500");
  }
  await page.getByRole("button", { name: "PPFD-Mapping Speichern" }).click();
  await expect(page.getByText(/Aktuelles Mapping/)).toBeVisible();
  await expect(page.getByText("500 µmol").first()).toBeVisible();
});

test("plant identity editing remains honest and accessible", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/?lens=guided#setup");
  await page
    .getByRole("button", { name: /Identität anpassen/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: /Pflanzen-Identität/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Saatgut-Typ")).toHaveValue("unknown");
  await expectNoAxeViolations(page, "plant identity editor");
  await page.getByLabel("Saatgut-Typ").selectOption("autoflower");
  await page
    .getByRole("button", { name: "Identität & Anker Speichern" })
    .click();
  await expect(page.getByText("autoflower", { exact: true }).first()).toBeVisible();
});

test("blocked actual mix capture remains honest and accessible", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.goto("/?lens=guided&day=4#mix");
  const actualDoseInputs = page.locator(
    'input[aria-label^="Tatsächliche Dosis"]',
  );
  await expect(actualDoseInputs).toHaveCount(0);
  await expect(
    page.getByText(/Pflanzen-\/Batch-Zustand unvollständig/).first(),
  ).toBeVisible();
  const recordBatchButton = page.getByRole("button", {
    name: "📝 Ist-Charge aufzeichnen",
  });
  await expect(recordBatchButton).toBeDisabled();
  await expectNoAxeViolations(page, "blocked actual mix capture");
});

test("global plan preserves unknown water chemistry and remains accessible", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.goto("/?lens=guided#plan-editor");
  await expect(page.locator("#rcp-water-alkalinity")).toHaveValue("");
  await expect(page.locator("#rcp-water-ca")).toHaveValue("");
  await expect(page.locator("#rcp-water-mg")).toHaveValue("");
  await expectNoAxeViolations(page, "global plan unknown water chemistry");
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
