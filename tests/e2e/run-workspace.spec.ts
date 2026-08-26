import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const knowledge = JSON.parse(
  readFileSync(
    new URL("../../src/data/knowledge-base.json", import.meta.url),
    "utf8",
  ),
);

async function open(page: Page, route: string, day = 4) {
  await page.goto(`/?lens=advanced&day=${day}#${route}`);
  await expect(page.locator("#main-content h1")).toBeVisible();
}

async function readPersistedActiveRunGenetics(page: Page) {
  return page.evaluate(
    () =>
      new Promise<string | null>((resolve, reject) => {
        const request = indexedDB.open("ukd-operator-workspace", 8);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(
            ["workspace-meta", "run-packages-v3"],
            "readonly",
          );
          transaction.oncomplete = () => database.close();
          transaction.onerror = () => reject(transaction.error);
          const activeRequest = transaction
            .objectStore("workspace-meta")
            .get("active-run-id");
          activeRequest.onerror = () => reject(activeRequest.error);
          activeRequest.onsuccess = () => {
            const activeRunId = activeRequest.result;
            if (typeof activeRunId !== "string") {
              resolve(null);
              return;
            }
            const runRequest = transaction
              .objectStore("run-packages-v3")
              .get(activeRunId);
            runRequest.onerror = () => reject(runRequest.error);
            runRequest.onsuccess = () =>
              resolve(runRequest.result?.config?.genetics ?? null);
          };
        };
      }),
  );
}

test("run setup autosaves in IndexedDB and drives the cockpit", async ({
  page,
}) => {
  await open(page, "setup");
  await page
    .getByLabel(/Genetik \/ Strain Name/)
    .first()
    .fill("Test Genetic 2026");
  await page.locator("#rcp-run-name").fill("Test Run");
  await page.locator("#rcp-water-ph").fill("7.2");
  await page.locator("#rcp-water-ec").fill("0.3");
  await page.locator("#rcp-water-ca").fill("60");
  await page.locator("#rcp-water-mg").fill("20");
  await page.locator("#rcp-medium").selectOption("Erde");
  await page.locator("#rcp-pot-volume").fill("11");
  await page.locator("#rcp-led-max-w").fill("140");
  await page.locator("#rcp-light-hours").fill("18");
  await page.locator("#rcp-tent-width").fill("60");
  await page.locator("#rcp-tent-depth").fill("60");
  await page.locator("#rcp-tent-height").fill("180");
  await page.getByRole("button", { name: /Run Aktivieren/i }).click();
  await expect(page.getByText(/Run bereits aktiv/i)).toBeVisible();
  await expect
    .poll(() => readPersistedActiveRunGenetics(page), { timeout: 60_000 })
    .toBe("Test Genetic 2026");
  await page.reload();
  await expect(page.getByLabel(/Genetik \/ Strain Name/).first()).toHaveValue(
    "Test Genetic 2026",
  );
  await open(page, "cockpit");
  await expect(page.getByText("Test Genetic 2026")).toBeVisible();
  await expect(page.getByText("Wasserchemie").locator("..")).toContainText(
    "ERFASST",
  );
});

