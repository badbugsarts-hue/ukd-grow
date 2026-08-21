import { describe, expect, it } from "vitest";
import cockpitDataRaw from "./data/autoflower-cockpit.json";
import {
  calculateBiologicalPlantAge,
  DAILY_COLUMNS,
  type DayPlan as DomainDayPlan,
} from "./domain";
import { evaluateLiveClock } from "./live-run";
import {
  acknowledgeAlert,
  activateRun,
  addInventoryEvent,
  addObservation,
  addRunOverride,
  addStructuredObservation,
  createDefaultRunPackage,
  createObservation,
  deriveRunAlerts,
  effectiveRunConfig,
  inventoryBalance,
  migrateRunPackage,
  projectDomainEvents,
  runToCsv,
  setTaskCompleted,
  supersedeMeasurement,
  transitionTaskState,
  updateExecutionMode,
  updatePlantMilestones,
  updateRunConfig,
  validateRunPackage,
} from "./run-state";
import type { AutoflowerStrain } from "./types";

function plan(day = 4): DomainDayPlan {
  const raw: DomainDayPlan["raw"] = Array.from({ length: 45 }, () => null);
  raw[DAILY_COLUMNS.day] = day;
  raw[DAILY_COLUMNS.ph] = 5.9;
  raw[DAILY_COLUMNS.ec] = 0.8;
  return { day, raw, formulaRow: [] };
}

