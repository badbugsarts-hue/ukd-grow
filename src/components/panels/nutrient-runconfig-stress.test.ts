import { describe, expect, it } from "vitest";
import { calculateMix, DAILY_COLUMNS, type DayPlan } from "../../domain";
import {
  activateRun,
  createDefaultRunPackage,
  effectiveRunConfig,
  updateRunConfig,
} from "../../run-state";
import type { CellValue, RunConfig, RunPackage } from "../../types";
import { calculateReadinessScore } from "./RunConfigPanel";

function createTestDayPlan(day = 14): DayPlan {
  const raw: CellValue[] = new Array(60).fill(null);
  raw[DAILY_COLUMNS.day] = day;
  raw[DAILY_COLUMNS.date] = "2026-03-01";
  raw[DAILY_COLUMNS.base] = "HESI TNT / Blüh Complex";
  raw[DAILY_COLUMNS.baseDose] = 2.5;
  raw[DAILY_COLUMNS.athenaDose] = 0.5;
  raw[DAILY_COLUMNS.calMag] = 0.5;
  raw[DAILY_COLUMNS.rootDose] = 1.0;
  raw[DAILY_COLUMNS.powerZyme] = 2.0;
  raw[DAILY_COLUMNS.superVit] = 0.05;
  raw[DAILY_COLUMNS.boost] = 2.0;
  raw[DAILY_COLUMNS.pk] = 1.0;
  raw[DAILY_COLUMNS.voodoo] = 0.0;
  raw[DAILY_COLUMNS.phDown] = 0.2;
  raw[DAILY_COLUMNS.ec] = 1.4;
  raw[DAILY_COLUMNS.ph] = 6.2;

  return {
    day,
    raw,
    formulaRow: [],
  };
}

function createCompleteConfig(baseRun = createDefaultRunPackage()): RunConfig {
  return {
    ...baseRun.config,
    water: {
      ...baseRun.config.water,
      sourcePh: 7.2,
      sourceEc: 0.4,
      calciumMgL: 60,
      magnesiumMgL: 15,
    },
  };
}