test("measurement log derives alerts and survives reload", async ({ page }) => {
  await open(page, "log");
  await expect(page.getByText("Aktuelle Messung fehlt")).toBeVisible();
  await page.getByLabel("pH Eingang").fill("6.5");
  await page.getByLabel("EC Eingang · mS/cm").fill("0.8");
  await page.getByLabel("Beobachtungen / Notizen").fill("Kontrollmessung");
  await page.getByRole("button", { name: "Messung speichern" }).click();
  await expect(
    page.getByText("pH außerhalb des Arbeitskorridors"),
  ).toBeVisible();
  await expect(page.locator(".event-list")).toContainText(
    "Messdatensatz gespeichert",
  );
  await page.getByLabel("Kategorie").selectOption("foliage");
  await page.getByLabel("Schwere").selectOption("mild");
  await page
    .getByLabel("Beobachtung", { exact: true })
    .fill("Blattspitzen leicht heller");
  await page.getByRole("button", { name: "Beobachtung speichern" }).click();
  await expect(page.locator(".event-list")).toContainText(
    "Blattspitzen leicht heller",
  );
  await page.getByLabel("Originalmessung").selectOption({ index: 1 });
  await page.getByLabel("Korrigierter Wert").fill("5.9");
  await page.getByLabel("Korrekturgrund").fill("decimal-entry-error");
  await page
    .getByRole("button", { name: "Korrektur als neues Event speichern" })
    .click();
  await expect(page.locator(".event-list")).toContainText(
    "Messwert korrigiert",
  );
  await page.getByLabel("Feld / Regel").fill("ec.target");
  await page.getByLabel("Kanonischer Wert").fill("0.8");
  await page.getByLabel("Override-Wert").fill("0.9");
  await page.getByLabel("Begründung").fill("Dokumentierter Versuch");
  await page
    .getByRole("button", { name: "Override mit Begründung speichern" })
    .click();
  await expect(page.locator(".event-list")).toContainText(
    "Override: ec.target",
  );
  await page.getByRole("button", { name: "Geprüft" }).first().click();
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.locator(".event-list")).toContainText("Kontrollmessung");
});

test("run repository creates and switches immutable local runs", async ({
  page,
}) => {
  await open(page, "history");
  await expect(
    page.getByRole("heading", { name: "Versionierte Runs" }),
  ).toBeVisible();
  await page.waitForTimeout(500);
  const cards = page.locator(".run-list article");
  await expect(cards).toHaveCount(1);
  await page.getByRole("button", { name: "Neuen Run-Entwurf anlegen" }).click();
  await expect(cards).toHaveCount(2);
  await expect(page.locator(".run-list article.active")).toContainText("DRAFT");
  await page.getByRole("button", { name: "Run öffnen" }).first().click();
  await expect(page.locator(".run-list article.active")).toContainText(
    /DRAFT|ACTIVE/,
  );
});

test("today checklist persists across navigation and reload", async ({
  page,
}) => {
  await open(page, "today");
  await page
    .getByRole("button", { name: "Schritt 3: Maßnahmen & Bestätigung" })
    .click();
  const task = page.getByLabel("Zelt-Klima & Sensoren pruefen");
  await task.check();
  await open(page, "cockpit");
  await open(page, "today");
  await page
    .getByRole("button", { name: "Schritt 3: Maßnahmen & Bestätigung" })
    .click();
  await expect(page.getByLabel("Zelt-Klima & Sensoren pruefen")).toBeChecked();
  await page.waitForTimeout(500);
  await page.reload();
  await page
    .getByRole("button", { name: "Schritt 3: Maßnahmen & Bestätigung" })
    .click();
  await expect(page.getByLabel("Zelt-Klima & Sensoren pruefen")).toBeChecked();
});

test("all report formats download and invalid restore is rejected", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(120_000);
  test.skip(isMobile, "download format integrity is browser-independent");
  await open(page, "reports");
  let validBackupPath: string | null = null;
  for (const [button, extension] of [
    ["JSON sichern", ".json"],
    ["CSV exportieren", ".csv"],
    ["XLSX exportieren", ".xlsx"],
    ["PDF erzeugen", ".pdf"],
  ] as const) {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: button }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(extension);
    const stream = await download.createReadStream();
    let size = 0;
    for await (const chunk of stream) size += chunk.length;
    expect(size).toBeGreaterThan(20);
    const savedPath = await download.path();
    expect(savedPath).not.toBeNull();
    if (extension === ".json" && savedPath) {
      validBackupPath = savedPath;
      const envelope = JSON.parse(readFileSync(savedPath, "utf8"));
      expect(envelope.appVersion).toBe("8.0.0");
      expect(envelope.runSchemaVersion).toBe("6.0.0");
    }
    if (extension === ".xlsx" && savedPath) {
      const exceljs = await import("exceljs");
      const WorkbookConstructor = exceljs.Workbook ?? exceljs.default.Workbook;
      const workbook = new WorkbookConstructor();
      await workbook.xlsx.load(readFileSync(savedPath));
      expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(
        expect.arrayContaining([
          "Observations",
          "Mix Batches",
          "Irrigation",
          "Growth Events",
          "Equipment",
          "Maintenance",
          "IPM",
          "Incidents",
          "Post Harvest",
          "Energy",
          "Product Inventory",
        ]),
      );
      const observationHeaders = workbook
        .getWorksheet("Observations")
        ?.getRow(1).values;
      expect(observationHeaders).toEqual(
        expect.arrayContaining([
          "waterLiters",
          "drainLiters",
          "drainPercent",
          "potMassGrams",
        ]),
      );
    }
  }
  expect(validBackupPath).not.toBeNull();
  if (validBackupPath) {
    await page.locator('input[type="file"]').setInputFiles(validBackupPath);
    await expect(page.locator(".save-state")).toContainText(
      "isoliert geprüft und atomar wiederhergestellt",
    );
  }
  await page.locator('input[type="file"]').setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":"9"}'),
  });
  await expect(page.locator(".inline-error")).toContainText("Fehler");
});

