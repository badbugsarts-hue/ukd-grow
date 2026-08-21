import { describe, expect, it } from "vitest";
import {
	calculateBiologicalPlantAge,
	calculateDli,
	calculateDrybackRate,
	calculateLeafVpd,
	calculateMix,
	calculatePpfdMapSummary,
	calculateRunEnergySummary,
	calculateSubstrateHydration,
	excelSerialToDate,
	formatExcelDate,
	numberAt,
	textAt,
} from "./domain";
import type { DayPlan, DayZeroAnchor, GrowthEvent, IrrigationEvent, PotProfile, PpfdMapPoint } from "./types";

describe("M1 Empirical Fuzz & Invariant Stress Harness for src/domain.ts", () => {
	describe("1. calculateBiologicalPlantAge Crash Hazards & Invariant Fuzzing", () => {
		it("REPRODUCTION: crashes when growthEvents contains null or undefined elements", () => {
			const eventsWithNull = [null, undefined] as any[];
			// Calling calculateBiologicalPlantAge with events array containing null/undefined elements:
			expect(() => calculateBiologicalPlantAge("emergence", eventsWithNull)).not.toThrow();
		});

		it("REPRODUCTION: crashes when growthEvents element is missing occurredAt property", () => {
			const eventsWithMissingField = [{ kind: "emergence" }] as any[];
			expect(() => calculateBiologicalPlantAge("emergence", eventsWithMissingField)).not.toThrow();
		});

		it("Fuzzing: never throws, never returns negative ages, and always returns valid string anchor (500 runs)", () => {
			const anchors: DayZeroAnchor[] = ["seed-started", "emergence", "seed-planted", "emergence"];
			
			for (let i = 0; i < 500; i++) {
				const anchor = anchors[i % anchors.length];
				const numEvents = Math.floor(Math.random() * 8);
				const events: any[] = [];

				for (let j = 0; j < numEvents; j++) {
					const dateRand = Math.random();
					let dateStr: string;
					if (dateRand < 0.1) dateStr = "invalid-date-string";
					else if (dateRand < 0.2) dateStr = "";
					else if (dateRand < 0.3) dateStr = "2026-99-99T99:99:99Z";
					else dateStr = new Date(Date.now() + (Math.random() - 0.5) * 1e10).toISOString();

					events.push({
						id: `evt-${j}`,
						kind: anchors[Math.floor(Math.random() * anchors.length)],
						occurredAt: dateStr,
					});
				}

				if (Math.random() < 0.2) events.push(null);
				if (Math.random() < 0.2) events.push(undefined);

				const now = Math.random() < 0.1 ? new Date("invalid") : new Date();

				const res = calculateBiologicalPlantAge(anchor, events, now);

				expect(typeof res.biologicalAgeDays).toBe("number");
				expect(typeof res.operationalAgeDays).toBe("number");
				expect(typeof res.anchorDateString).toBe("string");

				if (Number.isFinite(res.biologicalAgeDays)) {
					expect(res.biologicalAgeDays).toBeGreaterThanOrEqual(0);
				}
				if (Number.isFinite(res.operationalAgeDays)) {
					expect(res.operationalAgeDays).toBeGreaterThanOrEqual(0);
				}
			}
		});
	});

	describe("2. calculateSubstrateHydration Invariant Fuzzing (500 runs)", () => {
		it("maintains percentage bounds and valid categories under extreme pot profiles", () => {
			const categories = new Set(["dry", "light", "medium", "heavy", "saturated"]);

			for (let i = 0; i < 500; i++) {
				const currentMass = (Math.random() - 0.2) * 20000;
				const pot: PotProfile = {
					emptyMassGrams: Math.random() < 0.1 ? undefined : (Math.random() - 0.1) * 2000,
					saturatedMassGrams: Math.random() < 0.1 ? undefined : (Math.random() - 0.1) * 10000,
					nominalVolumeLiters: Math.random() < 0.1 ? 0 : Math.random() * 50,
					actualFillLiters: Math.random() < 0.1 ? 0 : Math.random() * 50,
					type: "fabric",
				};

				const res = calculateSubstrateHydration(currentMass, pot);

				if (res.state === "VALID") {
					expect(categories.has(res.category)).toBe(true);
					expect(Number.isFinite(res.hydrationPercent)).toBe(true);
					expect(res.hydrationPercent).toBeGreaterThanOrEqual(0);
					expect(res.hydrationPercent).toBeLessThanOrEqual(100);
					expect(res.depletionPercent).toBe(100 - res.hydrationPercent!);
				} else {
					expect(res.hydrationPercent).toBeNull();
					expect(res.category).toBe("unknown");
				}
			}
		});
	});

	describe("3. calculatePpfdMapSummary Invariant Fuzzing (500 runs)", () => {
		it("maintains min <= mean <= max and 0 <= uniformity <= 1", () => {
			for (let i = 0; i < 500; i++) {
				const pointCount = Math.floor(Math.random() * 20);
				const points: any[] = [];
				for (let j = 0; j < pointCount; j++) {
					const r = Math.random();
					if (r < 0.1) points.push(null);
					else if (r < 0.2) points.push({ ppfd: "invalid" });
					else if (r < 0.3) points.push({ ppfd: -100 });
					else if (r < 0.4) points.push({ ppfd: Number.NaN });
					else if (r < 0.5) points.push({ ppfd: Number.POSITIVE_INFINITY });
					else points.push({ ppfd: Math.random() * 2000 });
				}

				const dimmer = (Math.random() - 0.5) * 300;
				const res = calculatePpfdMapSummary(points, 40, dimmer);

				expect(Number.isFinite(res.mean)).toBe(true);
				expect(Number.isFinite(res.min)).toBe(true);
				expect(Number.isFinite(res.max)).toBe(true);
				expect(Number.isFinite(res.uniformity)).toBe(true);

				if (res.mean > 0) {
					expect(res.min).toBeLessThanOrEqual(res.mean + 0.1);
					expect(res.mean).toBeLessThanOrEqual(res.max + 0.1);
					expect(res.uniformity).toBeGreaterThanOrEqual(0);
					expect(res.uniformity).toBeLessThanOrEqual(1.001);
				}
			}
		});
	});
});
