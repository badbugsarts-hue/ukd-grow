import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test.describe.configure({ timeout: 120_000 });

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.evaluate(async () => {
		localStorage.clear();
		await new Promise<void>((resolve) => {
			const request = indexedDB.deleteDatabase("ukd-operator-workspace");
			request.onsuccess = () => resolve();
			request.onerror = () => resolve();
			request.onblocked = () => resolve();
		});
	});
	await page.reload();
	await expect(page.getByRole("main")).toBeVisible();
});

test("Live-Preflight, Today, AI exchange, proposal decision and backup work end-to-end", async ({ page }) => {
	const mode = page.getByRole("button", { name: "Betriebsmodus und globale Aktionen öffnen" });
	await expect(mode).toContainText("SIMULATION");
	await mode.click();
	await page.getByRole("button", { name: /Live starten/ }).click();
	await expect(page.getByRole("heading", { name: "Simulation als Live-Run starten" })).toBeVisible();
	await page.getByRole("button", { name: /Aussaat bestätigen/ }).click();
	await expect(mode).toContainText("LIVE", { timeout: 30_000 });
	await expect(mode).toContainText("Tag 0");

	await mode.click();
	const exportDownload = page.waitForEvent("download");
	await page.getByRole("button", { name: "Für AI exportieren" }).click();
	const exported = await exportDownload;
	const exportedPath = await exported.path();
	expect(exportedPath).toBeTruthy();
	const exchange = JSON.parse(readFileSync(exportedPath!, "utf8"));
	expect(exchange.format).toBe("ukd-ai-exchange/1");
	expect(exchange.payload.run.inventory).toBeUndefined();

	const proposal = {
		format: "ukd-ai-proposal/1",
		baseRunId: exchange.baseRunId,
		baseRunSha256: exchange.baseRunSha256,
		proposals: [{
			id: "e2e-guidance-1",
			targetPath: "guidance.note",
			operation: "guidance",
			baseValue: null,
			proposedValue: "Wasser-Baseline vor einer chemieabhängigen Entscheidung messen.",
			reason: "Die Wasserchemie ist unvollständig; zuerst messen statt einen Wert zu erfinden.",
			uncertainty: "low",
			ruleIds: ["water-baseline-required"],
			claimIds: [],
			sourceIds: ["athena-balance-official"],
		}],
	};
	await page.locator('input[type="file"][accept*="ukdai"]').setInputFiles({
		name: "proposal.ukdai.json",
		mimeType: "application/json",
		buffer: Buffer.from(JSON.stringify(proposal)),
	});
	await expect(page.getByRole("heading", { name: "AI-Vorschläge" })).toBeVisible();
	await page.getByRole("button", { name: "Annehmen" }).click();
	await page.evaluate(() => { window.location.hash = "log"; });
	await expect(page.getByText("AI-Vorschlag angenommen")).toBeVisible();

	// The proposal review was launched from the Command Center; after the final
	// decision the underlying global dialog becomes active again.
	await expect(page.getByRole("dialog", { name: "Command Center" })).toBeVisible();
	const backupDownload = page.waitForEvent("download");
	await page.getByRole("dialog", { name: "Command Center" }).getByRole("button", { name: "Sofortbackup", exact: true }).click();
	const backup = await backupDownload;
	expect(backup.suggestedFilename()).toContain(".ukdbackup");
});

test("global Quick Log records measured values with audit and timeline", async ({ page }) => {
	await page.getByRole("button", { name: "Quick Log" }).click();
	const dialog = page.getByRole("dialog", { name: "Quick Log" });
	await expect(dialog).toBeVisible();
	await dialog.getByLabel("Messgröße").selectOption("phIn");
	await dialog.getByLabel("Wert").fill("5.91");
	await dialog.getByLabel("Notiz (optional)").fill("Kontrollmessung Quick Log");
	await dialog.getByRole("button", { name: "Eintrag speichern" }).click();
	await expect(dialog).toBeHidden();

	await page.getByRole("button", { name: "AI / Mehr" }).click();
	await expect(page.getByText(/Quick Log wurde mit Audit- und Timeline-Spur gespeichert/)).toBeVisible();
	await page.getByRole("button", { name: "Command Center schließen" }).click();
	await page.evaluate(() => { window.location.hash = "log"; });
	await expect(page.getByText("Kontrollmessung Quick Log")).toBeVisible();
});

test("shared dialogs trap focus, close with Escape and restore the trigger", async ({ page }) => {
	const trigger = page.getByRole("button", { name: "Betriebsmodus und globale Aktionen öffnen" });
	await trigger.focus();
	await trigger.click();
	const dialog = page.getByRole("dialog", { name: "Command Center" });
	await expect(dialog).toBeVisible();
	await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
	await expect(trigger).toBeFocused();
	await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});
