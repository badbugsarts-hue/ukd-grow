import { describe, expect, it } from "vitest";
import {
  displayMeasurement,
  formatLocalDateTime,
  toCanonicalSi,
} from "./localization";

describe("localization and canonical SI storage", () => {
  it.each([
    [25, "temperature", 77],
    [60, "length", 23.6220472441],
    [10, "volume", 2.6417205236],
    [500, "small-volume", 16.9070112795],
    [100, "mass", 3.527396195],
  ] as const)("roundtrips %s %s", (si, quantity, imperial) => {
    expect(toCanonicalSi(imperial, quantity, "imperial")).toBeCloseTo(si, 5);
  });
  it("uses regional decimal formats", () => {
    expect(displayMeasurement(25.5, "temperature", "si", "de-DE")).toBe(
      "25,5 °C",
    );
    expect(displayMeasurement(25.5, "temperature", "si", "en-US")).toBe(
      "25.5 °C",
    );
  });
  it("formats UTC with an explicit timezone", () => {
    expect(
      formatLocalDateTime("2026-08-18T12:00:00Z", "en-US", "UTC"),
    ).toContain("12:00");
  });
});
