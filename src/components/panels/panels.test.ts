import { describe, expect, it } from "vitest";
import { calculateDli, calculateLeafVpd, calculateMix } from "../../domain";
import {
	activateRun,
	addObservation,
	createDefaultRunPackage,
	createObservation,
	updateRunConfig,
} from "../../run-state";
import type { MixBatchRecord, RunConfig, RunPackage } from "../../types";
import { applyMixSafetyRules } from "./NutrientMixPanel";
import { calculateReadinessScore } from "./RunConfigPanel";

describe("Milestone 2 - Panel Component Logic & Calculation Test Suite", () => {
	// ── 1. EnvironmentTargetsPanel Logic Tests ──
	describe("EnvironmentTargetsPanel logic", () => {
		it("calculates Leaf VPD and DLI accurately matching domain calculations", () => {
			const tempAir = 25.0;
			const humidity = 60.0;
			const leafDelta = -1.0;
			const ppfd = 600;
			const lightHours = 18;

			const leafVpd = calculateLeafVpd(tempAir, humidity, leafDelta);
			const airVpd = calculateLeafVpd(tempAir, humidity, 0);
			const dli = calculateDli(ppfd, lightHours);

			expect(leafVpd).toBeGreaterThan(0.7);
			expect(leafVpd).toBeLessThan(1.4);
			expect(airVpd).toBeGreaterThan(leafVpd); // Air VPD is higher when leaf is cooler (-1°C)
			expect(dli).toBeCloseTo(38.88, 2); // 600 * 18 * 3600 / 1e6 = 38.88
		});

		it("records daily observations into RunPackage via addObservation", () => {
			const run = createDefaultRunPackage();
			const currentDay = 14;
			const obs = createObservation(currentDay);

			obs.values.tempMax = 25.5;
			obs.values.humidityMax = 58.0;
			obs.values.ppfd = 550;
			obs.values.leafTemp = 24.5; // 25.5 - 1.0
			obs.notes = "Routine Messung Tag 14";

			const updatedRun = addObservation(run, obs);

			expect(updatedRun.observations.length).toBe(1);
			expect(updatedRun.observations[0]!.day).toBe(14);
			expect(updatedRun.observations[0]!.values.tempMax).toBe(25.5);
			expect(updatedRun.observations[0]!.values.ppfd).toBe(550);
			expect(updatedRun.observations[0]!.notes).toBe("Routine Messung Tag 14");
			expect(updatedRun.events.length).toBeGreaterThan(0);
			expect(updatedRun.auditEvents.length).toBeGreaterThan(
				run.auditEvents.length,
			);
		});
	});

	// ── 2. NutrientMixPanel Logic Tests ──
	describe("NutrientMixPanel logic", () => {
		it("scales 7-step nutrient mix batch dosages accurately for 5L, 10L, and 20L", () => {
			// Mock plan
			const mockPlan = {
				day: 20,
				raw: [
					20,
					"2026-08-11",
					3,
					null,
					"Veg",
					"Wachstum",
					18,
					140,
					500,
					32.4,
					40,
					25,
					20,
					60,
					0.9,
					1.4,
					6.0,
					500,
					1000,
					"Manuell",
					"HESI TNT Complex",
					2.5,
					1.0,
					2.0,
					0.05,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					"Veg",
					"",
					0,
					0,
					0.9,
					0,
					0.5,
					0,
					0.2,
				],
				formulaRow: [],
			};

			const mix5L = calculateMix(mockPlan, 5);
			const mix10L = calculateMix(mockPlan, 10);
			const mix20L = calculateMix(mockPlan, 20);

			const base5L = mix5L.find((i) => i.name === "HESI TNT Complex");
			const base10L = mix10L.find((i) => i.name === "HESI TNT Complex");
			const base20L = mix20L.find((i) => i.name === "HESI TNT Complex");

			expect(base5L?.amount).toBe(12.5); // 2.5 ml/L * 5L
			expect(base10L?.amount).toBe(25.0); // 2.5 ml/L * 10L
			expect(base20L?.amount).toBe(50.0); // 2.5 ml/L * 20L
		});

		it("detects fail-closed incomplete water profile when water parameters are missing", () => {
			const run = createDefaultRunPackage();

			// Default water profile has null values
			expect(run.config.water.sourcePh).toBeNull();
			expect(run.config.water.sourceEc).toBeNull();
			expect(run.config.water.calciumMgL).toBeNull();

			const isIncomplete =
				run.config.water.sourcePh === null ||
				run.config.water.sourceEc === null ||
				run.config.water.calciumMgL === null;

			expect(isIncomplete).toBe(true);
		});

		it("appends MixBatchRecord to run.mixBatches upon batch recording", () => {
			const run = createDefaultRunPackage();
			const record: MixBatchRecord = {
				id: "batch-1",
				runId: run.id,
				day: 20,
				createdAt: new Date().toISOString(),
				waterSourceEc: 0.4,
				waterSourcePh: 7.2,
				waterTempC: 20,
				waterVolumeLiters: 10,
				components: [
					{
						productName: "HESI TNT Complex",
						productId: null,
						plannedDoseMlPerL: 2.5,
						actualDoseMlPerL: 2.5,
						actualTotalMl: 25,
						mixOrder: 1,
					},
				],
				finalEc: 1.4,
				finalPh: 6.2,
				finalVolumeLiters: 10,
				plannedDay: 20,
				deviationNotes: "Perfekt gemischt",
				reservoirId: null,
				batchLabel: "Batch Tag 20",
			};

			const updatedRun: RunPackage = {
				...run,
				mixBatches: [record, ...run.mixBatches],
			};

			expect(updatedRun.mixBatches.length).toBe(1);
			expect(updatedRun.mixBatches[0]!.batchLabel).toBe("Batch Tag 20");
			expect(updatedRun.mixBatches[0]!.finalEc).toBe(1.4);
		});

		it("blocks only chemistry-dependent components when the water profile is incomplete", () => {
			const mockPlan = {
				day: 20,
				raw: [
					20,
					"2026-08-11",
					3,
					null,
					"Veg",
					"Wachstum",
					18,
					140,
					500,
					32.4,
					40,
					25,
					20,
					60,
					0.9,
					1.4,
					6.0,
					500,
					1000,
					"Manuell",
					"HESI TNT Complex",
					2.5,
					1.0,
					2.0,
					0.05,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					"Veg",
					"",
					0,
					0,
					0.9,
					0,
					0.5,
					0,
					0.2,
				],
				formulaRow: [],
			};

			const rawItems = calculateMix(mockPlan, 10);
			const safeItems = applyMixSafetyRules(rawItems, true, false);

			expect(safeItems.length).toBeGreaterThan(0);
			const blocked = safeItems.filter((item) => item.isBlocked);
			const visiblePlan = safeItems.filter((item) => !item.isBlocked);
			expect(blocked.map((item) => item.name)).toEqual(
				expect.arrayContaining(["Athena Balance", "CalMag", "pH Down"]),
			);
			for (const item of blocked) {
				expect(item.dose).toBe(0.0);
				expect(item.amount).toBe(0.0);
				expect(item.statusText).toBe("⛔ Gesperrt: Wasserchemie fehlt");
			}
			expect(visiblePlan.some((item) => item.dose > 0)).toBe(true);
		});

		it("zeros out PK 13/14 dose amount and displays '⛔ GESPERRT: Stacking-Konflikt' when booster conflict is active", () => {
			const mockPlan = {
				day: 45,
				raw: [
					45,
					"2026-08-11",
					7,
					null,
					"Blüte",
					"Generativ",
					12,
					140,
					900,
					48.0,
					40,
					25,
					20,
					60,
					0.9,
					1.4,
					6.0,
					500,
					1000,
					"Manuell",
					"HESI Blüh Complex",
					5.0,
					1.0,
					2.0,
					0.05,
					0,
					2.0,
					1.0,
					0,
					0,
					0,
					0,
					0,
					0,
					"Blüte",
					"",
					0,
					0,
					0.9,
					0,
					0.5,
					0,
					0.2,
				],
				formulaRow: [],
			};

			const rawItems = calculateMix(mockPlan, 10);
			// Water profile complete (false), booster conflict active (true)
			const safeItems = applyMixSafetyRules(rawItems, false, true);

			const pkItem = safeItems.find(
				(i) => i.name === "PK13/14" || i.name === "PK 13/14",
			);
			expect(pkItem).toBeDefined();
			expect(pkItem?.dose).toBe(0.0);
			expect(pkItem?.amount).toBe(0.0);
			expect(pkItem?.statusText).toBe("⛔ GESPERRT: Stacking-Konflikt");
			expect(pkItem?.isBlocked).toBe(true);

			// Verify non-PK items remain unblocked with normal dosages
			const baseItem = safeItems.find(
				(i) => i.name === "HESI Blüh Complex" || i.role === "Basis",
			);
			expect(baseItem).toBeDefined();
			expect(baseItem?.dose).toBeGreaterThan(0);
			expect(baseItem?.amount).toBeGreaterThan(0);
			expect(baseItem?.statusText).toBeUndefined();
		});
	});

	// ── 3. RunConfigPanel Logic Tests ──
	describe("RunConfigPanel logic", () => {
		it("calculates readiness score as 0% for blank/default config with missing water profile", () => {
			const run = createDefaultRunPackage();
			const readiness = calculateReadinessScore(run.config);

			expect(readiness.isReady).toBe(false);
			expect(readiness.score).toBeLessThan(100);
			expect(readiness.missingItems).toContain("Wasser-pH fehlt");
			expect(readiness.missingItems).toContain("Wasser-EC fehlt");
			expect(readiness.missingItems).toContain("Calcium (mg/L) fehlt");
		});

		it("calculates readiness score as 100% when all required fields and water analysis are present", () => {
			const run = createDefaultRunPackage();
			const fullConfig: RunConfig = {
				...run.config,
				name: "Master Grow 2026",
				genetics: "Gorilla Glue #4",
				medium: "Coco",
				mediumProduct: "Canna Coco Professional",
				tentWidthCm: 80,
				tentDepthCm: 80,
				tentHeightCm: 180,
				ledMaxW: 240,
				lightHours: 18,
				pot: {
					...run.config.pot,
					nominalVolumeLiters: 11,
				},
				water: {
					...run.config.water,
					sourceType: "municipal",
					sourcePh: 7.2,
					sourceEc: 0.4,
					calciumMgL: 60,
					magnesiumMgL: 15,
					verified: true,
				},
			};

			const readiness = calculateReadinessScore(fullConfig);

			expect(readiness.score).toBe(100);
			expect(readiness.isReady).toBe(true);
			expect(readiness.missingItems.length).toBe(0);
		});

		it("blocks activation when readiness is not 100% and activates when readiness is 100%", () => {
			const run = createDefaultRunPackage();

			// Attempt activation on draft run with missing water profile
			expect(run.status).toBe("draft");
			const unreadyScore = calculateReadinessScore(run.config);
			expect(unreadyScore.isReady).toBe(false);

			// Populate complete config
			const fullConfig: RunConfig = {
				...run.config,
				name: "Master Grow 2026",
				genetics: "Gorilla Glue #4",
				medium: "Coco",
				tentWidthCm: 80,
				tentDepthCm: 80,
				tentHeightCm: 180,
				ledMaxW: 240,
				lightHours: 18,
				pot: {
					...run.config.pot,
					nominalVolumeLiters: 11,
				},
				water: {
					...run.config.water,
					sourcePh: 7.2,
					sourceEc: 0.4,
					calciumMgL: 60,
					magnesiumMgL: 15,
					verified: true,
				},
			};

			const updatedRun = updateRunConfig(run, fullConfig);
			const readyScore = calculateReadinessScore(updatedRun.config);
			expect(readyScore.isReady).toBe(true);

			const activatedRun = activateRun(updatedRun);
			expect(activatedRun.status).toBe("active");
			expect(activatedRun.configurationSnapshot.version).toBe(2);
			expect(activatedRun.configurationSnapshot.config.genetics).toBe(
				"Gorilla Glue #4",
			);
		});
	});

	// ── 4. VpdDliCalculatorPanel Logic Tests ──
	describe("VpdDliCalculatorPanel logic", () => {
		it("evaluates simulated microclimate inputs against all 4 growth phase targets", () => {
			// Simulate Veg climate: Temp 25°C, RLF 60%, Leaf Delta -1°C => Leaf VPD ~0.95 kPa, PPFD 500, 18h => DLI 32.4
			const tempAir = 25.0;
			const humidity = 60.0;
			const leafDelta = -1.0;
			const ppfd = 500;
			const hours = 18;

			const leafVpd = calculateLeafVpd(tempAir, humidity, leafDelta);
			const dli = calculateDli(ppfd, hours);

			// Phase 1 (Sämling: VPD 0.4-0.8) -> 0.95 is slightly high / warning
			expect(leafVpd).toBeGreaterThan(0.8);

			// Phase 2 (Veg: VPD 0.8-1.1) -> 0.95 is Optimal!
			expect(leafVpd).toBeGreaterThanOrEqual(0.8);
			expect(leafVpd).toBeLessThanOrEqual(1.1);

			// DLI (32.4) vs Veg target (20-30) -> slightly above veg target, close to bloom target (35-45)
			expect(dli).toBeCloseTo(32.4, 1);
		});

		it("safely handles edge case slider values without NaN or throwing errors", () => {
			const extremeLowVpd = calculateLeafVpd(15.0, 90.0, -4.0);
			const extremeHighVpd = calculateLeafVpd(35.0, 30.0, 2.0);
			const zeroDli = calculateDli(0, 12);
			const maxDli = calculateDli(1200, 24);

			expect(Number.isNaN(extremeLowVpd)).toBe(false);
			expect(Number.isNaN(extremeHighVpd)).toBe(false);
			expect(zeroDli).toBe(0);
			expect(maxDli).toBe(103.68); // 1200 * 24 * 3600 / 1e6 = 103.68
		});
	});
});
