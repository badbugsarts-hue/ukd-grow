import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  calculateDli,
  calculateLeafVpd,
  calculateMix,
  excelSerialToDate,
  formatExcelDate,
  getDailySheet,
  getDayPlan,
  normalizedRows,
  numberAt,
  textAt,
} from "./domain";
import type { Workbook, WorkbookSheet } from "./types";

const workbook = JSON.parse(
  readFileSync(
    new URL(
      "../public/data/evidence-guarded-workbook-v6.json",
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
    expect(formatExcelDate(plan.raw[1] ?? null)).toBe("08.08.2026");
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
});
