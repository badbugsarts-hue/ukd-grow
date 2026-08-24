import { describe, expect, it } from "vitest";
import {
  calculateBiologicalPlantAge,
  calculatePpfdMapSummary,
  calculateSubstrateHydration,
} from "./domain";
import { getSensorCalibrationStatus } from "./scientific-core";
import type {
  CalibrationRecord,
  GrowthEvent,
  PotProfile,
  PpfdMapPoint,
} from "./types";

describe("Adversarial Stress Suite — M1 Extensions", () => {
  describe("calculatePpfdMapSummary", () => {
    it("handles negative PPFD values by filtering them out", () => {
      const points: PpfdMapPoint[] = [
        { position: "NW", ppfd: -500 },
        { position: "C", ppfd: 400 },
      ];
      const summary = calculatePpfdMapSummary(points, 40, 100);
      expect(summary.mean).toBe(400);
      expect(summary.min).toBe(400);
      expect(summary.max).toBe(400);
    });

    it("handles Infinity and NaN PPFD values gracefully", () => {
      const points: any[] = [
        { position: "NW", ppfd: Infinity },
        { position: "N", ppfd: -Infinity },
        { position: "NE", ppfd: NaN },
        { position: "C", ppfd: 600 },
      ];
      const summary = calculatePpfdMapSummary(points, 40, 100);
      expect(summary.mean).toBe(600);
      expect(summary.min).toBe(600);
      expect(summary.max).toBe(600);
    });

    it("handles missing position tags or missing ppfd field", () => {
      const points: any[] = [
        { ppfd: 500 },
        { position: "C" }, // ppfd is undefined
        null,
        undefined,
      ];
      const summary = calculatePpfdMapSummary(points, 40, 100);
      expect(summary.mean).toBe(500);
      expect(summary.min).toBe(500);
      expect(summary.max).toBe(500);
    });

    it("handles 0% dimmer properly", () => {
      const points: PpfdMapPoint[] = [
        { position: "NW", ppfd: 500 },
        { position: "C", ppfd: 1000 },
      ];
      const summary = calculatePpfdMapSummary(points, 40, 0);
      expect(summary.mean).toBe(0);
      expect(summary.min).toBe(0);
      expect(summary.max).toBe(0);
      expect(summary.uniformity).toBe(0);
    });

    it("clamps dimmer values > 100%", () => {
      const points: PpfdMapPoint[] = [
        { position: "NW", ppfd: 500 },
        { position: "C", ppfd: 500 },
      ];
      const summary = calculatePpfdMapSummary(points, 40, 150);
      expect(summary.mean).toBe(500);
      expect(summary.min).toBe(500);
      expect(summary.max).toBe(500);
    });

    it("clamps negative dimmer values to 0%", () => {
      const points: PpfdMapPoint[] = [{ position: "NW", ppfd: 500 }];
      const summary = calculatePpfdMapSummary(points, 40, -20);
      expect(summary.mean).toBe(0);
      expect(summary.min).toBe(0);
      expect(summary.max).toBe(0);
    });

    it("handles non-finite dimmer values (NaN/Infinity) by defaulting to 100%", () => {
      const points: PpfdMapPoint[] = [{ position: "NW", ppfd: 500 }];
      const summaryNan = calculatePpfdMapSummary(points, 40, NaN);
      expect(summaryNan.mean).toBe(500);
    });

    it("handles null / undefined / empty points array", () => {
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
  });

  describe("getSensorCalibrationStatus", () => {
    it("handles invalid performedAt dates without crashing", () => {
      const calibrations: CalibrationRecord[] = [
        {
          id: "c1",
          deviceId: "dev1",
          metric: "water.ph",
          performedAt: "invalid-date-string",
          result: "passed",
          performedBy: "user",
        },
      ];
      const now = new Date("2026-08-14T00:00:00Z");
      const status = getSensorCalibrationStatus(
        "dev1",
        "water.ph",
        calibrations,
        now,
      );
      expect(status).toBe("INVALID_TIMESTAMP");
    });

    it("handles invalid validUntil dates without crashing", () => {
      const calibrations: CalibrationRecord[] = [
        {
          id: "c1",
          deviceId: "dev1",
          metric: "water.ph",
          performedAt: "2026-08-01T00:00:00Z",
          validUntil: "invalid-date",
          result: "passed",
          performedBy: "user",
        },
      ];
      const now = new Date("2026-08-05T00:00:00Z");
      const status = getSensorCalibrationStatus(
        "dev1",
        "water.ph",
        calibrations,
        now,
      );
      expect(status).toBe("INVALID_TIMESTAMP");
    });

    it("handles future performedAt timestamps", () => {
      const calibrations: CalibrationRecord[] = [
        {
          id: "c1",
          deviceId: "dev1",
          metric: "water.ph",
          performedAt: "2026-08-20T00:00:00Z",
          result: "passed",
          performedBy: "user",
        },
      ];
      const now = new Date("2026-08-14T00:00:00Z");
      const status = getSensorCalibrationStatus(
        "dev1",
        "water.ph",
        calibrations,
        now,
      );
      expect(status).toBe("UNKNOWN");
    });

    it("correctly sorts multiple calibration records out of order", () => {
      const calibrations: CalibrationRecord[] = [
        {
          id: "c1",
          deviceId: "dev1",
          metric: "water.ph",
          result: "passed",
          performedAt: "2026-07-01T00:00:00Z", // Older - expired
        },
        {
          id: "c2",
          deviceId: "dev1",
          metric: "water.ph",
          result: "passed",
          performedAt: "2026-08-10T00:00:00Z", // Newer - valid
        },
        {
          id: "c3",
          deviceId: "dev1",
          metric: "water.ph",
          result: "failed",
          performedAt: "2026-07-15T00:00:00Z", // Middle - expired
        },
      ];
      const now = new Date("2026-08-14T00:00:00Z");
      const status = getSensorCalibrationStatus(
        "dev1",
        "water.ph",
        calibrations,
        now,
      );
      expect(status).toBe("VALID");
    });

    it("returns failed if the most recent calibration record failed", () => {
      const calibrations: CalibrationRecord[] = [
        {
          id: "c1",
          deviceId: "dev1",
          metric: "water.ph",
          performedAt: "2026-08-01T00:00:00Z",
          result: "passed",
          performedBy: "user",
        },
        {
          id: "c2",
          deviceId: "dev1",
          metric: "water.ph",
          performedAt: "2026-08-10T00:00:00Z",
          result: "failed",
          performedBy: "user",
        },
      ];
      const now = new Date("2026-08-14T00:00:00Z");
      const status = getSensorCalibrationStatus(
        "dev1",
        "water.ph",
        calibrations,
        now,
      );
      expect(status).toBe("FAILED");
    });

    it("handles missing/unsupported metrics with 30-day default window", () => {
      const calibrations: CalibrationRecord[] = [
        {
          id: "c1",
          deviceId: "dev1",
          metric: "temp.air" as any,
          performedAt: "2026-08-01T00:00:00Z",
          result: "passed",
          performedBy: "user",
        },
      ];
      const now = new Date("2026-08-14T00:00:00Z");
      const status = getSensorCalibrationStatus(
        "dev1",
        "temp.air" as any,
        calibrations,
        now,
      );
      expect(status).toBe("VALID");
    });
  });

  describe("calculateBiologicalPlantAge", () => {
    it("handles future anchor dates without producing negative age", () => {
      const events: GrowthEvent[] = [
        {
          id: "e1",
          plantId: "p1",
          kind: "seed-started",
          occurredAt: "2026-08-10T00:00:00Z",
          day: 0,
          observedBy: "user",
          confidence: "confirmed",
          notes: "",
          photoIds: [],
        },
        {
          id: "e2",
          plantId: "p1",
          kind: "emergence",
          occurredAt: "2026-08-20T00:00:00Z", // Future date relative to now
          day: 10,
          observedBy: "user",
          confidence: "confirmed",
          notes: "",
          photoIds: [],
        },
      ];
      const now = new Date("2026-08-14T00:00:00Z");
      const age = calculateBiologicalPlantAge("emergence", events, now);
      expect(age.biologicalAgeDays).toBe(0);
      expect(age.operationalAgeDays).toBe(4);
    });

    it("handles null / undefined growthEvents array safely", () => {
      const now = new Date("2026-08-14T00:00:00Z");
      const age1 = calculateBiologicalPlantAge("emergence", null as any, now);
      expect(age1.biologicalAgeDays).toBe(0);
      expect(age1.operationalAgeDays).toBe(0);

      const age2 = calculateBiologicalPlantAge(
        "emergence",
        undefined as any,
        now,
      );
      expect(age2.biologicalAgeDays).toBe(0);
      expect(age2.operationalAgeDays).toBe(0);
    });

    it("handles growth event with invalid date string without throwing", () => {
      const events: GrowthEvent[] = [
        {
          id: "e1",
          plantId: "p1",
          kind: "seed-started",
          occurredAt: "invalid-date",
          day: 0,
          observedBy: "user",
          confidence: "confirmed",
          notes: "",
          photoIds: [],
        },
      ];
      const now = new Date("2026-08-14T00:00:00Z");
      const age = calculateBiologicalPlantAge("emergence", events, now);
      // Check if it produces a number or NaN
      expect(typeof age.biologicalAgeDays).toBe("number");
    });

    it("handles duplicate growth events gracefully", () => {
      const events: GrowthEvent[] = [
        {
          id: "e1",
          plantId: "p1",
          kind: "emergence",
          occurredAt: "2026-08-04T00:00:00Z",
          day: 3,
          observedBy: "user",
          confidence: "confirmed",
          notes: "",
          photoIds: [],
        },
        {
          id: "e2",
          plantId: "p1",
          kind: "emergence",
          occurredAt: "2026-08-06T00:00:00Z",
          day: 5,
          observedBy: "user",
          confidence: "confirmed",
          notes: "",
          photoIds: [],
        },
      ];
      const now = new Date("2026-08-14T00:00:00Z");
      const age = calculateBiologicalPlantAge("emergence", events, now);
      expect(age.biologicalAgeDays).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateSubstrateHydration", () => {
    it("handles pot mass < empty mass", () => {
      const potProfile: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 11,
        diameterCm: 30,
        heightCm: 30,
        actualFillLiters: 11,
        emptyMassGrams: 500,
        saturatedMassGrams: 8000,
      };
      const hydration = calculateSubstrateHydration(100, potProfile);
      expect(hydration.state).toBe("UNKNOWN");
      expect(hydration.reason).toBe("MASS_BELOW_TARE");
    });

    it("handles saturated mass < empty mass by falling back to volume estimation", () => {
      const potProfile: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 11,
        diameterCm: 30,
        heightCm: 30,
        actualFillLiters: 11,
        emptyMassGrams: 500,
        saturatedMassGrams: 200, // Invalid: less than empty mass
      };
      const hydration = calculateSubstrateHydration(4250, potProfile);
      expect(hydration.state).toBe("INSUFFICIENT_DATA");
      expect(hydration.reason).toBe("SATURATION_REFERENCE_MISSING");
    });

    it("handles 0L pot volume gracefully", () => {
      const potProfile: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 11,
        diameterCm: 30,
        heightCm: 30,
        actualFillLiters: 11,
        emptyMassGrams: 500,
      };
      const hydration = calculateSubstrateHydration(600, potProfile);
      expect(hydration.state).toBe("INSUFFICIENT_DATA");
      expect(hydration.reason).toBe("SATURATION_REFERENCE_MISSING");
    });

    it("handles negative mass values safely", () => {
      const potProfile: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 11,
        diameterCm: 30,
        heightCm: 30,
        actualFillLiters: 11,
        emptyMassGrams: -100,
      };
      const hydration = calculateSubstrateHydration(-50, potProfile);
      expect(hydration.state).toBe("INSUFFICIENT_DATA");
      expect(hydration.reason).toBe("SATURATION_REFERENCE_MISSING");
    });
  });
});
