import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  calculateBiologicalPlantAge,
  calculateDli,
  calculateLeafVpd,
  calculatePpfdMapSummary,
  calculateSubstrateHydration,
  getDayPlan,
  getDailySheet,
} from "./domain";
import {
  activateRun,
  createDefaultRunPackage,
  updateExecutionMode,
  updatePlantIdentity,
  updatePlantMilestones,
  updatePotProfile,
  updateRunConfig,
} from "./run-state";
import { evaluateLiveClock } from "./live-run";
import {
  RunConfigPanel,
  calculateReadinessScore,
} from "./components/panels/RunConfigPanel";
import type {
  ExperienceLens,
  GrowthEvent,
  PlantMilestones,
  PotProfile,
  PpfdMapPoint,
  RunConfig,
  RunPackage,
  WaterProfile,
} from "./types";

describe("Challenger 1 — Empirical Adversarial Stress Test Suite: Setup View, Dryback Tare, Live/Sim & Milestones", () => {
  const createValidBaseRun = (): RunPackage => {
    const base = createDefaultRunPackage(new Date("2026-08-20T12:00:00Z"));
    return {
      ...base,
      config: {
        ...base.config,
        name: "UKD Empirical Adversarial Test Run",
        genetics: "Double Grape Auto",
        startDate: "2026-08-10",
        endDay: 80,
        plantCount: 1,
        dayZeroAnchor: "emergence",
        tentWidthCm: 60,
        tentDepthCm: 60,
        tentHeightCm: 180,
        ledMaxW: 140,
        lightHours: 18,
        medium: "Coco",
        mediumProduct: "UGro Pure Coco",
        irrigationSystem: "Manuell",
        nutrientSystem: "UKD HESI Conservative",
        exhaustM3h: 220,
        pot: {
          type: "fabric",
          nominalVolumeLiters: 11,
          actualFillLiters: 10,
          diameterCm: 25,
          heightCm: 28,
          emptyMassGrams: 1850,
          saturatedMassGrams: 5200,
        },
        water: {
          sourceType: "municipal",
          sourceDescription: "Leitungswasser",
          sourcePh: 7.2,
          sourceEc: 0.4,
          calciumMgL: 60,
          magnesiumMgL: 15,
          alkalinityMgL: 180,
          sodiumMgL: 10,
          chlorideMgL: 15,
          sulfateMgL: 20,
          verified: true,
        },
      },
    };
  };

  // ═════════════════════════════════════════════════════════════════════════
  // 1. TENT GEOMETRY, VENTILATION & LIGHTING EXTREME / BOUNDARY STRESS
  // ═════════════════════════════════════════════════════════════════════════
  describe("1. Tent Dimensions, Lighting & Ventilation Extreme Boundary Inputs", () => {
    it("Stress 1.1: handles zero tent dimensions without division by zero or NaN", () => {
      const run = createValidBaseRun();
      const zeroConfig: RunConfig = {
        ...run.config,
        tentWidthCm: 0,
        tentDepthCm: 0,
        tentHeightCm: 0,
      };

      const readiness = calculateReadinessScore(zeroConfig);
      expect(readiness.isReady).toBe(false);
      expect(readiness.score).toBeLessThanOrEqual(80);
      expect(readiness.missingItems).toContain(
        "Zelt-Abmessungen (Breite, Tiefe, Höhe) unvollständig",
      );

      // Render RunConfigPanel with zero dimensions
      const zeroRun = { ...run, config: zeroConfig };
      const html = renderToString(
        <RunConfigPanel run={zeroRun} lens="expert" onUpdateRun={() => {}} />,
      );
      expect(html).toMatch(/0\.00\s*(<!-- -->)?\s*m²/);
      expect(html).toMatch(/0\.00\s*(<!-- -->)?\s*m³/);
      expect(html).toContain("—"); // plant density fallback
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("Infinity");
    });

    it("Stress 1.2: rejects negative tent dimensions at the fail-closed readiness gate", () => {
      const run = createValidBaseRun();
      const negConfig: RunConfig = {
        ...run.config,
        tentWidthCm: -60,
        tentDepthCm: -60,
        tentHeightCm: -180,
      };

      const readiness = calculateReadinessScore(negConfig);
      expect(readiness.isReady).toBe(false);
      expect(readiness.missingItems).toContain(
        "Zelt-Abmessungen (Breite, Tiefe, Höhe) unvollständig",
      );

      const negRun = { ...run, config: negConfig };
      const html = renderToString(
        <RunConfigPanel run={negRun} lens="guided" onUpdateRun={() => {}} />,
      );
      expect(html).toContain("FAIL-CLOSED READINESS GATE: UNVOLLSTÄNDIG");
    });

    it("Stress 1.3: handles massive tent dimensions (10,000 cm) without overflow or crash", () => {
      const run = createValidBaseRun();
      const hugeConfig: RunConfig = {
        ...run.config,
        tentWidthCm: 10000,
        tentDepthCm: 10000,
        tentHeightCm: 5000,
      };

      const readiness = calculateReadinessScore(hugeConfig);
      expect(readiness.isReady).toBe(true);

      const hugeRun = { ...run, config: hugeConfig };
      const html = renderToString(
        <RunConfigPanel run={hugeRun} lens="expert" onUpdateRun={() => {}} />,
      );
      expect(html).toMatch(/10000\.00\s*(<!-- -->)?\s*m²/);
      expect(html).toMatch(/500000\.00\s*(<!-- -->)?\s*m³/);
      expect(html).not.toContain("NaN");
    });

    it("Stress 1.4: plant count boundary testing and KCanG compliance badge", () => {
      const run = createValidBaseRun();

      // 1 plant: compliant
      const run1 = { ...run, config: { ...run.config, plantCount: 1 } };
      const html1 = renderToString(
        <RunConfigPanel run={run1} lens="advanced" onUpdateRun={() => {}} />,
      );
      expect(html1).toContain("✓ Konform (≤3)");

      // 3 plants: compliant
      const run3 = { ...run, config: { ...run.config, plantCount: 3 } };
      const html3 = renderToString(
        <RunConfigPanel run={run3} lens="advanced" onUpdateRun={() => {}} />,
      );
      expect(html3).toContain("✓ Konform (≤3)");

      // 4 plants: non-compliant warning
      const run4 = { ...run, config: { ...run.config, plantCount: 4 } };
      const html4 = renderToString(
        <RunConfigPanel run={run4} lens="advanced" onUpdateRun={() => {}} />,
      );
      expect(html4).toContain("⚠️ &gt;3 Pflanzen");

      // 0 / negative plants: clamped safely
      const run0 = { ...run, config: { ...run.config, plantCount: 0 } };
      const html0 = renderToString(
        <RunConfigPanel run={run0} lens="advanced" onUpdateRun={() => {}} />,
      );
      expect(html0).toContain("✓ Konform (≤3)");
    });

    it("Stress 1.5: lighting photobiology edge cases (0W, negative, 24h photoperiod, DLI calculation)", () => {
      // Zero wattage
      expect(calculateDli(0, 18)).toBe(0);
      expect(calculateDli(500, 0)).toBe(0);
      expect(calculateDli(0, 0)).toBe(0);

      // Standard: 500 µmol/m²/s for 18h
      // (500 * 18 * 3600) / 1,000,000 = 32.4 mol/m²/d
      expect(calculateDli(500, 18)).toBeCloseTo(32.4, 2);

      // 24h continuous light (autoflower stress)
      expect(calculateDli(500, 24)).toBeCloseTo(43.2, 2);

      // Readiness gate check for 0W and 0h
      const zeroWattConfig = { ...createValidBaseRun().config, ledMaxW: 0 };
      expect(calculateReadinessScore(zeroWattConfig).isReady).toBe(false);

      const zeroHoursConfig = { ...createValidBaseRun().config, lightHours: 0 };
      expect(calculateReadinessScore(zeroHoursConfig).isReady).toBe(false);
    });

    it("Stress 1.6: calculatePpfdMapSummary under empty, negative, and extreme dimmer values", () => {
      // Empty points
      expect(calculatePpfdMapSummary([], 30, 100)).toEqual({
        mean: 0,
        min: 0,
        max: 0,
        uniformity: 0,
      });

      // Negative & invalid points filtered cleanly
      const dirtyPoints: PpfdMapPoint[] = [
        { x: 0, y: 0, ppfd: 500 },
        { x: 1, y: 0, ppfd: -100 },
        { x: 0, y: 1, ppfd: Number.NaN },
        { x: 1, y: 1, ppfd: 600 },
      ];
      const summary = calculatePpfdMapSummary(dirtyPoints, 30, 100);
      expect(summary.mean).toBe(550);
      expect(summary.min).toBe(500);
      expect(summary.max).toBe(600);
      expect(summary.uniformity).toBeCloseTo(500 / 550, 3);

      // Dimmer at 50%
      const dimmedSummary = calculatePpfdMapSummary(dirtyPoints, 30, 50);
      expect(dimmedSummary.mean).toBe(275);
      expect(dimmedSummary.min).toBe(250);
      expect(dimmedSummary.max).toBe(300);

      // Dimmer out of bounds: clamped to [0, 100]
      const overDimmed = calculatePpfdMapSummary(dirtyPoints, 30, 150);
      expect(overDimmed.mean).toBe(550); // clamped to 100%

      const underDimmed = calculatePpfdMapSummary(dirtyPoints, 30, -50);
      expect(underDimmed.mean).toBe(0); // clamped to 0%
    });

    it("Stress 1.7: ventilation & turnover calculations with zero volume and persistence", () => {
      const run = createValidBaseRun();

      // Zero volume tent
      const zeroVolRun = {
        ...run,
        config: {
          ...run.config,
          tentWidthCm: 0,
          tentDepthCm: 0,
          tentHeightCm: 0,
          exhaustM3h: 220,
        },
      };

      const html = renderToString(
        <RunConfigPanel
          run={zeroVolRun}
          lens="expert"
          onUpdateRun={() => {}}
        />,
      );
      expect(html).toMatch(/0\s*(<!-- -->)?\s*x pro Stunde/);
      expect(html).not.toContain("Infinity");

      // Persist exhaust change
      const updatedRun = updateRunConfig(run, {
        ...run.config,
        exhaustM3h: 350,
      });
      expect(updatedRun.config.exhaustM3h).toBe(350);
    });

    it("Stress 1.8: Water Ca:Mg Ratio guidance edge cases (Mg=0, inverted ratios)", () => {
      const run = createValidBaseRun();

      // Mg = 0 (division by zero defense: returns 60:0)
      const zeroMgRun = {
        ...run,
        config: {
          ...run.config,
          water: { ...run.config.water, calciumMgL: 60, magnesiumMgL: 0 },
        },
      };
      const htmlZeroMg = renderToString(
        <RunConfigPanel run={zeroMgRun} lens="expert" onUpdateRun={() => {}} />,
      );
      expect(htmlZeroMg).toContain("60:0");
      expect(htmlZeroMg).toContain("CalMag Ausgleich empfohlen");

      // Inverted Ca:Mg ratio (Ca=20, Mg=60 -> 0.3:1)
      const invertedRun = {
        ...run,
        config: {
          ...run.config,
          water: { ...run.config.water, calciumMgL: 20, magnesiumMgL: 60 },
        },
      };
      const htmlInverted = renderToString(
        <RunConfigPanel
          run={invertedRun}
          lens="expert"
          onUpdateRun={() => {}}
        />,
      );
      expect(htmlInverted).toContain("0.3");
      expect(htmlInverted).toContain("CalMag Ausgleich empfohlen");

      // Ideal Ca:Mg ratio (Ca=60, Mg=20 -> 3.0:1)
      const idealRun = {
        ...run,
        config: {
          ...run.config,
          water: { ...run.config.water, calciumMgL: 60, magnesiumMgL: 20 },
        },
      };
      const htmlIdeal = renderToString(
        <RunConfigPanel run={idealRun} lens="expert" onUpdateRun={() => {}} />,
      );
      expect(htmlIdeal).toContain("3.0");
      expect(htmlIdeal).toContain("Ideal (3:1 bis 4:1)");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 2. DRYBACK CALCULATIONS & TARE WEIGHT ADVERSARIAL STRESS
  // ═════════════════════════════════════════════════════════════════════════
  describe("2. Substrate Dryback Tare Calculations (Msat <= Mempty, Missing, Inverted)", () => {
    const validPot: PotProfile = {
      type: "fabric",
      nominalVolumeLiters: 11,
      actualFillLiters: 10,
      diameterCm: 25,
      heightCm: 28,
      emptyMassGrams: 2000,
      saturatedMassGrams: 5000,
    };

    it("Stress 2.1: Missing tare weights return INSUFFICIENT_DATA", () => {
      const noEmpty: PotProfile = { ...validPot, emptyMassGrams: null };
      const resNoEmpty = calculateSubstrateHydration(3500, noEmpty);
      expect(resNoEmpty.state).toBe("INSUFFICIENT_DATA");
      expect(resNoEmpty.reason).toBe("EMPTY_MASS_MISSING");
      expect(resNoEmpty.hydrationPercent).toBeNull();
      expect(resNoEmpty.category).toBe("unknown");

      const noSat: PotProfile = { ...validPot, saturatedMassGrams: null };
      const resNoSat = calculateSubstrateHydration(3500, noSat);
      expect(resNoSat.state).toBe("INSUFFICIENT_DATA");
      expect(resNoSat.reason).toBe("SATURATION_REFERENCE_MISSING");
    });

    it("Stress 2.2: Equal tare weights (Msat == Mempty) prevent divide-by-zero and return INSUFFICIENT_DATA", () => {
      const equalPot: PotProfile = {
        ...validPot,
        emptyMassGrams: 2000,
        saturatedMassGrams: 2000,
      };
      const resEqual = calculateSubstrateHydration(2000, equalPot);
      expect(resEqual.state).toBe("INSUFFICIENT_DATA");
      expect(resEqual.reason).toBe("SATURATION_REFERENCE_MISSING");
      expect(resEqual.hydrationPercent).toBeNull();
    });

    it("Stress 2.3: Inverted tare weights (Msat < Mempty) evaluate fail-safe", () => {
      const invertedPot: PotProfile = {
        ...validPot,
        emptyMassGrams: 4000,
        saturatedMassGrams: 2000,
      };

      // If current mass >= emptyMass (e.g. 4500g), satMass <= emptyMass triggers SATURATION_REFERENCE_MISSING
      const resInvertedAboveTare = calculateSubstrateHydration(
        4500,
        invertedPot,
      );
      expect(resInvertedAboveTare.state).toBe("INSUFFICIENT_DATA");
      expect(resInvertedAboveTare.reason).toBe("SATURATION_REFERENCE_MISSING");
      expect(resInvertedAboveTare.hydrationPercent).toBeNull();

      // If current mass < emptyMass (e.g. 3000g < 4000g), underflow check triggers MASS_BELOW_TARE
      const resInvertedBelowTare = calculateSubstrateHydration(
        3000,
        invertedPot,
      );
      expect(resInvertedBelowTare.state).toBe("UNKNOWN");
      expect(resInvertedBelowTare.reason).toBe("MASS_BELOW_TARE");
      expect(resInvertedBelowTare.hydrationPercent).toBeNull();
    });

    it("Stress 2.4: Current mass below empty tare weight returns UNKNOWN (MASS_BELOW_TARE)", () => {
      const resBelow = calculateSubstrateHydration(1500, validPot);
      expect(resBelow.state).toBe("UNKNOWN");
      expect(resBelow.reason).toBe("MASS_BELOW_TARE");
      expect(resBelow.hydrationPercent).toBeNull();
    });

    it("Stress 2.5: Current mass exceeding 105% saturation returns UNKNOWN (MASS_EXCEEDS_SATURATION)", () => {
      // 5000 * 1.05 = 5250g. At 5300g it must return UNKNOWN
      const resOver = calculateSubstrateHydration(5300, validPot);
      expect(resOver.state).toBe("UNKNOWN");
      expect(resOver.reason).toBe("MASS_EXCEEDS_SATURATION");
      expect(resOver.hydrationPercent).toBeNull();

      // At 5250g (exactly 105%), it remains VALID and clamps hydration to 100%
      const resEdge = calculateSubstrateHydration(5250, validPot);
      expect(resEdge.state).toBe("VALID");
      expect(resEdge.hydrationPercent).toBe(100);
      expect(resEdge.category).toBe("saturated");
    });

    it("Stress 2.6: Invalid, NaN, and Infinite current mass inputs return UNKNOWN (INVALID_CURRENT_MASS)", () => {
      expect(calculateSubstrateHydration(Number.NaN, validPot)).toEqual({
        state: "UNKNOWN",
        hydrationPercent: null,
        depletionPercent: null,
        availableWaterGrams: null,
        category: "unknown",
        reason: "INVALID_CURRENT_MASS",
      });

      expect(
        calculateSubstrateHydration(Number.POSITIVE_INFINITY, validPot),
      ).toEqual({
        state: "UNKNOWN",
        hydrationPercent: null,
        depletionPercent: null,
        availableWaterGrams: null,
        category: "unknown",
        reason: "INVALID_CURRENT_MASS",
      });
    });

    it("Stress 2.7: Strict mathematical dryback hydration curve progression", () => {
      // Capacity = 5000 - 2000 = 3000g water
      // 1. Dry state: 2000g -> 0g water -> 0% hydration, 100% depletion
      const dry = calculateSubstrateHydration(2000, validPot);
      expect(dry.state).toBe("VALID");
      expect(dry.hydrationPercent).toBe(0);
      expect(dry.depletionPercent).toBe(100);
      expect(dry.availableWaterGrams).toBe(0);
      expect(dry.category).toBe("dry");

      // 2. Light state: 2750g -> 750g water (25% hydration) -> "light" (20-39%)
      const light = calculateSubstrateHydration(2750, validPot);
      expect(light.state).toBe("VALID");
      expect(light.hydrationPercent).toBe(25);
      expect(light.depletionPercent).toBe(75);
      expect(light.availableWaterGrams).toBe(750);
      expect(light.category).toBe("light");

      // 3. Medium state: 3500g -> 1500g water (50% hydration) -> "medium" (40-69%)
      const med = calculateSubstrateHydration(3500, validPot);
      expect(med.state).toBe("VALID");
      expect(med.hydrationPercent).toBe(50);
      expect(med.depletionPercent).toBe(50);
      expect(med.availableWaterGrams).toBe(1500);
      expect(med.category).toBe("medium");

      // 4. Heavy state: 4400g -> 2400g water (80% hydration) -> "heavy" (70-89%)
      const heavy = calculateSubstrateHydration(4400, validPot);
      expect(heavy.state).toBe("VALID");
      expect(heavy.hydrationPercent).toBe(80);
      expect(heavy.depletionPercent).toBe(20);
      expect(heavy.availableWaterGrams).toBe(2400);
      expect(heavy.category).toBe("heavy");

      // 5. Saturated state: 5000g -> 3000g water (100% hydration) -> "saturated" (>=90%)
      const sat = calculateSubstrateHydration(5000, validPot);
      expect(sat.state).toBe("VALID");
      expect(sat.hydrationPercent).toBe(100);
      expect(sat.depletionPercent).toBe(0);
      expect(sat.availableWaterGrams).toBe(3000);
      expect(sat.category).toBe("saturated");
    });

    it("Stress 2.8: updatePotProfile state reducer clamping and pot validation", () => {
      const run = createValidBaseRun();

      // Negative tare inputs clamped to 0
      const updatedRun = updatePotProfile(run, {
        type: "airpot",
        nominalVolumeLiters: -5,
        emptyMassGrams: -100,
        saturatedMassGrams: -500,
        diameterCm: 30,
        heightCm: 30,
        actualFillLiters: null,
      });

      expect(updatedRun.config.pot.nominalVolumeLiters).toBe(0.1); // clamped to 0.1
      expect(updatedRun.config.pot.emptyMassGrams).toBe(0); // clamped to 0
      expect(updatedRun.config.pot.saturatedMassGrams).toBe(0); // clamped to 0
      expect(updatedRun.config.pot.type).toBe("airpot");
    });

    it("Stress 2.9: Fuzz testing calculateSubstrateHydration with 500 pseudo-random inputs", () => {
      for (let i = 0; i < 500; i++) {
        const empty = Math.random() * 5000;
        const sat = Math.random() * 10000;
        const current = Math.random() * 12000;

        const pot: PotProfile = {
          type: "other",
          nominalVolumeLiters: 10,
          actualFillLiters: 10,
          diameterCm: null,
          heightCm: null,
          emptyMassGrams: empty,
          saturatedMassGrams: sat,
        };

        const res = calculateSubstrateHydration(current, pot);
        expect(["VALID", "UNKNOWN", "INSUFFICIENT_DATA"]).toContain(res.state);

        if (res.state === "VALID") {
          expect(res.hydrationPercent).not.toBeNull();
          expect(res.depletionPercent).not.toBeNull();
          expect(res.hydrationPercent! + res.depletionPercent!).toBe(100);
          expect(res.hydrationPercent!).toBeGreaterThanOrEqual(0);
          expect(res.hydrationPercent!).toBeLessThanOrEqual(100);
          expect(res.availableWaterGrams!).toBeGreaterThanOrEqual(0);
          expect(["dry", "light", "medium", "heavy", "saturated"]).toContain(
            res.category,
          );
        }
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 3. RAPID MODE TOGGLING (SIMULATION <-> LIVE) & AUDIT TRAIL INTEGRITY
  // ═════════════════════════════════════════════════════════════════════════
  describe("3. Rapid Mode Toggling (Simulation <-> Live) & Audit Trail Integrity", () => {
    it("Stress 3.1: updateExecutionMode is strictly idempotent for same-mode calls", () => {
      const run = createValidBaseRun();
      expect(run.executionMode).toBe("simulation" as const);

      const simAgain = updateExecutionMode(run, "simulation");
      expect(simAgain).toBe(run); // same object reference
      expect(simAgain.auditEvents.length).toBe(run.auditEvents.length);
    });

    it("Stress 3.2: transitioning draft run to live activates status, liveAnchor, and clock health", () => {
      const draftRun = createValidBaseRun();
      expect(draftRun.status).toBe("draft");
      expect(draftRun.liveAnchor == null).toBe(true);

      const liveRun = updateExecutionMode(draftRun, "live");
      expect(liveRun.executionMode).toBe("live");
      expect(liveRun.status).toBe("active");
      expect(liveRun.liveAnchor).toBeDefined();
      expect(liveRun.liveAnchor?.kind).toBe(liveRun.config.dayZeroAnchor);
      expect(liveRun.clockHealth.status).toBe("healthy");
      expect(liveRun.auditEvents[0].action).toBe("live-started");
      expect(liveRun.domainEvents[0].type).toBe("live.started");
    });

    it("Stress 3.3: rapid 10-cycle oscillation maintains audit integrity, uniqueness, and config immutability", () => {
      let currentRun = createValidBaseRun();
      const initialSnapshotId = currentRun.configurationSnapshot.id;
      const initialGenetics = currentRun.config.genetics;
      const initialAuditCount = currentRun.auditEvents.length;
      const initialDomainCount = currentRun.domainEvents.length;

      const modeSequence: Array<"live" | "simulation"> = [
        "live",
        "simulation",
        "live",
        "simulation",
        "live",
        "simulation",
        "live",
        "simulation",
        "live",
        "simulation",
      ];

      for (const targetMode of modeSequence) {
        currentRun = updateExecutionMode(currentRun, targetMode);
        expect(currentRun.executionMode).toBe(targetMode);
      }

      // Audit events strictly grew by 10
      expect(currentRun.auditEvents.length).toBe(initialAuditCount + 10);
      expect(currentRun.domainEvents.length).toBe(initialDomainCount + 10);

      // All audit event IDs are distinct
      const auditIds = currentRun.auditEvents.map((a) => a.id);
      const uniqueAuditIds = new Set(auditIds);
      expect(uniqueAuditIds.size).toBe(auditIds.length);

      // Immutable snapshot was never altered
      expect(currentRun.configurationSnapshot.id).toBe(initialSnapshotId);
      expect(currentRun.configurationSnapshot.immutable).toBe(true);

      // Configuration was preserved perfectly
      expect(currentRun.config.genetics).toBe(initialGenetics);
      expect(currentRun.config.tentWidthCm).toBe(60);
      expect(currentRun.config.ledMaxW).toBe(140);
    });

    it("Stress 3.4: evaluateLiveClock handles clock rollback and future anchors without crashing", () => {
      const run = createValidBaseRun();
      const liveRun = updateExecutionMode(run, "live");

      // Set a fixed baseline for clock health and live anchor: 2026-08-10 start date, 2026-08-15 observation
      const calibratedLiveRun: RunPackage = {
        ...liveRun,
        liveAnchor: {
          id: "test-anchor-1",
          kind: "seed-planted",
          startedAtUtc: "2026-08-10T00:00:00.000Z",
          confirmedAtUtc: "2026-08-10T00:00:00.000Z",
          timeZoneAtConfirmation: "UTC",
        },
        clockHealth: {
          status: "healthy",
          lastObservedAtUtc: "2026-08-15T00:00:00.000Z",
          detail: null,
        },
      };

      // 1. Normal forward evaluation: now = 2026-08-20 (10 days since start date)
      const normalEval = evaluateLiveClock(
        calibratedLiveRun,
        new Date("2026-08-20T12:00:00Z"),
      );
      expect(normalEval.blocked).toBe(false);
      expect(normalEval.day).toBe(10);
      expect(normalEval.health.status).toBe("healthy");

      // 2. Future anchor evaluation (system time earlier than start date)
      const futureAnchorRun: RunPackage = {
        ...calibratedLiveRun,
        liveAnchor: {
          ...calibratedLiveRun.liveAnchor!,
          startedAtUtc: "2026-09-01T00:00:00Z",
        },
      };
      const futureEval = evaluateLiveClock(
        futureAnchorRun,
        new Date("2026-08-20T12:00:00Z"),
      );
      expect(futureEval.blocked).toBe(true);
      expect(futureEval.day).toBe(0);
      expect(futureEval.health.status).toBe("blocked-before-anchor");

      // 3. System clock rollback evaluation (nowMs jumped backward before lastObservedAtUtc)
      const rolledBackEval = evaluateLiveClock(
        calibratedLiveRun,
        new Date("2026-08-14T00:00:00Z"), // 1 day backward from 2026-08-15
      );
      expect(rolledBackEval.blocked).toBe(true);
      expect(rolledBackEval.health.status).toBe("blocked-clock-rollback");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 4. RETROACTIVE PLANT MILESTONES (PAST, FUTURE, SWAPPED DATES)
  // ═════════════════════════════════════════════════════════════════════════
  describe("4. Retroactive Plant Milestones Updates & Edge Cases", () => {
    it("Stress 4.1: updates potting and emergence dates with chronological ordering", () => {
      const run = createValidBaseRun();
      const milestones: PlantMilestones = {
        pottingDateIso: "2026-08-01",
        emergenceDateIso: "2026-08-05",
        dayZeroAnchor: "emergence",
      };

      const updated = updatePlantMilestones(
        run,
        milestones,
        "Erste Meilenstein-Erfassung",
      );

      expect(updated.config.startDate).toBe("2026-08-05");
      expect(updated.config.dayZeroAnchor).toBe("emergence");

      const growthEvents = updated.growthEvents || [];
      const pottingEv = growthEvents.find((e) => e.kind === "seed-planted");
      const emergenceEv = growthEvents.find((e) => e.kind === "emergence");

      expect(pottingEv?.occurredAt).toContain("2026-08-01");
      expect(emergenceEv?.occurredAt).toContain("2026-08-05");

      // Calculate biological plant age
      const age = calculateBiologicalPlantAge(
        "emergence",
        growthEvents,
        new Date("2026-08-15T00:00:00Z"),
      );
      expect(age.biologicalAgeDays).toBe(10); // 2026-08-05 to 2026-08-15
      expect(age.germinationDays).toBe(4); // 2026-08-01 to 2026-08-05
    });

    it("Stress 4.2: handles swapped dates (emergence before potting) without negative days or exceptions", () => {
      const run = createValidBaseRun();
      const swappedMilestones: PlantMilestones = {
        pottingDateIso: "2026-08-10",
        emergenceDateIso: "2026-08-02", // Emergence earlier than potting!
        dayZeroAnchor: "emergence",
      };

      const updated = updatePlantMilestones(
        run,
        swappedMilestones,
        "Getauschte Daten Test",
      );
      const growthEvents = updated.growthEvents || [];

      const age = calculateBiologicalPlantAge(
        "emergence",
        growthEvents,
        new Date("2026-08-15T00:00:00Z"),
      );
      expect(age.biologicalAgeDays).toBe(13); // 2026-08-02 to 2026-08-15
      expect(age.germinationDays).toBe(0); // Clamped via Math.max(0, ...)

      // Render panel to verify no negative days in UI
      const html = renderToString(
        <RunConfigPanel run={updated} lens="expert" onUpdateRun={() => {}} />,
      );
      expect(html).toContain("Tag <!-- -->");
      expect(html).not.toContain("Tag -");
    });

    it("Stress 4.3: handles future emergence date clamping biological age to 0", () => {
      const run = createValidBaseRun();
      const futureMilestones: PlantMilestones = {
        pottingDateIso: "2026-08-25",
        emergenceDateIso: "2026-08-30",
        dayZeroAnchor: "emergence",
      };

      const updated = updatePlantMilestones(
        run,
        futureMilestones,
        "Zukünftige Daten Test",
      );
      const age = calculateBiologicalPlantAge(
        "emergence",
        updated.growthEvents || [],
        new Date("2026-08-20T00:00:00Z"),
      );
      expect(age.biologicalAgeDays).toBe(0); // Clamped to 0
      expect(age.operationalAgeDays).toBe(0);
    });

    it("Stress 4.4: handles distant past emergence date (200 days ago) without out-of-bounds crash", () => {
      const run = createValidBaseRun();
      const pastMilestones: PlantMilestones = {
        pottingDateIso: "2026-01-01",
        emergenceDateIso: "2026-01-05",
        dayZeroAnchor: "emergence",
      };

      const updated = updatePlantMilestones(
        run,
        pastMilestones,
        "Vergangenheit Test",
      );
      const age = calculateBiologicalPlantAge(
        "emergence",
        updated.growthEvents || [],
        new Date("2026-08-20T00:00:00Z"),
      );
      expect(age.biologicalAgeDays).toBeGreaterThan(200);

      // Test that getDayPlan bounds check prevents crash for day > 80
      const workbook = {
        "02_Daily_Master": {
          range: "A1:Z82",
          values: Array.from({ length: 82 }, (_, i) => [
            i === 0 ? "Day" : i - 1,
            "2026-01-01",
            1,
            "",
            "Veg",
            "Goal",
            18,
            140,
            500,
            32.4,
          ]),
          formulas: Array.from({ length: 82 }, () => []),
        },
      };

      const clampedPlan = getDayPlan(workbook, age.biologicalAgeDays);
      expect(clampedPlan.day).toBe(80); // clamped to max row 80
    });

    it("Stress 4.5: tracks liveAnchor revisions when milestones are adjusted in Live mode", () => {
      const base = createValidBaseRun();
      const liveRun = updateExecutionMode(base, "live");
      expect(liveRun.anchorRevisions.length).toBe(0);
      expect(liveRun.liveAnchor?.startedAtUtc).toContain("2026-08-10");

      // Retroactive update 1: change start date to 2026-08-12
      const updated1 = updatePlantMilestones(
        liveRun,
        {
          emergenceDateIso: "2026-08-12",
          dayZeroAnchor: "emergence",
        },
        "Korrektur 1: Keimung 2 Tage später",
      );

      expect(updated1.anchorRevisions.length).toBe(1);
      expect(updated1.anchorRevisions[0].previousStartedAtUtc).toContain(
        "2026-08-10",
      );
      expect(updated1.anchorRevisions[0].nextStartedAtUtc).toContain(
        "2026-08-12",
      );
      expect(updated1.anchorRevisions[0].reason).toBe(
        "Korrektur 1: Keimung 2 Tage später",
      );
      expect(updated1.liveAnchor?.startedAtUtc).toContain("2026-08-12");

      // Retroactive update 2: change start date to 2026-08-08
      const updated2 = updatePlantMilestones(
        updated1,
        {
          emergenceDateIso: "2026-08-08",
          dayZeroAnchor: "emergence",
        },
        "Korrektur 2: Tatsächliche Keimung vorgezogen",
      );

      expect(updated2.anchorRevisions.length).toBe(2);
      expect(updated2.anchorRevisions[0].previousStartedAtUtc).toContain(
        "2026-08-12",
      );
      expect(updated2.anchorRevisions[0].nextStartedAtUtc).toContain(
        "2026-08-08",
      );
      expect(updated2.anchorRevisions[0].reason).toBe(
        "Korrektur 2: Tatsächliche Keimung vorgezogen",
      );
    });

    it("Stress 4.6: handles invalid date strings gracefully without throwing", () => {
      const run = createValidBaseRun();
      const invalidMilestones: PlantMilestones = {
        pottingDateIso: "invalid-date-string",
        emergenceDateIso: "not-a-real-date",
        dayZeroAnchor: "emergence",
      };

      const updated = updatePlantMilestones(
        run,
        invalidMilestones,
        "Ungültige Daten",
      );
      expect(updated).toBeDefined();
      expect(updated.config.startDate).toBe("2026-08-10"); // kept fallback
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 5. FULL UI INTEGRATION & FAIL-CLOSED READINESS GATE AUDIT
  // ═════════════════════════════════════════════════════════════════════════
  describe("5. Full UI Integration, Lens Adaptation & Fail-Closed Gate", () => {
    const lenses: ExperienceLens[] = ["guided", "advanced", "expert"];

    it.each(lenses)(
      "Stress 5.1: renders RunConfigPanel without crash across %s lens",
      (lens) => {
        const run = createValidBaseRun();
        const html = renderToString(
          <RunConfigPanel
            run={run}
            lens={lens}
            onUpdateRun={() => {}}
            navigate={() => {}}
          />,
        );

        expect(html).toContain("UKD MASTER SETUP CENTER 2026");
        expect(html).toContain("1. Genetik &amp; Cultivar-Auswahl");
        expect(html).toContain("2. Zeitachse, Modus &amp; Meilensteine");
        expect(html).toContain("3. Zelt-Geometrie &amp; Raum-Dimensionen");
        expect(html).toContain("4. Beleuchtung &amp; Photobiologie");
        expect(html).toContain("5. Pflanztopf &amp; Substrat-Hydratation");
        expect(html).toContain("6. Abluft, Umluft &amp; Klimasteuerung");
        expect(html).toContain("7. Wasserchemie &amp; Ausgangswasser");
        expect(html).toContain("8. Nährstofflinie &amp; KCanG-Konformität");
      },
    );

    it("Stress 5.2: Invariant 4 Fail-Closed Gate blocks incomplete water profiles", () => {
      const run = createValidBaseRun();

      // Strip water profile
      const unverifiedWater: WaterProfile = {
        sourceType: "municipal",
        sourceDescription: "",
        sourcePh: null,
        sourceEc: null,
        calciumMgL: null,
        magnesiumMgL: null,
        alkalinityMgL: null,
        sodiumMgL: null,
        chlorideMgL: null,
        sulfateMgL: null,
        verified: false,
      };

      const incompleteRun = {
        ...run,
        config: { ...run.config, water: unverifiedWater },
      };
      const readiness = calculateReadinessScore(incompleteRun.config);

      expect(readiness.isReady).toBe(false);
      expect(readiness.score).toBe(80); // 4 out of 5 categories fulfilled
      expect(readiness.missingItems).toEqual([
        "Wasser-pH fehlt",
        "Wasser-EC fehlt",
        "Calcium (mg/L) fehlt",
        "Magnesium (mg/L) fehlt",
      ]);

      const html = renderToString(
        <RunConfigPanel
          run={incompleteRun}
          lens="expert"
          onUpdateRun={() => {}}
        />,
      );
      expect(html).toContain(
        "FAIL-CLOSED READINESS GATE: UNVOLLSTÄNDIG (Score: 80%)",
      );
      expect(html).toContain(
        "Sperre aktiv — Bitte Konfiguration vervollständigen",
      );
    });

    it("Stress 5.3: Activating run when ready creates immutable configuration snapshot", () => {
      const run = createValidBaseRun();
      expect(run.status).toBe("draft");

      const activated = activateRun(run);
      expect(activated.status).toBe("active");
      expect(activated.configurationSnapshot.immutable).toBe(true);
      expect(activated.configurationSnapshot.evidenceVersion).toBe(
        "v11.5 Evidence-Guarded · app-aligned 2026-08-23",
      );
    });
  });
});
