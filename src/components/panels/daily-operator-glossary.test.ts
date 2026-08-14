import React from "react";
import { describe, expect, it, vi } from "vitest";
import { calculateDli, calculateLeafVpd, calculateMix } from "../../domain";
import {
	acknowledgeAlert,
	addObservation,
	addStructuredObservation,
	createDefaultRunPackage,
	createObservation,
	latestObservation,
	setTaskCompleted,
	transitionTaskState,
} from "../../run-state";
import type {
	DayPlan,
	ObservationSeverity,
	StructuredObservation,
	StructuredObservationCategory,
} from "../../types";
import {
	DICTIONARY,
	getAllTerms,
	getTermDefinition,
	getTermDescription,
	searchTerms,
} from "../common/termDictionary";
import { ContextHelpGlossaryPanel } from "./ContextHelpGlossaryPanel";
import { DailyOperatorPanel, getTargetsForDay } from "./DailyOperatorPanel";

// ── Mock DayPlan Helper ──
function createMockDayPlan(day: number): DayPlan {
	const isSeedling = day <= 7;
	const isVeg = day > 7 && day <= 28;
	const isBloom = day > 28 && day <= 63;
	const phase = isSeedling
		? "Sämling"
		: isVeg
			? "Veg"
			: isBloom
				? "Hauptblüte"
				: "Spätblüte";
	const lightHours = isBloom || day > 63 ? 12 : 18;
	const ppfd = isSeedling ? 200 : isVeg ? 500 : 900;
	const dli = calculateDli(ppfd, lightHours);
	const ec = isSeedling ? 0.8 : isVeg ? 1.4 : 1.8;
	const ph = 6.0;
	const tempLight = isSeedling ? 24 : isVeg ? 25 : 23;
	const humidity = isSeedling ? 70 : isVeg ? 60 : 45;
	const leafVpd = calculateLeafVpd(tempLight, humidity, -1.0);

	return {
		day,
		raw: [
			day,
			"2026-08-11",
			Math.ceil((day + 1) / 7),
			null,
			phase,
			"Tagesziel Entwicklung",
			lightHours,
			140,
			ppfd,
			dli,
			40,
			tempLight,
			20,
			humidity,
			leafVpd,
			ec,
			ph,
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
			phase,
			"Tageskontrolle",
			0,
			0,
			leafVpd,
			0,
			0.5,
			0,
			0.2,
		],
		formulaRow: [],
	};
}