test("P0 operations use state machines and persist through the command gateway", async ({
  page,
}) => {
  await open(page, "ipm");
  await page.getByLabel("Befund").fill("Blattunterseite auffällig");
  await page.getByLabel("Ort").fill("Canopy links");
  await page.getByRole("button", { name: "Inspektion speichern" }).click();
  await expect(page.getByText("Blattunterseite auffällig")).toBeVisible();
  await page
    .getByRole("button", { name: "Nächsten Status bestätigen" })
    .click();
  await expect(page.getByText(/MONITORING/)).toBeVisible();

  await open(page, "incidents");
  await page.getByLabel("Beschreibung").fill("Abluft ausgefallen");
  await page.getByLabel("Kategorie").selectOption("fan-failure");
  await page.getByLabel("Schweregrad").selectOption("high");
  await page.getByRole("button", { name: "Incident eröffnen" }).click();
  await expect(page.getByText("Abluft ausgefallen")).toBeVisible();
  await expect(page.getByText(/Plan superseded: JA/)).toBeVisible();

  await open(page, "inventory");
  await page.getByLabel("Produkt").fill("Reference Test Product");
  await page.getByLabel("Gebindegröße").fill("1 L");
  await page.getByRole("button", { name: "Bestand hinzufügen" }).click();
  await expect(page.getByText("Reference Test Product")).toBeVisible();

  await open(page, "equipment");
  await page.getByLabel("Hersteller").fill("UKD Test");
  await page.getByLabel("Modell").fill("Asset 01");
  await page.getByRole("button", { name: "Asset hinzufügen" }).click();
  await expect(
    page.getByRole("heading", { name: "UKD Test Asset 01" }),
  ).toBeVisible();
});

test("legal profile stays session-only while inventory persists", async ({
  page,
}) => {
  await open(page, "legal");
  await page
    .locator('input[type="file"]')
    .setInputFiles(
      fileURLToPath(
        new URL("../../src/data/legal-profile.example.json", import.meta.url),
      ),
    );
  await expect(page.getByText(/Autorisierungen geladen/)).toBeVisible();
  await page.getByLabel("Menge · g").fill("12.5");
  await page.getByLabel("Nachweisreferenz").fill("lokaler Nachweis");
  await page.getByRole("button", { name: "Ereignis speichern" }).click();
  await expect(page.locator(".inventory-balance")).toContainText("12.50 g");
  await page.waitForTimeout(500);
  await page.reload();
  await expect(
    page.getByText("Kein persönliches Rechtsprofil geladen"),
  ).toBeVisible();
  await expect(page.locator(".inventory-balance")).toContainText("12.50 g");
});

