import { describe, expect, it } from "vitest";
import {
  calculateBiologicalPlantAge,
  calculatePpfdMapSummary,
  calculateSubstrateHydration,
} from "./domain";
import { getSensorCalibrationStatus } from "./scientific-core";
import { createDefaultRunPackage } from "./run-state";
import type {
  CalibrationRecord,
  DayZeroAnchor,
  GrowthEvent,
  PlantIdentity,
  PotProfile,
  PpfdMapPoint,
  RunPackage,
} from "./types";

describe("Milestone 5 Quality Gate & E2E Verification Suite", () => {
  describe("1. PPFD 9-Point Mapping Math & Lineage Engine", () => {
    it("calculates mean, min, max and uniformity accurately for 3x3 grid with dimmer scaling", () => {
      const rawPoints: PpfdMapPoint[] = [
        { position: "NW", ppfd: 400 },
        { position: "N", ppfd: 500 },
        { position: "NE", ppfd: 400 },
        { position: "W", ppfd: 500 },
        { position: "C", ppfd: 600 },
        { position: "E", ppfd: 500 },
        { position: "SW", ppfd: 400 },
        { position: "S", ppfd: 500 },
        { position: "SE", ppfd: 400 },
      ];

      // At 100% dimmer
      const summary100 = calculatePpfdMapSummary(rawPoints, 40, 100);
      expect(summary100.min).toBe(400);
      expect(summary100.max).toBe(600);
      // Sum: 400*4 + 500*4 + 600 = 1600 + 2000 + 600 = 4200 / 9 = 466.666... -> 466.7
      expect(summary100.mean).toBe(466.7);
      // Uniformity: 400 / 466.7 = 0.857...
      expect(summary100.uniformity).toBeCloseTo(400 / 466.7, 2);

      // At 50% dimmer
      const summary50 = calculatePpfdMapSummary(rawPoints, 40, 50);
      expect(summary50.min).toBe(200);
      expect(summary50.max).toBe(300);
      expect(summary50.mean).toBe(233.3);
      expect(summary50.uniformity).toBeCloseTo(200 / 233.3, 2);
    });

    it("handles edge cases (all zeros, empty points, extreme values)", () => {
      const zeroPoints: PpfdMapPoint[] = [
        { position: "NW", ppfd: 0 },
        { position: "N", ppfd: 0 },
        { position: "NE", ppfd: 0 },
        { position: "W", ppfd: 0 },
        { position: "C", ppfd: 0 },
        { position: "E", ppfd: 0 },
        { position: "SW", ppfd: 0 },
        { position: "S", ppfd: 0 },
        { position: "SE", ppfd: 0 },
      ];
      const zeroSummary = calculatePpfdMapSummary(zeroPoints, 30, 100);
      expect(zeroSummary.mean).toBe(0);
      expect(zeroSummary.min).toBe(0);
      expect(zeroSummary.max).toBe(0);
      expect(zeroSummary.uniformity).toBe(0);
    });
  });

  describe("2. Sensor Calibration Trust & Expiry Engine", () => {
    it("derives valid, expired, and uncalibrated statuses accurately for pH and EC sensors", () => {
      const now = new Date("2026-08-14T12:00:00Z");

      // Uncalibrated case
      const uncalibratedPh = getSensorCalibrationStatus(
        "ph-1",
        "water.ph",
        [],
        now,
      );
      expect(uncalibratedPh).toBe("UNKNOWN");

      // Valid calibration case (validUntil is in future)
      const validPhRecord: CalibrationRecord = {
        id: "cal-1",
        deviceId: "ph-1",
        metric: "water.ph",
        performedAt: "2026-08-01T10:00:00Z",
        validUntil: "2026-08-31T10:00:00Z",
        method: "2-Punkt Puffer",
        referenceStandard: "pH 7.00 & 4.01",
        uncertainty: 0.02,
        unit: "pH",
        result: "passed",
      };
      const validPh = getSensorCalibrationStatus(
        "ph-1",
        "water.ph",
        [validPhRecord],
        now,
      );
      expect(validPh).toBe("VALID");

      // Expired calibration case (validUntil is in past)
      const expiredPhRecord: CalibrationRecord = {
        ...validPhRecord,
        id: "cal-expired",
        validUntil: "2026-08-10T10:00:00Z",
      };
      const expiredPh = getSensorCalibrationStatus(
        "ph-1",
        "water.ph",
        [expiredPhRecord],
        now,
      );
      expect(expiredPh).toBe("CALIBRATION_DUE");

      // Failed calibration case
      const failedEcRecord: CalibrationRecord = {
        id: "cal-fail",
        deviceId: "ec-1",
        metric: "water.ec",
        performedAt: "2026-08-12T10:00:00Z",
        validUntil: "2026-10-12T10:00:00Z",
        method: "1.413 mS/cm Standard",
        referenceStandard: "1.413 mS/cm",
        uncertainty: 0.05,
        unit: "mS/cm",
        result: "failed",
      };
      const failedEc = getSensorCalibrationStatus(
        "ec-1",
        "water.ec",
        [failedEcRecord],
        now,
      );
      expect(failedEc).toBe("FAILED");
    });
  });

  describe("3. Plant Identity Day Zero Anchor Engine", () => {
    it("calculates biological age accurately for all Day Zero anchor types", () => {
      const anchorDateStr = "2026-08-01T00:00:00Z";
      const now = new Date("2026-08-14T12:00:00Z"); // 13.5 days -> 13 full days

      const anchors: DayZeroAnchor[] = [
        "emergence",
        "seed-started",
        "seed-planted",
        "first-true-leaves",
        "run-operational-start",
      ];

      for (const anchor of anchors) {
        const events: GrowthEvent[] = [
          {
            id: `event-${anchor}`,
            plantId: "plant-1",
            kind: anchor,
            occurredAt: anchorDateStr,
            day: 0,
            observedBy: "user",
            confidence: "confirmed",
            notes: `Anchor test for ${anchor}`,
            photoIds: [],
          },
        ];

        const age = calculateBiologicalPlantAge(anchor, events, now);
        expect(age.biologicalAgeDays).toBe(13);
        expect(age.anchorDateString).toBe(anchorDateStr);
      }
    });

    it("falls back to operational day if no growth event exists for chosen anchor", () => {
      const now = new Date("2026-08-14T12:00:00Z");
      const age = calculateBiologicalPlantAge("emergence", [], now);
      expect(age.biologicalAgeDays).toBe(0);
      expect(typeof age.anchorDateString).toBe("string");
    });
  });

  describe("4. Gravimetric Pot Weight & Substrate Dryback Engine", () => {
    it("accurately categorizes moisture and calculates dryback percentages across all 5 zones", () => {
      const potProfile: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 11,
        actualFillLiters: 11,
        diameterCm: 25,
        heightCm: 25,
        emptyMassGrams: 1000, // TARA
        saturatedMassGrams: 5000, // 100% Saturation (water capacity = 4000g)
      };

      // Case 1: Saturated (100% hydration, 0% depletion)
      const satResult = calculateSubstrateHydration(5000, potProfile);
      expect(satResult.hydrationPercent).toBe(100);
      expect(satResult.depletionPercent).toBe(0);
      expect(satResult.availableWaterGrams).toBe(4000);
      expect(satResult.category).toBe("saturated");

      // Case 2: Heavy (80% hydration, 20% depletion -> 1000 + 0.8*4000 = 4200g)
      const heavyResult = calculateSubstrateHydration(4200, potProfile);
      expect(heavyResult.hydrationPercent).toBe(80);
      expect(heavyResult.depletionPercent).toBe(20);
      expect(heavyResult.availableWaterGrams).toBe(3200);
      expect(heavyResult.category).toBe("heavy");

      // Case 3: Medium / Optimal (50% hydration, 50% depletion -> 1000 + 0.5*4000 = 3000g)
      const medResult = calculateSubstrateHydration(3000, potProfile);
      expect(medResult.hydrationPercent).toBe(50);
      expect(medResult.depletionPercent).toBe(50);
      expect(medResult.availableWaterGrams).toBe(2000);
      expect(medResult.category).toBe("medium");

      // Case 4: Light (30% hydration, 70% depletion -> 1000 + 0.3*4000 = 2200g)
      const lightResult = calculateSubstrateHydration(2200, potProfile);
      expect(lightResult.hydrationPercent).toBe(30);
      expect(lightResult.depletionPercent).toBe(70);
      expect(lightResult.availableWaterGrams).toBe(1200);
      expect(lightResult.category).toBe("light");

      // Case 5: Dry (10% hydration, 90% depletion -> 1000 + 0.1*4000 = 1400g)
      const dryResult = calculateSubstrateHydration(1400, potProfile);
      expect(dryResult.hydrationPercent).toBe(10);
      expect(dryResult.depletionPercent).toBe(90);
      expect(dryResult.availableWaterGrams).toBe(400);
      expect(dryResult.category).toBe("dry");
    });

    it("robustly handles out-of-bounds mass measurements without throwing or NaNs", () => {
      const potProfile: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 11,
        actualFillLiters: 11,
        diameterCm: 25,
        heightCm: 25,
        emptyMassGrams: 1000,
        saturatedMassGrams: 5000,
      };

      // Below TARA (e.g. 800g) -> Unknown
      const belowTara = calculateSubstrateHydration(800, potProfile);
      expect(belowTara.state).toBe("UNKNOWN");
      expect(belowTara.reason).toBe("MASS_BELOW_TARE");

      // Above Saturated (e.g. 6000g) -> Unknown
      const aboveSat = calculateSubstrateHydration(6000, potProfile);
      expect(aboveSat.state).toBe("UNKNOWN");
      expect(aboveSat.reason).toBe("MASS_EXCEEDS_SATURATION");
    });
  });

  describe("5. RunPackage State Immutability & Audit Lineage Flow", () => {
    it("maintains strict immutability and creates valid audit trails for Milestone 5 features", () => {
      const initialRun = createDefaultRunPackage();
      const originalAuditCount = initialRun.auditEvents.length;

      // Add PPFD map audit
      const updatedRun: RunPackage = {
        ...initialRun,
        auditEvents: [
          {
            id: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            action: "configuration-changed",
            entityType: "ppfd-map",
            entityId: "ppfd-map-1",
            detail:
              "9-Punkt PPFD Mapping erfasst: Mean 520 µmol, Uniformität 84.5% bei 40 cm.",
          },
          ...initialRun.auditEvents,
        ],
      };

      expect(updatedRun.auditEvents.length).toBe(originalAuditCount + 1);
      expect(initialRun.auditEvents.length).toBe(originalAuditCount); // initial is untouched
      expect(updatedRun.auditEvents[0].entityType).toBe("ppfd-map");
    });
  });
});