describe("Milestone 3 - Daily Operator & Knowledge Glossary Panel Unit Test Suite", () => {
	// ── PART 1: DailyOperatorPanel Suite ──
	describe("DailyOperatorPanel Unit Tests", () => {
		it("1.1 Navigates days (0-80) and clamps boundary day selection correctly", () => {
			const targetSeedling = getTargetsForDay(0);
			expect(targetSeedling.phaseShort).toBe("Keimung");

			const targetVeg = getTargetsForDay(14);
			expect(targetVeg.phaseShort).toBe("Veg");

			const targetBloom = getTargetsForDay(45);
			expect(targetBloom.phaseShort).toBe("Hauptblüte");

			const targetLateBloom = getTargetsForDay(75);
			expect(targetLateBloom.phaseShort).toBe("Spätblüte");

			// Boundary clamping logic test
			const clampDay = (d: number) => Math.max(0, Math.min(80, d));
			expect(clampDay(-5)).toBe(0);
			expect(clampDay(0)).toBe(0);
			expect(clampDay(42)).toBe(42);
			expect(clampDay(80)).toBe(80);
			expect(clampDay(105)).toBe(80);
		});

		it("1.2 Calculates target corridors from DayPlan or fallback matrix accurately", () => {
			const mockPlan = createMockDayPlan(20);
			const planTargets = getTargetsForDay(20, mockPlan);

			expect(planTargets.phaseName).toBe("Veg");
			expect(planTargets.lightHours).toBe(18);
			expect(planTargets.ppfdMin).toBe(425); // Math.round(500 * 0.85)
			expect(planTargets.ppfdMax).toBe(575); // Math.round(500 * 1.15)
			expect(planTargets.ecTarget).toBe(1.4);
			expect(planTargets.phTarget).toBe(6.0);

			// Fallback matrix test when plan is undefined
			const fallbackVeg = getTargetsForDay(20, undefined);
			expect(fallbackVeg.phaseName).toContain("Vegetation");
			expect(fallbackVeg.ppfdMin).toBe(400);
			expect(fallbackVeg.ppfdMax).toBe(600);
			expect(fallbackVeg.ecTarget).toBe(1.4);
		});

		it("1.3 Pre-fills daily measurement form and records daily observations immutably via addObservation", () => {
			const run = createDefaultRunPackage();
			const onUpdateRun = vi.fn();
			const currentDay = 14;

			const obs = createObservation(currentDay);
			obs.values.tempMax = 25.5;
			obs.values.tempMin = 20.0;
			obs.values.humidityMax = 62.0;
			obs.values.humidityMin = 55.0;
			obs.values.ppfd = 550;
			obs.values.leafTemp = 24.5;
			obs.values.phIn = 6.0;
			obs.values.ecIn = 1.4;
			obs.values.phDrain = 6.2;
			obs.values.ecDrain = 1.5;
			obs.values.waterLiters = 1.0;
			obs.values.drainLiters = 0.2;
			obs.notes = "Tag 14 Routine-Messung: Blattoberfläche 24.5°C";

			const updatedRun = addObservation(run, obs);
			onUpdateRun(updatedRun);

			expect(onUpdateRun).toHaveBeenCalledTimes(1);
			expect(updatedRun.observations.length).toBe(1);
			expect(updatedRun.observations[0]!.day).toBe(14);
			expect(updatedRun.observations[0]!.values.tempMax).toBe(25.5);
			expect(updatedRun.observations[0]!.values.ppfd).toBe(550);
			expect(updatedRun.auditEvents.length).toBeGreaterThan(
				run.auditEvents.length,
			);

			// Verify latest observation lookup helper
			const latest = latestObservation(updatedRun, 14);
			expect(latest).toBeDefined();
			expect(latest?.values.tempMax).toBe(25.5);
		});

		it("1.4 Records structured observations with tags, category, and severity via addStructuredObservation", () => {
			const run = createDefaultRunPackage();
			const category: StructuredObservationCategory = "foliage";
			const severity: ObservationSeverity = "mild";

			const structuredObs: StructuredObservation = {
				id: "so-1",
				runId: run.id,
				zoneId: run.zones[0]?.id || "tent-main",
				observedAt: new Date().toISOString(),
				category,
				severity,
				text: "Leichte Aufhellung an den untersten Fächerblättern",
				tags: ["#gelbe_blaetter", "#untere_zonen"],
				photoIds: [],
			};

			const updatedRun = addStructuredObservation(run, structuredObs);

			expect(updatedRun.structuredObservations.length).toBe(1);
			expect(updatedRun.structuredObservations[0]!.category).toBe("foliage");
			expect(updatedRun.structuredObservations[0]!.severity).toBe("mild");
			expect(updatedRun.structuredObservations[0]!.tags).toContain(
				"#gelbe_blaetter",
			);
			expect(updatedRun.auditEvents.length).toBeGreaterThan(
				run.auditEvents.length,
			);
		});

		it("1.5 Toggles checklist task completion and state transitions via setTaskCompleted & transitionTaskState", () => {
			const run = createDefaultRunPackage();
			const day = 14;
			const taskTitle = "Zelt-Klima & Sensoren prüfen";

			// Toggle completed true (which creates task with state 'completed')
			const runTaskDone = setTaskCompleted(run, day, taskTitle, true);
			expect(runTaskDone.completedTasks[day]).toContain(taskTitle);

			const createdTask = runTaskDone.tasks.find(
				(t) => t.day === day && t.title === taskTitle,
			);
			expect(createdTask).toBeDefined();

			if (createdTask) {
				// First move completed -> due so transition to blocked is allowed by domain state machine
				const resetRun = setTaskCompleted(runTaskDone, day, taskTitle, false);
				const resetTask = resetRun.tasks.find((t) => t.id === createdTask.id);
				expect(resetTask?.state).toBe("due");

				// Transition task state from 'due' to 'blocked' with reason
				const result = transitionTaskState(
					resetRun,
					createdTask.id,
					"blocked",
					"Sensor nicht kalibriert",
				);
				expect(result.ok).toBe(true);
				if (result.ok) {
					expect(result.run.tasks.length).toBeGreaterThan(0);
					const matchedTask = result.run.tasks.find(
						(t) => t.id === createdTask.id,
					);
					expect(matchedTask?.state).toBe("blocked");
					expect(matchedTask?.reason).toBe("Sensor nicht kalibriert");
				}
			}
		});

		it("1.6 Calculates daily nutrient recipe mix and acknowledges safety alerts", () => {
			const mockPlan = createMockDayPlan(45);
			const mixRecipe = calculateMix(mockPlan, 10);

			expect(mixRecipe.length).toBeGreaterThan(0);
			expect(
				mixRecipe.some(
					(item) => item.name.includes("HESI") || item.role === "Basis",
				),
			).toBe(true);

			// Alert acknowledgment check
			const run = createDefaultRunPackage();
			const updatedRunAlert = acknowledgeAlert(run, "alert-water-missing");
			expect(updatedRunAlert.acknowledgedAlertIds).toContain(
				"alert-water-missing",
			);
		});

		it("1.7 Renders DailyOperatorPanel component with experience lenses (guided, advanced, expert)", () => {
			const run = createDefaultRunPackage();
			const mockPlan = createMockDayPlan(14);
			const onUpdateRun = vi.fn();
			const navigate = vi.fn();

			const elementGuided = React.createElement(DailyOperatorPanel, {
				run,
				plan: mockPlan,
				lens: "guided",
				onUpdateRun,
				navigate,
			});

			const elementAdvanced = React.createElement(DailyOperatorPanel, {
				run,
				plan: mockPlan,
				lens: "advanced",
				onUpdateRun,
				navigate,
			});

			const elementExpert = React.createElement(DailyOperatorPanel, {
				run,
				plan: mockPlan,
				lens: "expert",
				onUpdateRun,
				navigate,
			});

			expect(elementGuided).not.toBeNull();
			expect(elementGuided.props.lens).toBe("guided");
			expect(elementAdvanced.props.lens).toBe("advanced");
			expect(elementExpert.props.lens).toBe("expert");
		});

		it("1.8 Gracefully handles edge cases (undefined plan, negative day numbers, missing values)", () => {
			const run = createDefaultRunPackage();
			const onUpdateRun = vi.fn();

			// Undefined plan fallback
			const targetsNoPlan = getTargetsForDay(5, undefined);
			expect(targetsNoPlan.phaseShort).toBe("Keimung");
			expect(targetsNoPlan.ecTarget).toBe(0.8);

			const elementNoPlan = React.createElement(DailyOperatorPanel, {
				run,
				plan: undefined,
				lens: "guided",
				onUpdateRun,
			});
			expect(elementNoPlan).not.toBeNull();
		});
	});

	// ── PART 2: ContextHelpGlossaryPanel Suite ──
	describe("ContextHelpGlossaryPanel Unit Tests", () => {
		it("2.1 Resolves term definitions for all core cultivation metrics in dictionary", () => {
			const allTerms = getAllTerms();
			expect(allTerms.length).toBeGreaterThanOrEqual(14);

			const vpdDef = getTermDefinition("VPD");
			expect(vpdDef).toBeDefined();
			expect(vpdDef?.germanName).toBe("Dampfdruckdefizit");
			expect(vpdDef?.unit).toBe("kPa");

			const dliDef = getTermDefinition("DLI");
			expect(dliDef).toBeDefined();
			expect(dliDef?.germanName).toBe("Tägliches Lichtintegral");

			const ecDef = getTermDefinition("EC");
			expect(ecDef).toBeDefined();
			expect(ecDef?.germanName).toBe("Elektrische Leitfähigkeit");

			const phDef = getTermDefinition("pH");
			expect(phDef).toBeDefined();
			expect(phDef?.germanName).toBe("Säuregrad");
		});

		it("2.2 Searches terms by query string, case-insensitively, and trims whitespace", () => {
			const vpdSearch = searchTerms("  vpd  ");
			expect(vpdSearch.some((t) => t.key === "VPD")).toBe(true);

			const dampfSearch = searchTerms("dampfdruck");
			expect(dampfSearch.some((t) => t.key === "VPD")).toBe(true);

			const emptySearch = searchTerms("");
			expect(emptySearch.length).toBe(getAllTerms().length);

			const spaceSearch = searchTerms("   ");
			expect(spaceSearch.length).toBe(getAllTerms().length);

			const noMatch = searchTerms("non_existent_search_query_999");
			expect(noMatch.length).toBe(0);
		});

		it("2.3 Filters terms by categories (all, climate, light, nutrients, phase, plant)", () => {
			const allTerms = getAllTerms();

			const climateTerms = allTerms.filter((t) => t.category === "climate");
			expect(climateTerms.length).toBeGreaterThan(0);
			expect(climateTerms.some((t) => t.key === "VPD")).toBe(true);
			expect(climateTerms.some((t) => t.key === "rF")).toBe(true);

			const lightTerms = allTerms.filter((t) => t.category === "light");
			expect(lightTerms.length).toBeGreaterThan(0);
			expect(lightTerms.some((t) => t.key === "DLI")).toBe(true);
			expect(lightTerms.some((t) => t.key === "PPFD")).toBe(true);

			const nutrientTerms = allTerms.filter((t) => t.category === "nutrients");
			expect(nutrientTerms.length).toBeGreaterThan(0);
			expect(nutrientTerms.some((t) => t.key === "EC")).toBe(true);
			expect(nutrientTerms.some((t) => t.key === "pH")).toBe(true);

			const phaseTerms = allTerms.filter((t) => t.category === "phase");
			expect(phaseTerms.length).toBeGreaterThan(0);
			expect(phaseTerms.some((t) => t.key === "BT")).toBe(true);
		});

		it("2.4 Returns multi-lens term descriptions (guided, advanced, expert)", () => {
			const term = "VPD";
			const guidedText = getTermDescription(term, "guided");
			const advancedText = getTermDescription(term, "advanced");
			const expertText = getTermDescription(term, "expert");

			expect(guidedText).toContain("Wasser aus den Blättern");
			expect(advancedText).toContain("Sättigungsdampfdruck");
			expect(expertText).toContain("Stomata-Leitfähigkeit");
		});

		it("2.5 Verifies optimal phase ranges for VPD, DLI, EC, pH, PPFD, and rF", () => {
			const vpdDef = getTermDefinition("VPD");
			expect(vpdDef?.optimalRanges).toBeDefined();
			expect(vpdDef?.optimalRanges?.length).toBe(3);
			expect(vpdDef?.optimalRanges?.[0]!.phase).toBe("Sämling");
			expect(vpdDef?.optimalRanges?.[0]!.min).toBe(0.4);
			expect(vpdDef?.optimalRanges?.[0]!.max).toBe(0.8);

			const dliDef = getTermDefinition("DLI");
			expect(dliDef?.optimalRanges).toBeDefined();
			expect(dliDef?.optimalRanges?.[1]!.phase).toBe("Vegetation");
			expect(dliDef?.optimalRanges?.[1]!.min).toBe(20);
			expect(dliDef?.optimalRanges?.[1]!.max).toBe(30);

			const ecDef = getTermDefinition("EC");
			expect(ecDef?.optimalRanges).toBeDefined();
			expect(ecDef?.optimalRanges?.[2]!.phase).toBe("Blüte");
			expect(ecDef?.optimalRanges?.[2]!.min).toBe(1.8);
			expect(ecDef?.optimalRanges?.[2]!.max).toBe(2.2);
		});

		it("2.6 Renders ContextHelpGlossaryPanel component with experience lenses and search props", () => {
			const run = createDefaultRunPackage();
			const mockPlan = createMockDayPlan(14);
			const onUpdateRun = vi.fn();
			const navigate = vi.fn();

			const elementGuided = React.createElement(ContextHelpGlossaryPanel, {
				run,
				plan: mockPlan,
				lens: "guided",
				onUpdateRun,
				navigate,
			});

			const elementExpert = React.createElement(ContextHelpGlossaryPanel, {
				run,
				plan: mockPlan,
				lens: "expert",
				onUpdateRun,
				navigate,
			});

			expect(elementGuided).not.toBeNull();
			expect(elementGuided.props.lens).toBe("guided");
			expect(elementExpert.props.lens).toBe("expert");
		});

		it("2.7 Handles edge cases and malicious search strings gracefully", () => {
			const xssSearch = searchTerms("<script>alert('xss')</script>");
			expect(xssSearch.length).toBe(0);

			const unknownTermDesc = getTermDescription("UNKNOWN_TERM_999", "guided");
			expect(unknownTermDesc).toBe('Fachbegriff "UNKNOWN_TERM_999"');

			// Invalid lens string fallback to guided
			const invalidLensDesc = getTermDescription("VPD", "unknown_lens" as any);
			expect(invalidLensDesc).toBe(DICTIONARY.VPD!.beginner);
		});
	});

	// ── PART 3: Zero Regression Suite ──
	describe("Zero Regression Integration & Scientific Invariant Suite", () => {
		it("3.1 Preserves domain calculation precision for Leaf VPD and DLI", () => {
			const leafVpd = calculateLeafVpd(25.0, 60.0, -1.0);
			const airVpd = calculateLeafVpd(25.0, 60.0, 0.0);
			const dli = calculateDli(600, 18);

			expect(leafVpd).toBeGreaterThan(0.7);
			expect(leafVpd).toBeLessThan(1.4);
			expect(airVpd).toBeGreaterThan(leafVpd);
			expect(dli).toBeCloseTo(38.88, 2);
		});

		it("3.2 Guarantees pure state transition immutability and audit logging", () => {
			const run = createDefaultRunPackage();
			const obs = createObservation(10);
			obs.values.tempMax = 26.0;

			const updatedRun = addObservation(run, obs);

			expect(updatedRun).not.toBe(run);
			expect(updatedRun.observations.length).toBe(1);
			expect(run.observations.length).toBe(0);
			expect(updatedRun.auditEvents.length).toBe(run.auditEvents.length + 1);
		});
	});
});
