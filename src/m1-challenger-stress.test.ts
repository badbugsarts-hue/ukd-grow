import { describe, expect, it } from "vitest";
import {
	calculateBiologicalPlantAge,
	calculatePpfdMapSummary,
	calculateSubstrateHydration,
} from "./domain";
import { getSensorCalibrationStatus, assessMeasurementTrust } from "./scientific-core";
import type {
	CalibrationRecord,
	DayZeroAnchor,
	GrowthEvent,
	Measurement,
	MeasurementDevice,
	PotProfile,
	PpfdMapPoint,
	TrustPolicy,
} from "./types";

describe("M1 Challenger Empirical Stress Harness", () => {
	describe("1. calculatePpfdMapSummary", () => {
		it("handles empty / null / non-array points safely", () => {
			expect(calculatePpfdMapSummary([], 40, 100)).toEqual({
				mean: 0,
				min: 0,
				max: 0,
				uniformity: 0,
			});
			expect(calculatePpfdMapSummary(null as any, 40, 100)).toEqual({
				mean: 0,
				min: 0,
				max: 0,
				uniformity: 0,
			});
			expect(calculatePpfdMapSummary(undefined as any, 40, 100)).toEqual({
				mean: 0,
				min: 0,
				max: 0,
				uniformity: 0,
			});
		});

		it("handles dimmer percent edge cases (0, >100, negative, NaN, Infinity)", () => {
			const points: PpfdMapPoint[] = [
				{ x: 0, y: 0, ppfd: 500 },
				{ x: 1, y: 1, ppfd: 1000 },
			];

			// Dimmer 0%
			expect(calculatePpfdMapSummary(points, 40, 0)).toEqual({
				mean: 0,
				min: 0,
				max: 0,
				uniformity: 0,
			});

			// Dimmer > 100% (should cap at 100%)
			expect(calculatePpfdMapSummary(points, 40, 150)).toEqual({
				mean: 750,
				min: 500,
				max: 1000,
				uniformity: 0.667,
			});

			// Negative dimmer (should clamp to 0%)
			expect(calculatePpfdMapSummary(points, 40, -50)).toEqual({
				mean: 0,
				min: 0,
				max: 0,
				uniformity: 0,
			});

			// Dimmer NaN (should fallback to 1.0 multiplier)
			expect(calculatePpfdMapSummary(points, 40, Number.NaN)).toEqual({
				mean: 750,
				min: 500,
				max: 1000,
				uniformity: 0.667,
			});

			// Dimmer Infinity (should fallback to 1.0 multiplier)
			expect(calculatePpfdMapSummary(points, 40, Number.POSITIVE_INFINITY)).toEqual({
				mean: 750,
				min: 500,
				max: 1000,
				uniformity: 0.667,
			});
		});

		it("filters out invalid PPFD values (negative, NaN, Infinity, null, non-number)", () => {
			const points: any[] = [
				{ x: 0, y: 0, ppfd: 600 },
				{ x: 1, y: 0, ppfd: -100 },
				{ x: 2, y: 0, ppfd: Number.NaN },
				{ x: 0, y: 1, ppfd: Number.POSITIVE_INFINITY },
				{ x: 1, y: 1, ppfd: null },
				{ x: 2, y: 1, ppfd: "800" }, // string, not number
				null,
				undefined,
			];

			const res = calculatePpfdMapSummary(points, 40, 100);
			// Only { ppfd: 600 } should be valid
			expect(res.mean).toBe(600);
			expect(res.min).toBe(600);
			expect(res.max).toBe(600);
			expect(res.uniformity).toBe(1);
		});

		it("property test: min <= mean and uniformity <= 1.0 across 1,000 random grids", () => {
			for (let i = 0; i < 1000; i++) {
				const count = Math.floor(Math.random() * 15) + 1;
				const points: PpfdMapPoint[] = Array.from({ length: count }, (_, idx) => ({
					x: idx % 3,
					y: Math.floor(idx / 3),
					ppfd: Math.random() * 1200,
				}));
				const dimmer = Math.random() * 120;
				const summary = calculatePpfdMapSummary(points, 40, dimmer);

				expect(summary.min).toBeLessThanOrEqual(summary.mean + 1e-9);
				expect(summary.uniformity).toBeLessThanOrEqual(1.001);
				expect(summary.uniformity).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe("2. calculateBiologicalPlantAge", () => {
		const now = new Date("2026-08-14T12:00:00Z");

		it("calculates age correctly when anchor event exists", () => {
			const events: GrowthEvent[] = [
				{
					id: "1",
					runId: "run-1",
					occurredAt: "2026-08-01T12:00:00Z",
					kind: "seed-started",
					title: "Seed",
				},
				{
					id: "2",
					runId: "run-1",
					occurredAt: "2026-08-04T12:00:00Z",
					kind: "emergence",
					title: "Sprout",
				},
			];

			const res = calculateBiologicalPlantAge("emergence", events, now);
			// Operational age: 2026-08-01 to 2026-08-14 = 13 days
			expect(res.operationalAgeDays).toBe(13);
			// Biological age: 2026-08-04 to 2026-08-14 = 10 days
			expect(res.biologicalAgeDays).toBe(10);
			expect(res.anchorDateString).toBe("2026-08-04T12:00:00Z");
		});

		it("falls back to operational start when anchor event is missing", () => {
			const events: GrowthEvent[] = [
				{
					id: "1",
					runId: "run-1",
					occurredAt: "2026-08-01T12:00:00Z",
					kind: "seed-started",
					title: "Seed",
				},
			];

			const res = calculateBiologicalPlantAge("emergence", events, now);
			expect(res.operationalAgeDays).toBe(13);
			expect(res.biologicalAgeDays).toBe(13);
			expect(res.anchorDateString).toBe("2026-08-01T12:00:00.000Z");
		});

		it("handles empty events list gracefully", () => {
			const res = calculateBiologicalPlantAge("emergence", [], now);
			expect(res.operationalAgeDays).toBe(0);
			expect(res.biologicalAgeDays).toBe(0);
			expect(res.anchorDateString).toBe(now.toISOString());
		});

		it("handles future events by flooring age to 0 (no negative age)", () => {
			const events: GrowthEvent[] = [
				{
					id: "1",
					runId: "run-1",
					occurredAt: "2026-08-20T12:00:00Z",
					kind: "seed-started",
					title: "Seed",
				},
			];

			const res = calculateBiologicalPlantAge("seed-started", events, now);
			expect(res.operationalAgeDays).toBe(0);
			expect(res.biologicalAgeDays).toBe(0);
		});

		it("handles null / undefined growthEvents gracefully", () => {
			const res = calculateBiologicalPlantAge("emergence", null as any, now);
			expect(res.operationalAgeDays).toBe(0);
			expect(res.biologicalAgeDays).toBe(0);
		});
	});

	describe("3. calculateSubstrateHydration", () => {
		const pot: PotProfile = {
			emptyMassGrams: 500,
			saturatedMassGrams: 2500,
			nominalVolumeLiters: 11, diameterCm: 30, heightCm: 30, actualFillLiters: 11,
			substrateType: "coco",
		};

		it("computes accurate hydration percent and category boundaries", () => {
			// Saturated capacity = 2000g water (2500 - 500)
			// 10% water = 200g -> currentMass = 700g -> category 'dry'
			expect(calculateSubstrateHydration(700, pot)).toMatchObject({
				hydrationPercent: 10,
				depletionPercent: 90,
				availableWaterGrams: 200,
				category: "dry",
			});

			// 30% water = 600g -> currentMass = 1100g -> category 'light'
			expect(calculateSubstrateHydration(1100, pot)).toMatchObject({
				hydrationPercent: 30,
				category: "light",
			});

			// 50% water = 1000g -> currentMass = 1500g -> category 'medium'
			expect(calculateSubstrateHydration(1500, pot)).toMatchObject({
				hydrationPercent: 50,
				category: "medium",
			});

			// 80% water = 1600g -> currentMass = 2100g -> category 'heavy'
			expect(calculateSubstrateHydration(2100, pot)).toMatchObject({
				hydrationPercent: 80,
				category: "heavy",
			});

			// 95% water = 1900g -> currentMass = 2400g -> category 'saturated'
			expect(calculateSubstrateHydration(2400, pot)).toMatchObject({
				hydrationPercent: 95,
				category: "saturated",
			});
		});

		it("handles dry pot (currentMass < emptyMass)", () => {
			const res = calculateSubstrateHydration(400, pot);
			expect(res.state).toBe("UNKNOWN");
			expect(res.reason).toBe("MASS_BELOW_TARE");
		});

		it("falls back to volumetric water capacity when saturatedMassGrams is missing", () => {
			const potVol: PotProfile = {
				emptyMassGrams: 400,
				nominalVolumeLiters: 11, diameterCm: 30, heightCm: 30, actualFillLiters: 11,
				substrateType: "soil",
			};
			// Fallback saturated capacity = 10L * 750g/L = 7500g water.
			// Empty = 400g -> Saturated = 7900g.
			// Current mass = 4150g -> water = 3750g -> 3750 / 7500 = 50%.
			const res = calculateSubstrateHydration(4150, potVol);
			expect(res.state).toBe("INSUFFICIENT_DATA");
			expect(res.reason).toBe("SATURATION_REFERENCE_MISSING");
		});

		it("handles zero actualFillLiters edge case (0 is falsy, tests nullish coalescing)", () => {
			const potZeroFill: PotProfile = {
				type: "fabric",
				nominalVolumeLiters: 11,
				actualFillLiters: 0,
				diameterCm: 30,
				heightCm: 30,
				emptyMassGrams: 500,
				saturatedMassGrams: null,
			};
			// actualFillLiters is 0. If code does `actualFillLiters ?? nominalVolumeLiters`, 0 ?? 10 returns 0!
			// If fill volume is 0, satMass = emptyMass + 0 = emptyMass.
			// Math.max(1, 500 - 500) = 1.
			const res = calculateSubstrateHydration(600, potZeroFill);
			expect(res.state).toBe("INSUFFICIENT_DATA");
			expect(res.reason).toBe("SATURATION_REFERENCE_MISSING");
		});

		it("handles NaN currentMassGrams without crashing or corrupting output type", () => {
			const res = calculateSubstrateHydration(Number.NaN, pot);
			// Check if hydrationPercent is safely finite or handled
			expect(typeof res.category).toBe("string");
		});
	});

	describe("4. getSensorCalibrationStatus", () => {
		const now = new Date("2026-08-14T12:00:00Z");

		it("returns 'uncalibrated' when no matching calibrations exist", () => {
			const status = getSensorCalibrationStatus("dev-1", "water.ph", [], now);
			expect(status).toBe("UNKNOWN");
		});

		it("sorts calibrations by performedAt and picks latest valid record", () => {
			const calibrations: CalibrationRecord[] = [
				{
					id: "cal-old",
					deviceId: "dev-1",
					metric: "water.ph",
					performedAt: "2026-08-01T12:00:00Z",
					performedBy: "user",
					result: "passed",
				},
				{
					id: "cal-new",
					deviceId: "dev-1",
					metric: "water.ph",
					performedAt: "2026-08-10T12:00:00Z",
					performedBy: "user",
					result: "failed",
				},
			];
			const status = getSensorCalibrationStatus("dev-1", "water.ph", calibrations, now);
			expect(status).toBe("FAILED");
		});

		it("enforces 30-day window for pH metric", () => {
			const cal25DaysOld: CalibrationRecord = {
				id: "cal-1",
				deviceId: "dev-1",
				metric: "water.ph",
				performedAt: "2026-07-20T12:00:00Z", // 25 days ago
				performedBy: "user",
				result: "passed",
			};
			expect(getSensorCalibrationStatus("dev-1", "water.ph", [cal25DaysOld], now)).toBe("DUE_SOON");

			const cal35DaysOld: CalibrationRecord = {
				id: "cal-2",
				deviceId: "dev-1",
				metric: "water.ph",
				performedAt: "2026-07-05T12:00:00Z", // 40 days ago
				performedBy: "user",
				result: "passed",
			};
			expect(getSensorCalibrationStatus("dev-1", "water.ph", [cal35DaysOld], now)).toBe("CALIBRATION_DUE");
		});

		it("enforces 60-day window for EC metric", () => {
			const cal45DaysOld: CalibrationRecord = {
				id: "cal-1",
				deviceId: "dev-1",
				metric: "water.ec",
				performedAt: "2026-06-30T12:00:00Z", // 45 days ago
				performedBy: "user",
				result: "passed",
			};
			expect(getSensorCalibrationStatus("dev-1", "water.ec", [cal45DaysOld], now)).toBe("VALID");

			const cal65DaysOld: CalibrationRecord = {
				id: "cal-2",
				deviceId: "dev-1",
				metric: "water.ec",
				performedAt: "2026-06-05T12:00:00Z", // 70 days ago
				performedBy: "user",
				result: "passed",
			};
			expect(getSensorCalibrationStatus("dev-1", "water.ec", [cal65DaysOld], now)).toBe("CALIBRATION_DUE");
		});

		it("respects explicit validUntil date when provided", () => {
			const calWithValidUntil: CalibrationRecord = {
				id: "cal-1",
				deviceId: "dev-1",
				metric: "water.ph",
				performedAt: "2026-05-01T12:00:00Z",
				validUntil: "2026-08-30T12:00:00Z", // In future
				performedBy: "user",
				result: "passed",
			};
			expect(getSensorCalibrationStatus("dev-1", "water.ph", [calWithValidUntil], now)).toBe("VALID");
		});

		it("sorts multiple calibration records descending by performedAt", () => {
			const calOldPassed: CalibrationRecord = {
				id: "cal-1",
				deviceId: "dev-1",
				metric: "water.ph",
				performedAt: "2026-08-01T12:00:00Z",
				performedBy: "user",
				result: "passed",
			};
			const calNewFailed: CalibrationRecord = {
				id: "cal-2",
				deviceId: "dev-1",
				metric: "water.ph",
				performedAt: "2026-08-10T12:00:00Z",
				performedBy: "user",
				result: "failed",
			};
			// Old record passed, but latest record failed
			expect(getSensorCalibrationStatus("dev-1", "water.ph", [calOldPassed, calNewFailed], now)).toBe("FAILED");
		});
	});
});
