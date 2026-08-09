import { describe, expect, it } from "vitest";
import { DAILY_COLUMNS, type DayPlan as DomainDayPlan } from "./domain";
import {
  addInventoryEvent,
  addObservation,
  acknowledgeAlert,
  createDefaultRunPackage,
  createObservation,
  deriveRunAlerts,
  inventoryBalance,
  runToCsv,
  setTaskCompleted,
  validateRunPackage,
} from "./run-state";

function plan(day = 4): DomainDayPlan {
  const raw: DomainDayPlan["raw"] = Array.from({ length: 45 }, () => null);
  raw[DAILY_COLUMNS.day] = day;
  raw[DAILY_COLUMNS.ph] = 5.9;
  raw[DAILY_COLUMNS.ec] = 0.8;
  return { day, raw, formulaRow: [] };
}

describe("versioned run state", () => {
  it("creates a complete v1 package with explicit missing water values", () => {
    const run = createDefaultRunPackage(new Date("2026-08-09T12:00:00Z"));
    expect(run.schemaVersion).toBe("1.0.0");
    expect(run.config.startDate).toBe("2026-08-09");
    expect(run.config.water.sourcePh).toBeNull();
    expect(validateRunPackage(run).ok).toBe(true);
  });

  it("rejects incompatible or incomplete imports", () => {
    expect(validateRunPackage({ schemaVersion: "2.0.0" })).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        expect.stringContaining("nicht unterstützt"),
      ]),
    });
  });

  it("persists observations as measurements and log events", () => {
    const run = createDefaultRunPackage();
    const observation = createObservation(4, new Date("2026-08-09T13:00:00Z"));
    observation.values.phIn = 6.5;
    const next = addObservation(run, observation);
    expect(next.observations).toHaveLength(1);
    expect(next.events[0]?.category).toBe("measurement");
  });

  it("derives missing baseline and critical pH alerts", () => {
    let run = createDefaultRunPackage();
    const observation = createObservation(4);
    observation.values.phIn = 6.5;
    run = addObservation(run, observation);
    const alerts = deriveRunAlerts(run, plan(), new Date());
    expect(alerts.map((alert) => alert.id)).toContain("day-4-ph-deviation");
    expect(alerts.map((alert) => alert.id)).toContain("water-baseline-missing");
  });

  it("stores checklist and acknowledgement state without duplicates", () => {
    let run = createDefaultRunPackage();
    run = setTaskCompleted(run, 4, "Drain prüfen", true);
    run = setTaskCompleted(run, 4, "Drain prüfen", true);
    run = acknowledgeAlert(run, "alert-1");
    run = acknowledgeAlert(run, "alert-1");
    expect(run.completedTasks["4"]).toEqual(["Drain prüfen"]);
    expect(run.acknowledgedAlertIds).toEqual(["alert-1"]);
  });

  it("calculates separated inventory transitions", () => {
    let run = createDefaultRunPackage();
    run = addInventoryEvent(run, {
      id: "in",
      occurredAt: "2026-08-09T12:00:00Z",
      type: "harvest-dry",
      grams: 20,
      legalBasis: "kcang-private",
      note: "",
      evidenceReference: "",
    });
    run = addInventoryEvent(run, {
      id: "out",
      occurredAt: "2026-08-09T13:00:00Z",
      type: "destruction",
      grams: 7.5,
      legalBasis: "kcang-private",
      note: "",
      evidenceReference: "",
    });
    expect(inventoryBalance(run)).toBe(12.5);
  });

  it("exports observations as escaped CSV", () => {
    let run = createDefaultRunPackage();
    const observation = createObservation(1);
    observation.notes = 'A, "B"';
    run = addObservation(run, observation);
    const csv = runToCsv(run);
    expect(csv).toContain('"day"');
    expect(csv).toContain('"A, ""B"""');
  });
});
