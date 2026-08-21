import { describe, expect, it } from "vitest";
import { storagePressureLevel } from "./backup-vault";

describe("backup vault", () => {
  it("meldet die abgestuften Speicherwarnungen", () => {
    expect(storagePressureLevel(69, 100)).toBe(0);
    expect(storagePressureLevel(70, 100)).toBe(70);
    expect(storagePressureLevel(85, 100)).toBe(85);
    expect(storagePressureLevel(96, 100)).toBe(95);
  });
});