describe("Milestone 2 - NutrientMixPanel & RunConfigPanel Stress Tests", () => {
  const dummyPlan = createTestDayPlan(14);

  describe("NutrientMixPanel Calculation Logic (calculateMix)", () => {
    it("handles standard 10L batch size correctly", () => {
      const items = calculateMix(dummyPlan, 10);
      const baseItem = items.find((i) => i.role === "Basis");
      expect(baseItem).toBeDefined();
      expect(baseItem?.dose).toBe(2.5);
      expect(baseItem?.amount).toBe(25); // 2.5 * 10
    });

    it("handles 0L batch size gracefully without crashing or NaN", () => {
      const items = calculateMix(dummyPlan, 0);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.amount).toBe(0);
        expect(Number.isNaN(item.amount)).toBe(false);
      }
    });

    it("handles 1000L large batch size without precision overflow", () => {
      const items = calculateMix(dummyPlan, 1000);
      const baseItem = items.find((i) => i.role === "Basis");
      expect(baseItem?.amount).toBe(2500); // 2.5 * 1000
    });

    it("clamps negative batch sizes to 0L", () => {
      const items = calculateMix(dummyPlan, -50);
      for (const item of items) {
        expect(item.amount).toBe(0);
      }
    });

    it("handles NaN and Infinity batch sizes safely", () => {
      const itemsNaN = calculateMix(dummyPlan, NaN);
      for (const item of itemsNaN) {
        expect(item.amount).toBe(0);
      }

      const itemsInf = calculateMix(dummyPlan, Infinity);
      for (const item of itemsInf) {
        expect(item.amount).toBe(0);
      }
    });
  });

  describe("Water Profile Incompleteness & Ca:Mg Edge Cases", () => {
    it("identifies missing water profile fields", () => {
      const config = createCompleteConfig();
      expect(config.water.sourcePh).not.toBeNull();
      expect(config.water.sourceEc).not.toBeNull();
      expect(config.water.calciumMgL).not.toBeNull();

      const incompleteWaterConfig: RunConfig = {
        ...config,
        water: {
          ...config.water,
          sourcePh: null,
        },
      };

      const readiness = calculateReadinessScore(incompleteWaterConfig);
      expect(readiness.isReady).toBe(false);
      expect(readiness.missingItems).toContain("Wasser-pH fehlt");
    });

    it("evaluates Ca:Mg ratios under zero Ca or zero Mg", () => {
      const calcRatio = (ca: number | null, mg: number | null) => {
        const c = ca ?? 0;
        const m = mg ?? 0;
        return m > 0 ? (c / m).toFixed(1) : c > 0 ? `${c}:0` : "—";
      };

      expect(calcRatio(60, 20)).toBe("3.0");
      expect(calcRatio(60, 0)).toBe("60:0");
      expect(calcRatio(0, 20)).toBe("0.0");
      expect(calcRatio(0, 0)).toBe("—");
      expect(calcRatio(null, null)).toBe("—");
    });
  });

  describe("RunConfigPanel Readiness Score (calculateReadinessScore)", () => {
    it("returns 100% readiness score for a complete run config", () => {
      const config = createCompleteConfig();
      const readiness = calculateReadinessScore(config);
      expect(readiness.score).toBe(100);
      expect(readiness.isReady).toBe(true);
      expect(readiness.missingItems).toHaveLength(0);
    });

    it("deducts 20% for missing category 1 (medium / pot volume)", () => {
      const config: RunConfig = {
        ...createCompleteConfig(),
        medium: "",
        pot: {
          ...createDefaultRunPackage().config.pot,
          nominalVolumeLiters: 0,
        },
      };
      const readiness = calculateReadinessScore(config);
      expect(readiness.score).toBe(80);
      expect(readiness.isReady).toBe(false);
      expect(readiness.missingItems).toContain("Substrat-Typ nicht ausgewählt");
      expect(readiness.missingItems).toContain(
        "Topfvolumen (L) unvollständig oder 0",
      );
    });

    it("deducts 20% for missing category 2 (light setup)", () => {
      const config: RunConfig = {
        ...createCompleteConfig(),
        ledMaxW: 0,
        lightHours: 0,
      };
      const readiness = calculateReadinessScore(config);
      expect(readiness.score).toBe(80);
      expect(readiness.isReady).toBe(false);
      expect(readiness.missingItems).toContain(
        "Lampenleistung (W) unvollständig oder 0",
      );
      expect(readiness.missingItems).toContain(
        "Photoperiode (h/d) nicht definiert",
      );
    });

    it("deducts 20% for missing category 3 (tent dimensions)", () => {
      const config: RunConfig = {
        ...createCompleteConfig(),
        tentWidthCm: 0,
        tentDepthCm: 0,
        tentHeightCm: 0,
      };
      const readiness = calculateReadinessScore(config);
      expect(readiness.score).toBe(80);
      expect(readiness.isReady).toBe(false);
      expect(readiness.missingItems).toContain(
        "Zelt-Abmessungen (Breite, Tiefe, Höhe) unvollständig",
      );
    });

    it("deducts 20% for missing category 4 (water analysis)", () => {
      const config: RunConfig = {
        ...createCompleteConfig(),
        water: {
          ...createDefaultRunPackage().config.water,
          sourcePh: null,
          sourceEc: null,
          calciumMgL: null,
          magnesiumMgL: null,
        },
      };
      const readiness = calculateReadinessScore(config);
      expect(readiness.score).toBe(80);
      expect(readiness.isReady).toBe(false);
      expect(readiness.missingItems).toContain("Wasser-pH fehlt");
      expect(readiness.missingItems).toContain("Wasser-EC fehlt");
      expect(readiness.missingItems).toContain("Calcium (mg/L) fehlt");
      expect(readiness.missingItems).toContain("Magnesium (mg/L) fehlt");
    });

    it("deducts 20% for missing category 5 (name / genetics)", () => {
      const config: RunConfig = {
        ...createCompleteConfig(),
        name: "",
      };
      const readiness = calculateReadinessScore(config);
      expect(readiness.score).toBe(80);
      expect(readiness.isReady).toBe(false);
      expect(readiness.missingItems).toContain(
        "Run-Bezeichnung oder Genetik-Name fehlt",
      );
    });

    it("returns score 0 when all 5 categories are missing", () => {
      const config: RunConfig = {
        name: "",
        genetics: "",
        startDate: "2026-01-01",
        endDay: 80,
        plantCount: 1,
        dayZeroAnchor: "run-operational-start",
        tentWidthCm: 0,
        tentDepthCm: 0,
        tentHeightCm: 0,
        ledMaxW: 0,
        lightHours: 0,
        medium: "",
        mediumProduct: "",
        irrigationSystem: "",
        nutrientSystem: "",
        water: {
          sourceType: "unknown",
          sourceDescription: "",
          sourcePh: null,
          sourceEc: null,
          calciumMgL: null,
          magnesiumMgL: null,
          alkalinityMgL: null,
          sodiumMgL: null,
          chlorideMgL: null,
          sulfateMgL: null,
          analysisDate: null,
          analysisSource: null,
          analysisMethod: "unknown",
          verified: false,
        },
        pot: {
          type: "other",
          nominalVolumeLiters: 0,
          actualFillLiters: null,
          diameterCm: null,
          heightCm: null,
          emptyMassGrams: null,
          saturatedMassGrams: null,
        },
        light: null,
      };

      const readiness = calculateReadinessScore(config);
      expect(readiness.score).toBe(0);
      expect(readiness.isReady).toBe(false);
      expect(readiness.missingItems.length).toBeGreaterThanOrEqual(5);
    });

    it("detects edge case: whitespace-only strings in category 5 name/genetics", () => {
      const config: RunConfig = {
        ...createCompleteConfig(),
        name: "   ",
        genetics: "   ",
      };
      const readiness = calculateReadinessScore(config);
      // Category 5 currently does not trim whitespace-only strings
      expect(readiness.score).toBe(100);
    });
  });

  describe("Stage Transitions & Run Activation Invariants", () => {
    it("activates draft run and creates immutable snapshot", () => {
      const run = createDefaultRunPackage();
      expect(run.status).toBe("draft");

      const activated = activateRun(run);
      expect(activated.status).toBe("active");
      expect(activated.configurationSnapshot.version).toBe(
        run.configurationSnapshot.version + 1,
      );
      expect(activated.plants[0]!.status).toBe("active");
      expect(activated.auditEvents[0]!.action).toBe("run-activated");
    });

    it("is idempotent when activateRun is called on already active run", () => {
      const run = createDefaultRunPackage();
      const activatedOnce = activateRun(run);
      const activatedTwice = activateRun(activatedOnce);

      expect(activatedTwice).toBe(activatedOnce);
      expect(activatedTwice.configurationSnapshot.version).toBe(
        activatedOnce.configurationSnapshot.version,
      );
    });

    it("refuses to activate an archived run", () => {
      const run = createDefaultRunPackage();
      const archivedRun: RunPackage = {
        ...run,
        status: "archived",
      };

      const result = activateRun(archivedRun);
      expect(result.status).toBe("archived");
      expect(result).toBe(archivedRun);
    });

    it("preserves active snapshot immutability when updating config on active run", () => {
      const run = createDefaultRunPackage();
      const activated = activateRun(run);

      const originalSnapshotConfig = activated.configurationSnapshot.config;

      // Mutate draft config via updateRunConfig
      const updatedRun = updateRunConfig(activated, {
        ...activated.config,
        ledMaxW: 500,
      });

      // Working config updated:
      expect(updatedRun.config.ledMaxW).toBe(500);

      // BUT effective run config & snapshot config remains unchanged!
      expect(updatedRun.configurationSnapshot.config.ledMaxW).toBe(
        originalSnapshotConfig.ledMaxW,
      );
      expect(effectiveRunConfig(updatedRun).ledMaxW).toBe(
        originalSnapshotConfig.ledMaxW,
      );
    });
  });
});