test("system verifies the canonical hash and stores accessibility settings", async ({
  page,
}) => {
  await open(page, "system");
  await page.getByRole("button", { name: "Workbook verifizieren" }).click();
  await expect(page.locator(".system-status-grid").first()).toContainText(
    "VALID",
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: "Hoher Kontrast" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
  await page.getByRole("button", { name: "Text 115 %" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-text-scale",
    "large",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
  await expect(page.locator("html")).toHaveAttribute(
    "data-text-scale",
    "large",
  );
});

test("diagnostic bundle exposes health but no domain or legal payload", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "download content is browser-independent");
  await open(page, "system");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Diagnose-Bundle erstellen" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const bundle = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
    string,
    unknown
  >;
  expect(bundle.format).toBe("ukd-diagnostic-bundle");
  expect(bundle.observations).toBeUndefined();
  expect(bundle.legalProfile).toBeUndefined();
  expect(bundle.notes).toBeUndefined();
});

test("search deep-links to the selected claim and workbook sheet", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop command palette interaction");
  await open(page, "cockpit");
  await page.keyboard.press("Control+K");
  const search = page.getByPlaceholder(/Suche nach Seite/);
  await search.fill(knowledge.claims[1].title);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#knowledge/);
  await page.keyboard.press("Control+K");
  await page.getByPlaceholder(/Suche nach Seite/).fill("17_All_Products");
  await page.keyboard.press("Enter");
  await expect(page.locator(".raw-toolbar select")).toHaveValue(
    "17_All_Products",
  );
});

test("library preserves semantic headers and supports sorting", async ({
  page,
}) => {
  await open(page, "products");
  await page.getByPlaceholder("In Tabelle filtern").fill("Athena Balance");
  await expect(page.locator(".data-table th")).not.toHaveCount(0);
  await expect(page.locator(".data-table tbody tr").first()).toContainText(
    /Athena.*Balance/,
  );
  await page.getByPlaceholder("In Tabelle filtern").fill("");
  const manufacturer = page.getByRole("button", { name: /Hersteller/ });
  await manufacturer.click();
  await expect(manufacturer.locator("..")).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
});

test("dialogs trap and restore focus and question marks remain editable", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop focus restoration test");
  await open(page, "cockpit");
  const help = page.getByRole("button", { name: "Hilfe zur Ansicht" });
  await help.focus();
  await help.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  await open(page, "log");
  const notes = page.getByLabel("Beobachtungen / Notizen");
  await notes.fill("Warum?");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(notes).toHaveValue("Warum?");
});

test("file connector validates, previews and commits measurements as unverified", async ({
  page,
}) => {
  await open(page, "connector");
  await page.locator('input[type="file"]').setInputFiles({
    name: "measurements.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "timestamp,metric,value,unit,deviceId,source",
        "2026-08-18T10:00:00Z,water.ec,1.2,mS/cm,ec-meter-1,manual-export",
      ].join("\n"),
    ),
  });
  await page.getByRole("button", { name: "Validieren & Vorschau" }).click();
  await expect(
    page.getByText("Schema- und Einheitenprüfung bestanden."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Validierten Batch übernehmen" })
    .click();
  await expect(
    page.getByText("1 Messwerte wurden als unverified übernommen."),
  ).toBeVisible();
  await open(page, "log");
  await expect(page.getByText(/Messdatei importiert/).first()).toBeVisible();
});

test("setup profiles create a new immutable run draft without replacing history", async ({
  page,
}) => {
  await open(page, "profiles");
  await page.getByLabel("Profilname").fill("60x60 Reference");
  await page.getByRole("button", { name: "Setup-Profil speichern" }).click();
  await expect(
    page.getByText("Setup-Profil versioniert gespeichert."),
  ).toBeVisible();
  await page.getByLabel("Templatename").fill("Double Grape Template");
  await page.getByRole("button", { name: "Template speichern" }).click();
  await expect(page.getByText(/Run-Template gespeichert/)).toBeVisible();
  await page
    .getByRole("button", { name: "Neuen Run-Entwurf erstellen" })
    .click();
  await expect(page.getByText(/Neuer Entwurf/)).toBeVisible();
  await open(page, "history");
  await expect(
    page.getByRole("region", { name: "Gespeicherte Runs" }).locator("article"),
  ).toHaveCount(2);
});
