import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  calculateBiologicalPlantAge,
  calculateDli,
  calculateLeafVpd,
  calculateMix,
  calculatePpfdMapSummary,
  calculateSubstrateHydration,
  excelSerialToDate,
  formatExcelDate,
  getDailySheet,
  getDayPlan,
  normalizedRows,
  numberAt,
  textAt,
} from "./domain";
import type {
  GrowthEvent,
  PotProfile,
  PpfdMapPoint,
  Workbook,
  WorkbookSheet,
} from "./types";

const workbook = JSON.parse(
  readFileSync(
    new URL(
      "../public/data/evidence-guarded-workbook-v11_5.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Workbook;

describe("canonical domain calculations", () => {
  it("matches the workbook DLI for day zero", () => {
    expect(calculateDli(160, 18)).toBeCloseTo(10.368, 3);
  });

  it("matches the workbook leaf VPD model for day zero", () => {
    expect(calculateLeafVpd(25, 73, -1)).toBeCloseTo(0.67, 2);
  });

  it("resolves canonical day data and date", () => {
    const plan = getDayPlan(workbook, 0);
    expect(plan.day).toBe(0);
    expect(formatExcelDate(plan.raw[1] ?? null)).toBe("21.08.2026");
  });

  it("clamps invalid and out-of-range day selections", () => {
    expect(getDayPlan(workbook, -20).day).toBe(0);
    expect(getDayPlan(workbook, 200).day).toBe(80);
    expect(getDayPlan(workbook, Number.NaN).day).toBe(0);
    expect(getDayPlan(workbook, 4.6).day).toBe(5);
  });

  it("fails clearly when the canonical daily sheet is missing", () => {
    expect(() => getDailySheet({})).toThrow(
      "Missing canonical sheet 02_Daily_Master",
    );
  });

  it("returns safe numeric and text fallbacks", () => {
    const plan = getDayPlan(workbook, 0);
    expect(numberAt(plan, 999)).toBe(0);
    expect(textAt(plan, 999)).toBe("—");
    expect(textAt(plan, 0)).toBe("0");
  });

  it("converts Excel serials and non-date labels deterministically", () => {
    expect(excelSerialToDate(46242).toISOString()).toBe(
      "2026-08-08T00:00:00.000Z",
    );
    expect(formatExcelDate("manuell")).toBe("manuell");
    expect(formatExcelDate(null)).toBe("—");
  });

  it("scales mix amounts without changing the canonical dose", () => {
    const mix = calculateMix(getDayPlan(workbook, 4), 5);
    expect(mix.find((item) => item.name === "HESI TNT")?.amount).toBe(6.25);
    expect(mix.find((item) => item.name === "Wurzel Complex")?.amount).toBe(
      12.5,
    );
  });

  it("clamps negative or invalid batch volumes to zero", () => {
    const plan = getDayPlan(workbook, 4);
    for (const volume of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        calculateMix(plan, volume).every((item) => item.amount === 0),
      ).toBe(true);
    }
  });

  it("normalizes non-empty workbook rows for search and export", () => {
    const sheet: WorkbookSheet = {
      range: "A1:C3",
      values: [
        ["A", null, 1],
        [null, "", null],
        ["B", true, 0],
      ],
      formulas: [[], [], []],
    };
    expect(normalizedRows(sheet)).toEqual(["A · 1", "B · true · 0"]);
  });

  describe("M1 Domain Engine Extensions", () => {
    describe("calculatePpfdMapSummary", () => {
      it("calculates correct statistics for a uniform grid", () => {
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
        const summary = calculatePpfdMapSummary(points, 45, 100);
        expect(summary.mean).toBe(500);
        expect(summary.min).toBe(500);
        expect(summary.max).toBe(500);
        expect(summary.uniformity).toBe(1.0);
      });

      it("scales PPFD statistics when dimmer is applied", () => {
        const points: PpfdMapPoint[] = [
          { position: "NW", ppfd: 400 },
          { position: "C", ppfd: 800 },
          { position: "SE", ppfd: 600 },
        ];
        const summary = calculatePpfdMapSummary(points, 40, 50);
        expect(summary.mean).toBe(300); // (200 + 400 + 300) / 3
        expect(summary.min).toBe(200);
        expect(summary.max).toBe(400);
        expect(summary.uniformity).toBeCloseTo(0.667, 3);
      });

      it("handles empty grid gracefully", () => {
        const summary = calculatePpfdMapSummary([], 40, 100);
        expect(summary).toEqual({ mean: 0, min: 0, max: 0, uniformity: 0 });
      });
    });

    describe("calculateBiologicalPlantAge", () => {
      it("calculates age based on emergence anchor date", () => {
        const events: GrowthEvent[] = [
          {
            id: "e1",
            plantId: "p1",
            kind: "run-operational-start",
            occurredAt: "2026-08-01T00:00:00Z",
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
            occurredAt: "2026-08-04T00:00:00Z",
            day: 3,
            observedBy: "user",
            confidence: "confirmed",
            notes: "",
            photoIds: [],
          },
        ];
        const now = new Date("2026-08-14T00:00:00Z");
        const age = calculateBiologicalPlantAge("emergence", events, now);
        expect(age.biologicalAgeDays).toBe(10);
        expect(age.operationalAgeDays).toBe(13);
        expect(age.anchorDateString).toBe("2026-08-04T00:00:00Z");
      });

      it("falls back to operational start when requested anchor event is absent", () => {
        const events: GrowthEvent[] = [
          {
            id: "e1",
            plantId: "p1",
            kind: "seed-started",
            occurredAt: "2026-08-01T00:00:00Z",
            day: 0,
            observedBy: "user",
            confidence: "confirmed",
            notes: "",
            photoIds: [],
          },
        ];
        const now = new Date("2026-08-11T00:00:00Z");
        const age = calculateBiologicalPlantAge("emergence", events, now);
        expect(age.biologicalAgeDays).toBe(10);
        expect(age.operationalAgeDays).toBe(10);
      });
    });

    describe("calculateSubstrateHydration", () => {
      const potProfile: PotProfile = {
        type: "fabric",
        nominalVolumeLiters: 11,
        actualFillLiters: 10,
        diameterCm: 25,
        heightCm: 25,
        emptyMassGrams: 1000,
        saturatedMassGrams: 5000,
      };

      it("calculates medium hydration accurately", () => {
        const hydration = calculateSubstrateHydration(3000, potProfile);
        expect(hydration.hydrationPercent).toBe(50);
        expect(hydration.depletionPercent).toBe(50);
        expect(hydration.availableWaterGrams).toBe(2000);
        expect(hydration.category).toBe("medium");
      });

      it("categorizes dry and saturated extremes", () => {
        expect(calculateSubstrateHydration(1000, potProfile).category).toBe(
          "dry",
        );
        expect(calculateSubstrateHydration(5000, potProfile).category).toBe(
          "saturated",
        );
      });

      it("uses volumetric fallback when saturatedMassGrams is missing", () => {
        const partialPot: PotProfile = {
          ...potProfile,
          saturatedMassGrams: null,
        };
        const hydration = calculateSubstrateHydration(4750, partialPot);
        expect(hydration.state).toBe("INSUFFICIENT_DATA");
        expect(hydration.reason).toBe("SATURATION_REFERENCE_MISSING");
      });
    });
  });
});
