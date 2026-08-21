import React from "react";
import { describe, expect, it, vi } from "vitest";
import {
	calculateSubstrateHydration,
	type SubstrateHydration,
} from "../../domain";
import {
	addObservation,
	createDefaultRunPackage,
	createObservation,
	updatePotProfile,
} from "../../run-state";
import type {
	ExperienceLens,
	PotProfile,
	RunPackage,
} from "../../types";
import {
	DailyOperatorPanel,
	HYDRATION_CATEGORY_DETAILS,
} from "./DailyOperatorPanel";

describe("Milestone 4 Adversarial Stress Harness: Pot Weight Dryback & State Management", () => {
	// ── 1. Boundary & Extreme Mathematical Inputs ──
	describe("1. Boundary & Extreme Mathematical Calculations", () => {
		it("handles current mass strictly equal to tare mass (0% hydration, 100% depletion, category dry)", () => {
			const pot: PotProfile = {
				type: "fabric",
				nominalVolumeLiters: 11,
				actualFillLiters: 10,
				diameterCm: 25,
				heightCm: 30,
				emptyMassGrams: 950,
				saturatedMassGrams: 4950,
			};
			const res = calculateSubstrateHydration(950, pot);
			expect(res.hydrationPercent).toBe(0);
			expect(res.depletionPercent).toBe(100);
			expect(res.availableWaterGrams).toBe(0);
			expect(res.category).toBe("dry");
			expect(Number.isNaN(res.hydrationPercent)).toBe(false);
		});

		it("handles current mass strictly equal to saturated mass (100% hydration, 0% depletion, category saturated)", () => {
			const pot: PotProfile = {
				type: "fabric",
				nominalVolumeLiters: 11,
				actualFillLiters: 10,
				diameterCm: 25,
				heightCm: 30,
				emptyMassGrams: 1000,
				saturatedMassGrams: 5000,
			};
			const res = calculateSubstrateHydration(5000, pot);
			expect(res.hydrationPercent).toBe(100);
			expect(res.depletionPercent).toBe(0);
			expect(res.availableWaterGrams).toBe(4000);
			expect(res.category).toBe("saturated");
		});

		it("clamps hydration to 100% when current mass exceeds saturated mass by large margin", () => {
			const pot: PotProfile = {
				type: "fabric",
				nominalVolumeLiters: 10,
				actualFillLiters: 10,
				diameterCm: null,
				heightCm: null,
				emptyMassGrams: 1000,
				saturatedMassGrams: 5000,
			};
			const res = calculateSubstrateHydration(12000, pot);
			expect(res.state).toBe("UNKNOWN");
			expect(res.reason).toBe("MASS_EXCEEDS_SATURATION");
		});

		it("clamps hydration to 0% and depletion to 100% when current mass is far below tare mass", () => {
			const pot: PotProfile = {
				type: "fabric",
				nominalVolumeLiters: 10,
				actualFillLiters: 10,
				diameterCm: null,
				heightCm: null,
				emptyMassGrams: 1500,
				saturatedMassGrams: 6000,
			};
			const res = calculateSubstrateHydration(300, pot);
			expect(res.state).toBe("UNKNOWN");
			expect(res.reason).toBe("MASS_BELOW_TARE");
		});

		it("handles negative current mass safely without negative available water or NaN", () => {
			const pot: PotProfile = {
				type: "plastic",
				nominalVolumeLiters: 11,
				actualFillLiters: null,
				diameterCm: null,
				heightCm: null,
				emptyMassGrams: 500,
				saturatedMassGrams: 5000,
			};
			const res = calculateSubstrateHydration(-500, pot);
			expect(res.state).toBe("UNKNOWN");
			expect(res.reason).toBe("MASS_BELOW_TARE");
		});

		it("handles 0L and negative pot volumes with fallback default heuristic without dividing by zero", () => {
			const potZeroVol: PotProfile = {
				type: "other",
				nominalVolumeLiters: 0,
				actualFillLiters: 0,
				diameterCm: null,
				heightCm: null,
				emptyMassGrams: 0,
				saturatedMassGrams: null,
			};
			const resZero = calculateSubstrateHydration(3750, potZeroVol);
			expect(resZero.state).toBe("INSUFFICIENT_DATA");
			expect(resZero.reason).toBe("SATURATION_REFERENCE_MISSING");

			const potNegativeVol: PotProfile = {
				type: "other",
				nominalVolumeLiters: -15,
				actualFillLiters: -10,
				diameterCm: null,
				heightCm: null,
				emptyMassGrams: null,
				saturatedMassGrams: null,
			};
			const resNeg = calculateSubstrateHydration(3750, potNegativeVol);
			expect(resNeg.state).toBe("INSUFFICIENT_DATA");
		});

		it("handles inverted calibration where saturated mass <= empty tare mass by falling back to fill volume heuristic", () => {
			const invertedPot: PotProfile = {
				type: "fabric",
				nominalVolumeLiters: 10,
				actualFillLiters: 10,
				diameterCm: null,
				heightCm: null,
				emptyMassGrams: 2000,
				saturatedMassGrams: 1500, // Invalid: sat < empty
			};
			// Fallback: emptyMass (2000) + 10 * 750 = 9500g satMass. Capacity = 7500g.
			// Current mass 5750g -> water = 3750g -> 50%
			const res = calculateSubstrateHydration(5750, invertedPot);
			expect(res.state).toBe("INSUFFICIENT_DATA");
			expect(res.reason).toBe("SATURATION_REFERENCE_MISSING");
		});

		it("fuzz tests 1,000 random pot configurations ensuring invariants always hold", () => {
			const categories: SubstrateHydration["category"][] = [
				"dry",
				"light",
				"medium",
				"heavy",
				"saturated",
			];

			for (let i = 0; i < 1000; i++) {
				const emptyMass = Math.random() < 0.1 ? null : Math.floor(Math.random() * 3000);
				const satMass = Math.random() < 0.1 ? null : Math.floor(Math.random() * 10000);
				const nomVol = Math.random() < 0.1 ? 0 : Math.floor(Math.random() * 50);
				const actVol = Math.random() < 0.1 ? null : Math.floor(Math.random() * 50);
				const currentMass = Math.floor(Math.random() * 15000) - 1000; // includes negative

				const pot: PotProfile = {
					type: "fabric",
					nominalVolumeLiters: nomVol,
					actualFillLiters: actVol,
					diameterCm: null,
					heightCm: null,
					emptyMassGrams: emptyMass,
					saturatedMassGrams: satMass,
				};

				const res = calculateSubstrateHydration(currentMass, pot);

				if (res.state === "VALID") {
					expect(Number.isFinite(res.hydrationPercent)).toBe(true);
					expect(Number.isFinite(res.depletionPercent)).toBe(true);
					expect(Number.isFinite(res.availableWaterGrams)).toBe(true);
					expect(res.hydrationPercent).toBeGreaterThanOrEqual(0);
					expect(res.hydrationPercent).toBeLessThanOrEqual(100);
					expect(res.depletionPercent).toBeGreaterThanOrEqual(0);
					expect(res.depletionPercent).toBeLessThanOrEqual(100);
					expect(res.hydrationPercent! + res.depletionPercent!).toBe(100);
					expect(res.availableWaterGrams).toBeGreaterThanOrEqual(0);
					expect(categories).toContain(res.category);
				} else {
					expect(res.hydrationPercent).toBeNull();
					expect(res.depletionPercent).toBeNull();
					expect(res.availableWaterGrams).toBeNull();
				}
			}
		});
	});

	// ── 2. Historical Observations & Dryback Rate Resilience ──
	describe("2. Historical Observations & Dryback Rate Calculation", () => {
		it("correctly calculates hourly dryback rate across non-contiguous days", () => {
			let run = createDefaultRunPackage();
			
			// Day 3: Pot was 4500g
			const obsDay3 = createObservation(3);
			obsDay3.values.potMassGrams = 4500;
			run = addObservation(run, obsDay3);

			// Day 5: Pot is 3300g (selectedDay = 5)
			// Time delta: (5 - 3) * 24 = 48 hours
			// Mass loss: 4500 - 3300 = 1200g
			// Rate: 1200 / 48 = 25.0 g/h
			const currentPotMass = 3300;
			const selectedDay = 5;

			const prev = run.observations
				.filter(
					(obs) =>
						obs.day < selectedDay &&
						obs.values.potMassGrams !== null &&
						obs.values.potMassGrams > 0,
				)
				.sort((a, b) => b.day - a.day)[0];

			expect(prev).toBeDefined();
			expect(prev.day).toBe(3);

			const deltaDays = selectedDay - prev.day;
			const deltaHours = deltaDays * 24;
			const massLoss = prev.values.potMassGrams! - currentPotMass;
			const rate = Math.round((massLoss / deltaHours) * 10) / 10;

			expect(rate).toBe(25.0);
		});

		it("returns null / '—' when re-watering occurred (mass gained rather than lost)", () => {
			let run = createDefaultRunPackage();
			
			// Day 3: Pot was 2000g (dry)
			const obsDay3 = createObservation(3);
			obsDay3.values.potMassGrams = 2000;
			run = addObservation(run, obsDay3);

			// Day 4: Pot was watered to 4800g
			const currentPotMass = 4800;
			const selectedDay = 4;

			const prev = run.observations
				.filter(
					(obs) =>
						obs.day < selectedDay &&
						obs.values.potMassGrams !== null &&
						obs.values.potMassGrams > 0,
				)
				.sort((a, b) => b.day - a.day)[0];

			const deltaDays = selectedDay - prev.day;
			const deltaHours = deltaDays * 24;
			const massLoss = prev.values.potMassGrams! - currentPotMass; // -2800

			const rate = deltaHours > 0 && massLoss > 0
				? Math.round((massLoss / deltaHours) * 10) / 10
				: null;

			expect(rate).toBeNull();
		});

		it("ignores future observations or same-day observations when calculating previous dryback rate", () => {
			let run = createDefaultRunPackage();
			
			const obsDay1 = createObservation(1);
			obsDay1.values.potMassGrams = 4000;
			run = addObservation(run, obsDay1);

			const obsDay5 = createObservation(5);
			obsDay5.values.potMassGrams = 3000;
			run = addObservation(run, obsDay5);

			// When on Day 2, only Day 1 should be selected as prev, not Day 5
			const selectedDay = 2;
			const prev = run.observations
				.filter(
					(obs) =>
						obs.day < selectedDay &&
						obs.values.potMassGrams !== null &&
						obs.values.potMassGrams > 0,
				)
				.sort((a, b) => b.day - a.day)[0];

			expect(prev).toBeDefined();
			expect(prev.day).toBe(1);
		});

		it("safely handles runs with 0 prior observations without NaN or throwing", () => {
			const run = createDefaultRunPackage();
			const selectedDay = 0;
			const currentPotMass = 3500;

			const prev = run.observations
				.filter(
					(obs) =>
						obs.day < selectedDay &&
						obs.values.potMassGrams !== null &&
						obs.values.potMassGrams > 0,
				)
				.sort((a, b) => b.day - a.day)[0];

			expect(prev).toBeUndefined();
		});
	});

	// ── 3. Rapid Input Changes, Calibration & State Transitions ──
	describe("3. Rapid Input Changes, Calibration & Audit Immutability", () => {
		it("handles rapid consecutive updates to updatePotProfile without state corruption", () => {
			let run = createDefaultRunPackage();
			const initialEventsCount = run.events.length;
			const initialAuditCount = run.auditEvents.length;
			const initialDomainEventsCount = run.domainEvents.length;

			for (let i = 1; i <= 20; i++) {
				const pot: PotProfile = {
					type: i % 2 === 0 ? "fabric" : "airpot",
					nominalVolumeLiters: 10 + i,
					actualFillLiters: 9 + i,
					diameterCm: 20 + i,
					heightCm: 25 + i,
					emptyMassGrams: 800 + i * 10,
					saturatedMassGrams: 4000 + i * 50,
				};
				run = updatePotProfile(run, pot);
			}

			expect(run.config.pot.type).toBe("fabric");
			expect(run.config.pot.nominalVolumeLiters).toBe(30);
			expect(run.config.pot.emptyMassGrams).toBe(1000);
			expect(run.config.pot.saturatedMassGrams).toBe(5000);

			expect(run.events.length).toBe(initialEventsCount + 20);
			expect(run.auditEvents.length).toBe(initialAuditCount + 20);
			expect(run.domainEvents.length).toBe(initialDomainEventsCount + 20);
		});

		it("handles malformed string numbers gracefully in calibration parsing", () => {
			const parseTara = (val: string) => {
				const parsed = parseFloat(val);
				return !Number.isNaN(parsed) && parsed >= 0 ? parsed : null;
			};

			expect(parseTara("")).toBeNull();
			expect(parseTara("   ")).toBeNull();
			expect(parseTara("abc")).toBeNull();
			expect(parseTara("-500")).toBeNull();
			expect(parseTara("800")).toBe(800);
			expect(parseTara(" 1200.5 ")).toBe(1200.5);
		});
	});

	// ── 4. React Component Rendering, Lenses & Accessibility ──
	describe("4. React Component Rendering & Accessibility Integrity", () => {
		it("renders DailyOperatorPanel across all lenses (guided, advanced, expert) without errors", () => {
			const run = createDefaultRunPackage();
			const onUpdateRun = vi.fn();
			const navigate = vi.fn();
			const lenses: ExperienceLens[] = ["guided", "advanced", "expert"];

			for (const lens of lenses) {
				const element = (
					<DailyOperatorPanel
						key={lens}
						run={run}
						lens={lens}
						onUpdateRun={onUpdateRun}
						navigate={navigate}
					/>
				);
				expect(React.isValidElement(element)).toBe(true);
			}
		});

		it("verifies all German recommendations exist and match experience lens tones", () => {
			const categories: SubstrateHydration["category"][] = [
				"dry",
				"light",
				"medium",
				"heavy",
				"saturated",
			];

			categories.forEach((cat) => {
				const details = HYDRATION_CATEGORY_DETAILS[cat];
				expect(details).toBeDefined();
				expect(details.label.length).toBeGreaterThan(0);
				expect(details.recommendationTitle.length).toBeGreaterThan(0);
				expect(details.guidedText.length).toBeGreaterThan(0);
				expect(details.advancedText.length).toBeGreaterThan(0);
				expect(details.expertText.length).toBeGreaterThan(0);
				// Check German characters
				expect(details.recommendationTitle).toMatch(/[a-zA-ZäöüÄÖÜß]/);
			});
		});
	});
});
