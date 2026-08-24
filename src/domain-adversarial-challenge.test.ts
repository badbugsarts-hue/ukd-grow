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
  getDailySheet,
  getDayPlan,
  numberAt,
  textAt,
} from "./domain";
import type { DayZeroAnchor, GrowthEvent, PotProfile, Workbook } from "./types";

describe("Adversarial Stress Test Suite: src/domain.ts", () => {
  describe("formatExcelDate Edge Cases & Crash Hazards", () => {
    it("should handle valid numeric Excel serial numbers", () => {
      // Excel serial 45505 -> 2024-08-01 (approx)
      const formatted = formatExcelDate(45505);
      expect(typeof formatted).toBe("string");
      expect(formatted).not.toBe("—");
    });

    it("should handle null and undefined safely", () => {
      expect(formatExcelDate(null)).toBe("—");
      expect(formatExcelDate(undefined)).toBe("—");
    });

    it("should handle valid ISO date strings", () => {
      const formatted = formatExcelDate("2026-08-14T00:00:00.000Z");
      expect(formatted).toBe("14.08.2026");
    });

    it("CHALLENGE: formatExcelDate with NaN, Infinity, -Infinity", () => {
      expect(() => formatExcelDate(Number.NaN)).toThrow();
      expect(() => formatExcelDate(Number.POSITIVE_INFINITY)).toThrow();
      expect(() => formatExcelDate(Number.NEGATIVE_INFINITY)).toThrow();
    });

    it("CHALLENGE: formatExcelDate with malformed ISO strings matching regex", () => {
      // Matches /^\d{4}-\d{2}-\d{2}T/ but is invalid date
      expect(() => formatExcelDate("2026-99-99T99:99:99.000Z")).toThrow();
    });
  });

  describe("calculateBiologicalPlantAge Edge Cases & Invalid Inputs", () => {
    it("should handle empty growthEvents array", () => {
      const result = calculateBiologicalPlantAge("emergence", []);
      expect(result.biologicalAgeDays).toBe(0);
      expect(result.operationalAgeDays).toBe(0);
      expect(typeof result.anchorDateString).toBe("string");
    });

    it("CHALLENGE: invalid Date object passed for 'now'", () => {
      const invalidNow = new Date("invalid-date-string");
      const events: GrowthEvent[] = [
        {
          id: "e1",
          plantId: "p1",
          kind: "emergence",
          occurredAt: "2026-08-01T00:00:00.000Z",
          day: 1,
          observedBy: "user",
          confidence: "confirmed",
          notes: "",
          photoIds: [],
        },
      ];
      const result = calculateBiologicalPlantAge(
        "emergence",
        events,
        invalidNow,
      );
      expect(Number.isNaN(result.biologicalAgeDays)).toBe(true);
      expect(Number.isNaN(result.operationalAgeDays)).toBe(true);
    });

    it("CHALLENGE: growthEvents containing invalid date strings", () => {
      const events: GrowthEvent[] = [
        {
          id: "e1",
          plantId: "p1",
          kind: "emergence",
          occurredAt: "invalid-iso-date",
          day: 1,
          observedBy: "user",
          confidence: "confirmed",
          notes: "",
          photoIds: [],
        },
      ];
      const result = calculateBiologicalPlantAge(
        "emergence",
        events,
        new Date("2026-08-14T00:00:00.000Z"),
      );
      expect(result.biologicalAgeDays).toBe(0);
      expect(result.operationalAgeDays).toBe(0);
      expect(result.anchorDateString).toBe("invalid-iso-date");
    });

    it("CHALLENGE: growthEvents with null or non-array inputs", () => {
      // @ts-expect-error testing runtime robustness
      const result = calculateBiologicalPlantAge("emergence", null);
      expect(result.biologicalAgeDays).toBe(0);
      expect(result.operationalAgeDays).toBe(0);
    });
  });

  describe("calculateSubstrateHydration Edge Cases & Invalid Inputs", () => {
    const normalPot: PotProfile = {
      type: "fabric",
      nominalVolumeLiters: 10,
      actualFillLiters: 10,
      diameterCm: 25,
      heightCm: 25,
      emptyMassGrams: 500,
      saturatedMassGrams: 8000,
    };

    it("should calculate correct hydration for normal inputs", () => {
      // (4250 - 500) / (8000 - 500) = 3750 / 7500 = 50%
      const result = calculateSubstrateHydration(4250, normalPot);
      expect(result.hydrationPercent).toBe(50);
      expect(result.depletionPercent).toBe(50);
      expect(result.availableWaterGrams).toBe(3750);
      expect(result.category).toBe("medium");
    });

    it("CHALLENGE: currentMassGrams is NaN", () => {
      const result = calculateSubstrateHydration(Number.NaN, normalPot);
      expect(result.state).toBe("UNKNOWN");
      expect(result.reason).toBe("INVALID_CURRENT_MASS");
    });

    it("CHALLENGE: actualFillLiters and nominalVolumeLiters are 0", () => {
      const potWithZeroVol: PotProfile = {
        ...normalPot,
        nominalVolumeLiters: 0,
        actualFillLiters: 0,
        saturatedMassGrams: null,
      };
      const result = calculateSubstrateHydration(2000, potWithZeroVol);
      // 0 volume should fall back to 10L default
      expect(result.state).toBe("INSUFFICIENT_DATA");
      expect(result.reason).toBe("SATURATION_REFERENCE_MISSING");
    });

    it("CHALLENGE: emptyMassGrams is greater than currentMassGrams", () => {
      const result = calculateSubstrateHydration(300, normalPot); // empty is 500
      expect(result.state).toBe("UNKNOWN");
      expect(result.reason).toBe("MASS_BELOW_TARE");
    });
  });

  describe("calculatePpfdMapSummary Extreme Inputs", () => {
    it("should handle empty points array", () => {
      const summary = calculatePpfdMapSummary([], 30, 100);
      expect(summary).toEqual({ mean: 0, min: 0, max: 0, uniformity: 0 });
    });

    it("should handle non-array points input", () => {
      // @ts-expect-error testing runtime robustness
      const summary = calculatePpfdMapSummary(null, 30, 100);
      expect(summary).toEqual({ mean: 0, min: 0, max: 0, uniformity: 0 });
    });

    it("should handle dimmerPercent outside 0-100 range", () => {
      const points = [
        { position: "C" as const, ppfd: 500 },
        { position: "N" as const, ppfd: 400 },
      ];
      const summaryOver = calculatePpfdMapSummary(points, 30, 150); // should clamp dimmer to 100%
      expect(summaryOver.mean).toBe(450);

      const summaryUnder = calculatePpfdMapSummary(points, 30, -50); // should clamp dimmer to 0%
      expect(summaryUnder.mean).toBe(0);
    });

    it("should filter out NaN or negative PPFD points", () => {
      const points = [
        { position: "C" as const, ppfd: 600 },
        // @ts-expect-error testing runtime robustness
        { position: "N" as const, ppfd: Number.NaN },
        { position: "S" as const, ppfd: -100 },
      ];
      const summary = calculatePpfdMapSummary(points, 30, 100);
      expect(summary.mean).toBe(600);
      expect(summary.min).toBe(600);
      expect(summary.max).toBe(600);
      expect(summary.uniformity).toBe(1);
    });
  });

  describe("calculateDrybackRate Edge Cases", () => {
    it("should handle empty events array", () => {
      const result = calculateDrybackRate([]);
      expect(result).toEqual({ avgDrybackGramsPerHour: null, trend: "stable" });
    });

    it("CHALLENGE: events with timeSinceLastIrrigationMin <= 0 or null", () => {
      const events = [
        {
          id: "i1",
          runId: "r1",
          plantId: "p1",
          day: 1,
          occurredAt: "2026-08-01T10:00:00Z",
          potMassBeforeGrams: 3000,
          potMassAfterGrams: 4500,
          timeSinceLastIrrigationMin: 0,
          waterAppliedLiters: 1.5,
          drainVolumeLiters: null,
          drainPercent: null,
          drainPh: null,
          drainEc: null,
          rootZoneMoisture: null,
          mixBatchId: null,
          notes: "",
        },
      ];
      const result = calculateDrybackRate(events);
      expect(result).toEqual({ avgDrybackGramsPerHour: null, trend: "stable" });
    });
  });

  describe("calculateLeafVpd Extremes", () => {
    it("should calculate valid VPD under normal greenhouse conditions", () => {
      const vpd = calculateLeafVpd(25, 60, -2); // 25C air, 60% RH, -2C leaf delta (23C leaf)
      expect(vpd).toBeGreaterThan(0.5);
      expect(vpd).toBeLessThan(1.5);
    });

    it("CHALLENGE: airTempC at singular point -237.3 (denominator zero in saturation formula)", () => {
      const vpd = calculateLeafVpd(-237.3, 50, 0);
      expect(Number.isFinite(vpd)).toBe(true);
    });
  });

  describe("calculateRunEnergySummary Edge Cases", () => {
    it("should return null gramsPerKwh if totalKwh is 0", () => {
      const summary = calculateRunEnergySummary([], 0.35, 500);
      expect(summary.totalKwh).toBe(0);
      expect(summary.gramsPerKwh).toBeNull();
    });

    it("should calculate cost and gramsPerKwh accurately", () => {
      const readings = [
        {
          id: "e1",
          category: "lighting" as const,
          equipmentId: null,
          day: 1,
          kwhEstimate: 100,
          hoursPerDay: 18,
          powerW: 300,
          source: "rated-estimate" as const,
          notes: "",
        },
      ];
      const summary = calculateRunEnergySummary(readings, 0.4, 200);
      expect(summary.totalKwh).toBe(100);
      expect(summary.lightingKwh).toBe(100);
      expect(summary.totalCost).toBe(40);
      expect(summary.gramsPerKwh).toBe(2);
    });
  });
});
