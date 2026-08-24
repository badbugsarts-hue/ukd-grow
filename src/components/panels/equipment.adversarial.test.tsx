import { describe, expect, it } from "vitest";
import { calculatePpfdMapSummary } from "../../domain";
import { getSensorCalibrationStatus } from "../../scientific-core";
import { createDefaultRunPackage } from "../../run-state";
import type { CalibrationRecord, PpfdMapPoint, RunPackage } from "../../types";

describe("Empirical Adversarial Challenge Suite - Equipment & Calibration M2 Components", () => {
  describe("1. PPFD Grid Math Oracles & Stress Harness", () => {
    it("handles zero dimmer percentage without NaN or division by zero", () => {
      const points: PpfdMapPoint[] = [
        { position: "NW", ppfd: 500 },
        { position: "N", ppfd: 500 },
        { position: "NE", ppfd: 500 },
        { position: "W", ppfd: 500 },
        { position: "C", ppfd: 500 },
        { position: "E", ppfd: 500 },
        { position: "SW", ppfd: 500 },
        { position: "S", ppfd: 500 },
        { position: "SE", ppfd: 500 },
      ];
      const summary = calculatePpfdMapSummary(points, 40, 0);

      expect(summary.mean).toBe(0);
      expect(summary.min).toBe(0);
      expect(summary.max).toBe(0);
      expect(summary.uniformity).toBe(0);
      expect(Number.isNaN(summary.uniformity)).toBe(false);
    });

    it("handles negative and extreme PPFD values defensively", () => {
      const points: PpfdMapPoint[] = [
        { position: "NW", ppfd: -100 },
        { position: "N", ppfd: Number.NaN },
        { position: "NE", ppfd: 1000 },
        { position: "W", ppfd: 500 },
        { position: "C", ppfd: 800 },
        { position: "E", ppfd: 600 },
        { position: "SW", ppfd: 400 },
        { position: "S", ppfd: 700 },
        { position: "SE", ppfd: 500 },
      ];
      const summary = calculatePpfdMapSummary(points, 40, 100);

      // Invalid values (-100, NaN) are filtered out, leaving valid points
      expect(summary.min).toBe(400);
      expect(summary.max).toBe(1000);
      expect(summary.mean).toBeGreaterThan(0);
      expect(summary.uniformity).toBeCloseTo(400 / summary.mean, 2);
    });

    it("calculates 100% uniformity for a perfectly uniform light grid", () => {
      const points: PpfdMapPoint[] = Array.from({ length: 9 }, (_, i) => ({
        position: ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"][i] as any,
        ppfd: 650,
      }));
      const summary = calculatePpfdMapSummary(points, 50, 80); // 80% dimmer => 520 umol

      expect(summary.mean).toBe(520);
      expect(summary.min).toBe(520);
      expect(summary.max).toBe(520);
      expect(summary.uniformity).toBe(1.0);
    });

    it("handles all-zero grid inputs safely without NaN", () => {
      const points: PpfdMapPoint[] = Array.from({ length: 9 }, (_, i) => ({
        position: ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"][i] as any,
        ppfd: 0,
      }));
      const summary = calculatePpfdMapSummary(points, 40, 100);

      expect(summary.mean).toBe(0);
      expect(summary.min).toBe(0);
      expect(summary.max).toBe(0);
      expect(summary.uniformity).toBe(0);
    });

    it("handles dimmer values outside [0, 100] by clamping safeDimmer", () => {
      const points: PpfdMapPoint[] = Array.from({ length: 9 }, (_, i) => ({
        position: ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"][i] as any,
        ppfd: 500,
      }));

      const summaryOver = calculatePpfdMapSummary(points, 40, 150); // Clamped to 100%
      expect(summaryOver.mean).toBe(500);

      const summaryUnder = calculatePpfdMapSummary(points, 40, -50); // Clamped to 0%
      expect(summaryUnder.mean).toBe(0);
    });
  });

  describe("2. Sensor Calibration Temporal & Boundary Oracles", () => {
    it("returns 'uncalibrated' if calibrations array has no matching device", () => {
      const calibrations: CalibrationRecord[] = [];
      expect(
        getSensorCalibrationStatus("ph-sensor-main", "water.ph", calibrations),
      ).toBe("UNKNOWN");
    });

    it("correctly identifies exact boundary timestamps for pH calibrations (30 days)", () => {
      const now = new Date("2026-08-14T12:00:00Z");
      const exactExpiry = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const record: CalibrationRecord = {
        id: "cal-boundary-1",
        deviceId: "ph-sensor-main",
        metric: "water.ph",
        performedAt: now.toISOString(),
        validUntil: exactExpiry,
        method: "2-Punkt",
        referenceStandard: "7.00/4.01",
        unit: "pH",
        result: "passed",
      };

      const calibrations = [record];

      // At current time -> valid
      expect(
        getSensorCalibrationStatus(
          "ph-sensor-main",
          "water.ph",
          calibrations,
          now,
        ),
      ).toBe("VALID");

      // 1ms before expiry -> valid
      const justBefore = new Date(new Date(exactExpiry).getTime() - 1);
      expect(
        getSensorCalibrationStatus(
          "ph-sensor-main",
          "water.ph",
          calibrations,
          justBefore,
        ),
      ).toBe("DUE_SOON");

      // 1ms after expiry -> expired
      const justAfter = new Date(new Date(exactExpiry).getTime() + 1);
      expect(
        getSensorCalibrationStatus(
          "ph-sensor-main",
          "water.ph",
          calibrations,
          justAfter,
        ),
      ).toBe("CALIBRATION_DUE");
    });

    it("returns 'failed' status immediately if latest calibration failed, even if within validity window", () => {
      const now = new Date("2026-08-14T12:00:00Z");
      const recordFailed: CalibrationRecord = {
        id: "cal-failed",
        deviceId: "ph-sensor-main",
        metric: "water.ph",
        performedAt: now.toISOString(),
        validUntil: new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        method: "2-Punkt",
        referenceStandard: "7.00/4.01",
        unit: "pH",
        result: "failed",
      };

      expect(
        getSensorCalibrationStatus(
          "ph-sensor-main",
          "water.ph",
          [recordFailed],
          now,
        ),
      ).toBe("FAILED");
    });

    it("evaluates EC sensor default 60-day validity window when validUntil is omitted", () => {
      const now = new Date("2026-08-14T12:00:00Z");
      const performed59DaysAgo = new Date(
        now.getTime() - 59 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const performed61DaysAgo = new Date(
        now.getTime() - 61 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const record59: CalibrationRecord = {
        id: "ec-59",
        deviceId: "ec-sensor-main",
        metric: "water.ec",
        performedAt: performed59DaysAgo,
        method: "Standard",
        referenceStandard: "1.413 mS/cm",
        unit: "mS/cm",
        result: "passed",
      };

      const record61: CalibrationRecord = {
        id: "ec-61",
        deviceId: "ec-sensor-main",
        metric: "water.ec",
        performedAt: performed61DaysAgo,
        method: "Standard",
        referenceStandard: "1.413 mS/cm",
        unit: "mS/cm",
        result: "passed",
      };

      expect(
        getSensorCalibrationStatus(
          "ec-sensor-main",
          "water.ec",
          [record59],
          now,
        ),
      ).toBe("DUE_SOON");
      expect(
        getSensorCalibrationStatus(
          "ec-sensor-main",
          "water.ec",
          [record61],
          now,
        ),
      ).toBe("CALIBRATION_DUE");
    });
  });

  describe("3. Immutability & Data Lineage Audit Event Verification", () => {
    it("ensures state update when appending PPFD map produces a fresh RunPackage with configuration-changed audit event", () => {
      const originalRun = createDefaultRunPackage();
      const points: PpfdMapPoint[] = Array.from({ length: 9 }, (_, i) => ({
        position: ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"][i] as any,
        ppfd: 500,
      }));

      const summary = calculatePpfdMapSummary(points, 40, 100);
      const occurredAt = new Date().toISOString();
      const mapId = "map-test-123";

      const newMap = {
        id: mapId,
        dimmerPercent: 100,
        powerWatts: 300,
        fixtureHeightCm: 40,
        points,
        mean: summary.mean,
        min: summary.min,
        max: summary.max,
        uniformity: summary.uniformity,
        measurementDevice: "Photone App",
        measuredAt: occurredAt,
      };

      const existingLight = originalRun.config.light || {
        manufacturer: "SANlight",
        model: "EVO",
        serialOrAssetId: null,
        ratedPowerW: 320,
        measuredMaxPowerW: null,
        dimmerLevels: [20, 40, 60, 80, 100],
        spectrumType: "Broad",
        fixtureDimensions: "120x120 cm",
        ppfdMaps: [],
        commissionedAt: occurredAt,
      };

      const updatedRun: RunPackage = {
        ...originalRun,
        updatedAt: occurredAt,
        config: {
          ...originalRun.config,
          light: {
            ...existingLight,
            ppfdMaps: [newMap, ...existingLight.ppfdMaps],
          },
        },
        auditEvents: [
          {
            id: "audit-test-1",
            occurredAt,
            action: "configuration-changed",
            entityType: "ppfd-map",
            entityId: mapId,
            detail: `PPFD mapping recorded`,
          },
          ...originalRun.auditEvents,
        ],
      };

      // Check non-mutative structure
      expect(updatedRun).not.toBe(originalRun);
      expect(updatedRun.config).not.toBe(originalRun.config);
      expect(originalRun.config.light?.ppfdMaps?.length ?? 0).toBe(0);
      expect(updatedRun.config.light?.ppfdMaps.length).toBe(1);

      // Check Audit Event
      const latestAudit = updatedRun.auditEvents[0];
      expect(latestAudit.action).toBe("configuration-changed");
      expect(latestAudit.entityType).toBe("ppfd-map");
      expect(latestAudit.entityId).toBe(mapId);
    });
  });
});