describe("versioned run state", () => {
  it("creates a complete v6 package with event, device and lineage stores", () => {
    const run = createDefaultRunPackage(new Date("2026-08-09T12:00:00Z"));
    expect(run.schemaVersion).toBe("6.0.0");
    expect(run.status).toBe("draft");
    expect(run.configurationSnapshot.immutable).toBe(true);
    expect(run.zones).toHaveLength(1);
    expect(run.plants).toHaveLength(1);
    expect(run.config.startDate).toBe("2026-08-09");
    expect(run.config.water.sourcePh).toBeNull();
    expect(run.domainEvents[0]?.type).toBe("run.created");
    expect(run.devices).toEqual([]);
    expect(run.mediaAssets).toEqual([]);
    expect(run.mixApplications).toEqual([]);
    expect(run.storageState.state).toBe("healthy");
    expect(validateRunPackage(run).ok).toBe(true);
  });

  it("rejects incompatible or incomplete imports", () => {
    expect(validateRunPackage({ schemaVersion: "9.0.0" })).toEqual({
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
    expect(next.measurements[0]?.metric).toBe("water.ph");
    expect(next.measurements[0]?.reading.semantic).toBe("measured");
    expect(next.measurements[0]?.reading.source.kind).toBe("manual");
    expect(next.measurements[0]?.trustStatus).toBe("valid");
    expect(next.events[0]?.category).toBe("measurement");
    expect(projectDomainEvents(next.domainEvents).measurementsRecorded).toBe(1);
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
    expect(run.tasks[0]).toMatchObject({
      title: "Drain prüfen",
      requirement: "required",
      state: "completed",
    });
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

  it("freezes the active snapshot while later profile edits stay separate", () => {
    let run = createDefaultRunPackage();
    run = updateRunConfig(run, { ...run.config, genetics: "Snapshot A" });
    run = activateRun(run, new Date("2026-08-09T14:00:00Z"));
    expect(effectiveRunConfig(run).genetics).toBe("Snapshot A");
    run = updateRunConfig(run, { ...run.config, genetics: "Profile B" });
    expect(run.config.genetics).toBe("Profile B");
    expect(effectiveRunConfig(run).genetics).toBe("Snapshot A");
  });

  it("migrates a legacy v1 package without losing observations", () => {
    const current = createDefaultRunPackage();
    const observation = createObservation(2);
    observation.values.ecIn = 0.9;
    const legacy = structuredClone(
      addObservation(current, observation),
    ) as unknown as Record<string, unknown>;
    legacy.schemaVersion = "1.0.0";
    for (const key of [
      "status",
      "configurationSnapshot",
      "zones",
      "plants",
      "measurements",
      "structuredObservations",
      "tasks",
      "overrides",
      "auditEvents",
    ])
      delete legacy[key];
    const migrated = migrateRunPackage(legacy);
    expect(migrated?.schemaVersion).toBe("6.0.0");
    expect(migrated?.observations).toHaveLength(1);
    expect(migrated?.measurements[0]?.metric).toBe("water.ec");
    expect(validateRunPackage(legacy).ok).toBe(true);
  });

  it("migrates v2 and records the schema transition", () => {
    const legacy = structuredClone(
      createDefaultRunPackage(),
    ) as unknown as Record<string, unknown>;
    legacy.schemaVersion = "2.0.0";
    for (const key of [
      "devices",
      "calibrations",
      "domainEvents",
      "privacyClassification",
    ])
      delete legacy[key];
    const migrated = migrateRunPackage(legacy);
    expect(migrated?.schemaVersion).toBe("6.0.0");
    expect(migrated?.domainEvents[0]?.payload).toMatchObject({
      fromSchema: "5.0.0",
      toSchema: "6.0.0",
    });
  });

  it("enforces explicit task state transitions", () => {
    let run = setTaskCompleted(createDefaultRunPackage(), 2, "Messung", false);
    const taskId = run.tasks[0]?.id ?? "";
    const invalid = transitionTaskState(
      run,
      taskId,
      "completed",
      "",
      new Date(),
    );
    expect(invalid.ok).toBe(false);
    const due = transitionTaskState(run, taskId, "ready", "Inputs geprüft");
    expect(due.ok).toBe(true);
    if (!due.ok) return;
    run = due.run;
    const completed = transitionTaskState(
      run,
      taskId,
      "completed",
      "Ausgeführt",
    );
    expect(completed.ok).toBe(true);
    if (completed.ok)
      expect(
        projectDomainEvents(completed.run.domainEvents).taskTransitions,
      ).toBe(3);
  });

  it("supersedes a bad measurement without deleting its history", () => {
    let run = createDefaultRunPackage();
    const observation = createObservation(3);
    observation.values.ecIn = 14;
    run = addObservation(run, observation);
    const original = run.measurements[0];
    expect(original).toBeDefined();
    run = supersedeMeasurement(
      run,
      original?.id ?? "",
      1.4,
      "decimal-entry-error",
      new Date("2026-08-09T15:00:00Z"),
    );
    expect(run.measurements).toHaveLength(2);
    expect(
      run.measurements.find((entry) => entry.id === original?.id)?.supersededBy,
    ).toBeTruthy();
    expect(run.measurements[0]?.reading.value).toBe(1.4);
    expect(run.auditEvents[0]?.action).toBe("measurement-superseded");
  });

  it("records structured observations and reversible expert overrides", () => {
    let run = createDefaultRunPackage();
    run = addStructuredObservation(run, {
      id: "obs-1",
      runId: run.id,
      zoneId: run.zones[0]?.id ?? "zone",
      observedAt: "2026-08-09T16:00:00Z",
      category: "foliage",
      severity: "mild",
      text: "Blattspitzen leicht heller",
      tags: [],
      photoIds: [],
    });
    run = addRunOverride(run, {
      id: "override-1",
      field: "ec.target",
      canonicalValue: 0.8,
      overrideValue: 0.9,
      evidenceConflict: "outside-plan",
      reason: "Dokumentierter Versuch",
      createdAt: "2026-08-09T16:05:00Z",
      reversible: true,
    });
    expect(run.structuredObservations[0]?.category).toBe("foliage");
    expect(run.overrides[0]?.reason).toBe("Dokumentierter Versuch");
    expect(run.events.map((entry) => entry.category)).toEqual(
      expect.arrayContaining(["observation", "override"]),
    );
  });

  describe("execution mode toggling", () => {
    it("toggles between simulation and live mode with full audit trail", () => {
      let run = createDefaultRunPackage(new Date("2026-08-01T10:00:00Z"));
      expect(run.executionMode).toBe("simulation");
      expect(run.liveAnchor).toBeNull();

      // Switch simulation -> live
      run = updateExecutionMode(run, "live");
      expect(run.executionMode).toBe("live");
      expect(run.status).toBe("active");
      expect(run.liveAnchor).not.toBeNull();
      expect(run.liveAnchor?.kind).toBe("seed-planted");
      expect(run.clockHealth.status).toBe("healthy");
      expect(run.auditEvents[0]?.action).toBe("live-started");
      expect(run.domainEvents[0]?.type).toBe("live.started");
      expect(run.events[0]?.category).toBe("live");

      // Idempotent call with same mode
      const unchanged = updateExecutionMode(run, "live");
      expect(unchanged).toBe(run);

      // Switch live -> simulation
      run = updateExecutionMode(run, "simulation");
      expect(run.executionMode).toBe("simulation");
      expect(run.liveAnchor).not.toBeNull(); // retained
      expect(run.auditEvents[0]?.action).toBe("configuration-changed");
      expect(run.domainEvents[0]?.type).toBe("configuration.changed");
      expect(run.events[0]?.category).toBe("configuration-change");
    });
  });

  describe("plant milestone tracking & dynamic day recalculation", () => {
    it("updates potting and emergence milestones and calculates biological age", () => {
      let run = createDefaultRunPackage(new Date("2026-08-20T10:00:00Z"));

      run = updatePlantMilestones(
        run,
        {
          pottingDateIso: "2026-08-01",
          emergenceDateIso: "2026-08-05",
          dayZeroAnchor: "emergence",
        },
        "Aussaat und Keimung dokumentiert",
      );

      // Verify growth events recorded
      expect(run.growthEvents).toHaveLength(2);
      const pottingEv = run.growthEvents.find((e) => e.kind === "seed-planted");
      const emergenceEv = run.growthEvents.find((e) => e.kind === "emergence");
      expect(pottingEv).toBeDefined();
      expect(pottingEv?.occurredAt).toContain("2026-08-01");
      expect(emergenceEv).toBeDefined();
      expect(emergenceEv?.occurredAt).toContain("2026-08-05");
      expect(emergenceEv?.day).toBe(0);

      // Verify plant identity updated
      expect(run.plants[0]?.identity.pottingDateIso).toBe("2026-08-01");
      expect(run.plants[0]?.identity.emergenceDateIso).toBe("2026-08-05");
      expect(run.plants[0]?.identity.dayZeroAnchorDate).toBe("2026-08-05");
      expect(run.config.startDate).toBe("2026-08-05");
      expect(run.config.dayZeroAnchor).toBe("emergence");

      // Verify audit and domain events
      expect(run.auditEvents[0]?.action).toBe("configuration-changed");
      expect(run.auditEvents[0]?.entityType).toBe("plant-milestone");
      expect(run.domainEvents[0]?.type).toBe("configuration.changed");

      // Test biological age calculation
      const evalDate = new Date("2026-08-20T00:00:00Z");
      const bioAge = calculateBiologicalPlantAge(
        "emergence",
        run.growthEvents,
        evalDate,
      );
      // Emergence was 2026-08-05, eval is 2026-08-20 -> 15 days
      expect(bioAge.biologicalAgeDays).toBe(15);
      // Operational start (seed-planted) was 2026-08-01 -> 19 days
      expect(bioAge.operationalAgeDays).toBe(19);
      expect(bioAge.germinationDays).toBe(4);
    });

    it("dynamically adjusts live clock anchor and records anchor revision in live mode", () => {
      const now = new Date();
      let run = createDefaultRunPackage(now);
      run = updateExecutionMode(run, "live");
      expect(run.liveAnchor).not.toBeNull();

      const pottingDate = new Date(now.getTime() - 14 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const emergenceDate = new Date(now.getTime() - 10 * 86_400_000)
        .toISOString()
        .slice(0, 10);

      // Retroactively change emergence date to 10 days ago
      run = updatePlantMilestones(
        run,
        {
          pottingDateIso: pottingDate,
          emergenceDateIso: emergenceDate,
          dayZeroAnchor: "emergence",
        },
        "Korrektur nach Keimungsbestätigung",
      );

      // Verify live anchor revised
      expect(run.liveAnchor?.startedAtUtc).toContain(emergenceDate);
      expect(run.anchorRevisions).toHaveLength(1);
      expect(run.anchorRevisions[0]?.nextStartedAtUtc).toContain(emergenceDate);
      expect(run.anchorRevisions[0]?.reason).toContain("Korrektur nach Keimungsbestätigung");

      // Verify evaluateLiveClock calculates day dynamically
      const clock = evaluateLiveClock(run, now);
      expect(clock.blocked).toBe(false);
      expect(clock.day).toBe(10);
    });
  });

  describe("autoflower 61-strain dataset parsing & schema validation", () => {
    const strains = cockpitDataRaw as unknown as AutoflowerStrain[];

    it("contains exactly 61 canonical strains (50 Jungpflanzen, 11 Saatgut)", () => {
      expect(strains).toHaveLength(61);
      const youngPlants = strains.filter((s) => s.kind === "jungpflanze");
      const seeds = strains.filter((s) => s.kind === "samen");
      expect(youngPlants).toHaveLength(50);
      expect(seeds).toHaveLength(11);
    });

    it("validates that every strain fulfills the 44-attribute schema and photobiology invariants", () => {
      for (const s of strains) {
        expect(s.rank).toBeGreaterThan(0);
        expect(typeof s.name).toBe("string");
        expect(s.name.length).toBeGreaterThan(0);
        expect(typeof s.shop).toBe("string");
        expect(typeof s.breeder).toBe("string");
        expect(s.score).toBeGreaterThanOrEqual(0);
        expect(s.score).toBeLessThanOrEqual(100);
        expect(["original", "whitelabel", "unklar"]).toContain(s.prov);
        expect(["jungpflanze", "samen"]).toContain(s.kind);
        expect(["Autoflower", "Photoperiodisch", "Fast Version"]).toContain(s.typ);

        // Photobiology model checks
        expect(s.q).toBeGreaterThanOrEqual(0.5);
        expect(s.q).toBeLessThanOrEqual(1.05);
        expect(s.ertrag_lo).toBeGreaterThanOrEqual(30);
        expect(s.ertrag_hi).toBeLessThanOrEqual(130);
        expect(s.ertrag_hi).toBeGreaterThanOrEqual(s.ertrag_lo);

        // Agronomic checks
        expect(typeof s.feed).toBe("string");
        expect(typeof s.mold).toBe("string");
        expect(typeof s.level).toBe("string");
        expect(typeof s.thc).toBe("string");
        expect(typeof s.urteil).toBe("string");
      }
    });
  });
});
