import { describe, expect, it } from "vitest";
import { resolvePlantBatches } from "./domain";
import type { GrowthEvent, Plant } from "./types";

const plant: Plant = {
  id: "p1",
  zoneId: "z1",
  label: "P1",
  genetics: "Double Grape Auto",
  status: "active",
  identity: {
    breeder: "Mephisto Genetics",
    seedType: "autoflower",
    seedLot: null,
    packBatch: null,
    sourceDate: null,
    phenotypeNotes: "",
  },
};

function event(kind: GrowthEvent["kind"], day: number): GrowthEvent {
  return {
    id: `${kind}-${day}`,
    plantId: plant.id,
    kind,
    occurredAt: new Date(Date.UTC(2026, 7, 21 + day)).toISOString(),
    day,
    observedBy: "user",
    confidence: "confirmed",
    notes: "",
    photoIds: [],
  };
}

describe("mixed-run event-gated batch resolver", () => {
  it("does not infer feed readiness from calendar age", () => {
    const result = resolvePlantBatches(
      [plant],
      [event("seed-planted", 0)],
      "seed-planted",
      new Date("2026-10-20T00:00:00Z"),
    )[0];
    expect(result.biologicalAgeDays).toBeGreaterThan(30);
    expect(result.stage).toBe("pre-emergence");
    expect(result.feedEligible).toBe(false);
    expect(result.assignedBatch).toBe("blocked");
  });

  it("requires emergence, nutrient uptake and root-zone state", () => {
    const result = resolvePlantBatches(
      [plant],
      [
        event("seed-planted", 0),
        event("emergence", 2),
        event("nutrient-uptake-ready", 6),
        event("root-zone-final-coco", 12),
      ],
      "emergence",
      new Date("2026-09-10T00:00:00Z"),
    )[0];
    expect(result.feedEligible).toBe(true);
    expect(result.assignedBatch).toBe("common");
    expect(result.workingPh).toBe(6);
  });

  it("switches to a split bloom batch only after confirmed flower onset", () => {
    const result = resolvePlantBatches(
      [plant],
      [
        event("emergence", 2),
        event("nutrient-uptake-ready", 6),
        event("root-zone-final-coco", 12),
        event("flower-onset", 31),
      ],
      "emergence",
      new Date("2026-09-25T00:00:00Z"),
    )[0];
    expect(result.stage).toBe("bloom");
    expect(result.assignedBatch).toBe("bloom_split");
  });
});
