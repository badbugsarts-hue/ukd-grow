import { describe, expect, it } from "vitest";
import { applyRunCommand } from "./run-commands";
import { createDefaultRunPackage, migrateRunPackage } from "./run-state";
import { evaluateLiveClock, LIVE_DAY_MILLISECONDS } from "./live-run";

describe("Live-Run", () => {
  it("klont nur Setup und Profile, aber keine simulierte Historie", () => {
    const source = createDefaultRunPackage(new Date("2026-08-20T10:00:00Z"));
    source.observations.push({
      id: "sim",
      day: 4,
      recordedAt: "2026-08-20T10:00:00Z",
      source: "manual",
      status: "measured",
      values: {
        tempMax: null,
        tempMin: null,
        humidityMax: null,
        humidityMin: null,
        leafTemp: null,
        ppfd: null,
        phIn: null,
        ecIn: null,
        phDrain: null,
        ecDrain: null,
        waterLiters: null,
        drainLiters: null,
        drainPercent: null,
        potMassGrams: null,
        plantHeightCm: null,
        stress: null,
      },
      notes: "simulation",
    });
    const result = applyRunCommand(
      source,
      {
        kind: "live.clone-and-start",
        startedAtUtc: "2026-08-20T09:00:00Z",
        timeZoneAtConfirmation: "Europe/Berlin",
      },
      new Date("2026-08-20T10:00:00Z"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).not.toBe(source.id);
    expect(result.value.sourceSimulationRunId).toBe(source.id);
    expect(result.value.executionMode).toBe("live");
    expect(result.value.observations).toEqual([]);
    expect(result.value.growthEvents).toHaveLength(1);
  });

  it("verwendet exakte 24-Stunden-Grenzen unabhängig von lokaler Mitternacht", () => {
    const source = createDefaultRunPackage(new Date("2026-03-28T08:00:00Z"));
    const result = applyRunCommand(
      source,
      {
        kind: "live.clone-and-start",
        startedAtUtc: "2026-03-28T08:00:00Z",
        timeZoneAtConfirmation: "Europe/Berlin",
      },
      new Date("2026-03-28T08:00:00Z"),
    );
    if (!result.ok) throw new Error("clone failed");
    expect(
      evaluateLiveClock(
        result.value,
        new Date(
          Date.parse("2026-03-28T08:00:00Z") + LIVE_DAY_MILLISECONDS - 1,
        ),
      ).day,
    ).toBe(0);
    expect(
      evaluateLiveClock(
        result.value,
        new Date(Date.parse("2026-03-28T08:00:00Z") + LIVE_DAY_MILLISECONDS),
      ).day,
    ).toBe(1);
  });

  it("zählt den realen Live-Tag über das 81-Tage-Planfenster hinaus weiter", () => {
    const run = createDefaultRunPackage(new Date("2026-01-01T00:00:00Z"));
    const started = applyRunCommand(
      run,
      {
        kind: "live.clone-and-start",
        startedAtUtc: "2026-01-01T00:00:00Z",
        anchorKind: "emergence",
        timeZoneAtConfirmation: "Europe/Berlin",
      },
      new Date("2026-01-01T00:00:00Z"),
    );
    if (!started.ok) throw new Error("clone failed");
    expect(
      evaluateLiveClock(started.value, new Date("2026-04-02T00:00:00Z")).day,
    ).toBe(91);
  });

  it("blockiert bei Zeit vor Anker und migriert v5 als Simulation", () => {
    const run = createDefaultRunPackage(new Date("2026-08-20T10:00:00Z"));
    const started = applyRunCommand(
      run,
      {
        kind: "live.clone-and-start",
        startedAtUtc: "2026-08-20T10:00:00Z",
        timeZoneAtConfirmation: "UTC",
      },
      new Date("2026-08-20T10:00:00Z"),
    );
    if (!started.ok) throw new Error("clone failed");
    expect(
      evaluateLiveClock(started.value, new Date("2026-08-20T09:59:59Z"))
        .blocked,
    ).toBe(true);
    const old = { ...run, schemaVersion: "5.0.0" };
    expect(migrateRunPackage(old)?.executionMode).toBe("simulation");
  });
});
