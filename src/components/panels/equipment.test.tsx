import { describe, expect, it } from "vitest";
import { createDefaultRunPackage } from "../../run-state";
import { calculatePpfdMapSummary } from "../../domain";
import { getSensorCalibrationStatus } from "../../scientific-core";
import type { CalibrationRecord, PpfdMapPoint, RunPackage } from "../../types";

describe("Milestone 2 - Equipment Manager & Calibration Component Suite", () => {
  it("1. calculates PPFD map summary correctly for a 9-point grid", () => {
    const points: PpfdMapPoint[] = [
      { position: "NW", ppfd: 450 },
      { position: "N", ppfd: 520 },
      { position: "NE", ppfd: 460 },
      { position: "W", ppfd: 530 },
      { position: "C", ppfd: 620 },
      { position: "E", ppfd: 540 },
      { position: "SW", ppfd: 440 },
      { position: "S", ppfd: 510 },
      { position: "SE", ppfd: 450 },
    ];

    const summary = calculatePpfdMapSummary(points, 40, 100);

    expect(summary.mean).toBe(502.2);
    expect(summary.min).toBe(440);
    expect(summary.max).toBe(620);
    expect(summary.uniformity).toBeGreaterThan(0.8);
  });

  it("2. handles PPFD mapping state updates with audit events", () => {
    const run = createDefaultRunPackage();
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
    const summary = calculatePpfdMapSummary(points, 40, 100);

    const occurredAt = new Date().toISOString();
    const newMap = {
      id: "map-1",
      dimmerPercent: 100,
      powerWatts: 300,
      fixtureHeightCm: 40,
      points,
      mean: summary.mean,
      min: summary.min,
      max: summary.max,
      uniformity: summary.uniformity,
      measurementDevice: "Photone App (Calibrated)",
      measuredAt: occurredAt,
    };

    const existingLight = run.config.light || {
      manufacturer: "SANlight",
      model: "EVO-Series",
      serialOrAssetId: null,
      ratedPowerW: 320,
      measuredMaxPowerW: null,
      dimmerLevels: [20, 40, 60, 80, 100],
      spectrumType: "Broad Spectrum",
      fixtureDimensions: "120x120 cm",
      ppfdMaps: [],
      commissionedAt: occurredAt,
    };

    const updatedRun: RunPackage = {
      ...run,
      updatedAt: occurredAt,
      config: {
        ...run.config,
        light: {
          ...existingLight,
          ppfdMaps: [newMap, ...existingLight.ppfdMaps],
        },
      },
      auditEvents: [
        {
          id: "audit-1",
          occurredAt,
          action: "configuration-changed",
          entityType: "ppfd-map",
          entityId: newMap.id,
          detail: `9-Punkt PPFD Mapping erfasst: Mean ${summary.mean} µmol, Uniformität ${(summary.uniformity * 100).toFixed(1)}%`,
        },
        ...run.auditEvents,
      ],
    };

    expect(updatedRun.config.light?.ppfdMaps.length).toBe(1);
    expect(updatedRun.config.light?.ppfdMaps[0].mean).toBe(500);
    expect(updatedRun.auditEvents.length).toBeGreaterThan(
      run.auditEvents.length,
    );
  });

  it("3. verifies sensor calibration status calculations and history recording", () => {
    const run = createDefaultRunPackage();

    // Initially uncalibrated
    const initialPhStatus = getSensorCalibrationStatus(
      "ph-sensor-main",
      "water.ph",
      run.calibrations,
    );
    expect(initialPhStatus).toBe("UNKNOWN");

    // Record valid pH calibration
    const now = new Date();
    const validUntil = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const record: CalibrationRecord = {
      id: "cal-1",
      deviceId: "ph-sensor-main",
      metric: "water.ph",
      performedAt: now.toISOString(),
      validUntil,
      method: "2-Punkt Puffer-Kalibrierung",
      referenceStandard: "pH 7.00 & pH 4.01",
      uncertainty: 0.02,
      unit: "pH",
      result: "passed",
    };

    const updatedRun: RunPackage = {
      ...run,
      calibrations: [record, ...run.calibrations],
    };

    const newPhStatus = getSensorCalibrationStatus(
      "ph-sensor-main",
      "water.ph",
      updatedRun.calibrations,
    );
    expect(newPhStatus).toBe("VALID");

    // Test expired calibration (performed 40 days ago without validUntil, default window 30 days)
    const pastDate = new Date(
      now.getTime() - 40 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const expiredRecord: CalibrationRecord = {
      id: "cal-old",
      deviceId: "ph-sensor-main",
      metric: "water.ph",
      performedAt: pastDate,
      method: "2-Punkt Puffer-Kalibrierung",
      referenceStandard: "pH 7.00 & pH 4.01",
      unit: "pH",
      result: "passed",
    };

    const expiredRun: RunPackage = {
      ...run,
      calibrations: [expiredRecord],
    };

    const expiredStatus = getSensorCalibrationStatus(
      "ph-sensor-main",
      "water.ph",
      expiredRun.calibrations,
    );
    expect(expiredStatus).toBe("CALIBRATION_DUE");
  });

  it("4. verifies EC sensor calibration status windows (60 days)", () => {
    const run = createDefaultRunPackage();
    const now = new Date();

    // Performed 40 days ago (within 60 days EC window)
    const recentPast = new Date(
      now.getTime() - 40 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const ecRecord: CalibrationRecord = {
      id: "cal-ec-1",
      deviceId: "ec-sensor-main",
      metric: "water.ec",
      performedAt: recentPast,
      performedBy: "user",
      referenceStandard: "1.413 mS/cm",
      unit: "mS/cm",
      result: "passed",
    };

    const ecRun: RunPackage = {
      ...run,
      calibrations: [ecRecord],
    };

    const ecStatus = getSensorCalibrationStatus(
      "ec-sensor-main",
      "water.ec",
      ecRun.calibrations,
      now,
    );
    expect(ecStatus).toBe("VALID");
  });

  it("integrates EC sensor calibration limits", () => {
    const run = createDefaultRunPackage();
    const ecRecord: CalibrationRecord = {
      id: "cal-4",
      deviceId: "ec-sensor-main",
      metric: "water.ec",
      performedAt: new Date().toISOString(),
      performedBy: "user",
      referenceStandard: "1.413 mS/cm",
      unit: "mS/cm",
      result: "passed",
    };

    const ecRun: RunPackage = {
      ...run,
      calibrations: [ecRecord],
    };

    const ecStatus = getSensorCalibrationStatus(
      "ec-sensor-main",
      "water.ec",
      ecRun.calibrations,
    );
    expect(ecStatus).toBe("VALID");
  });
});
