import { describe, expect, it } from "vitest";
import {
  mapAndValidate,
  parseLocaleNumber,
  type ProbeResult,
} from "./file-connector";

const mapping = {
  timestamp: "time",
  metric: "metric",
  value: "value",
  unit: "unit",
  deviceId: "device",
  source: "source",
};

describe("file connector", () => {
  it.each([
    ["1,42", 1.42],
    ["1.234,56", 1234.56],
    ["1,234.56", 1234.56],
  ])("parses locale number %s", (input, expected) =>
    expect(parseLocaleNumber(input)).toBe(expected),
  );
  it("blocks missing units, duplicates and metric/unit mismatches", () => {
    const probe: ProbeResult = {
      format: "json",
      columns: Object.values(mapping),
      fileSha256: "ABC",
      rows: [
        {
          time: "2026-08-18T10:00:00+02:00",
          metric: "water.ph",
          value: "5,9",
          unit: "pH",
          device: "meter-1",
          source: "manual-file",
        },
        {
          time: "2026-08-18T10:00:00+02:00",
          metric: "water.ph",
          value: "5,9",
          unit: "pH",
          device: "meter-1",
          source: "manual-file",
        },
        {
          time: "2026-08-18T11:00:00+02:00",
          metric: "water.ec",
          value: "1.2",
          unit: "°C",
          device: "meter-1",
          source: "manual-file",
        },
      ],
    };
    const batch = mapAndValidate(probe, "measurements.json", mapping);
    expect(batch.status).toBe("blocked");
    expect(batch.records).toHaveLength(1);
    expect(batch.findings.map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["duplicate-row", "unit-mismatch"]),
    );
  });
});
