import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  calculateDli,
  calculateLeafVpd,
  calculateMix,
  formatExcelDate,
  getDayPlan,
} from "./domain";
import type { Workbook } from "./types";

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

  it("scales mix amounts without changing the canonical dose", () => {
    const mix = calculateMix(getDayPlan(workbook, 4), 5);
    expect(mix.find((item) => item.name === "HESI TNT")?.amount).toBe(6.25);
    expect(mix.find((item) => item.name === "Wurzel Complex")?.amount).toBe(
      12.5,
    );
  });
});
