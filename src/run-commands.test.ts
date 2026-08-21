import { describe, expect, it } from "vitest";
import { applyRunCommand } from "./run-commands";
import { createDefaultRunPackage, migrateRunPackage } from "./run-state";
import type { MixBatchRecord } from "./types";

const at = new Date("2026-08-18T10:00:00.000Z");

describe("RunPackage v6 command gateway", () => {
  it("migrates v4 records with explicit v6 status and storage metadata", () => {
    const legacy = structuredClone(
      createDefaultRunPackage(),
    ) as unknown as Record<string, unknown>;
    legacy.schemaVersion = "4.0.0";
    delete legacy.mediaAssets;
    delete legacy.mixApplications;
    delete legacy.storageState;
    const migrated = migrateRunPackage(legacy);
    expect(migrated).toMatchObject({
      schemaVersion: "6.0.0",
      mediaAssets: [],
      mixApplications: [],
      storageState: { state: "healthy", unsavedChanges: false },
    });
    expect(migrated?.domainEvents[0]?.payload).toEqual({
      fromSchema: "5.0.0",
      toSchema: "6.0.0",
    });
  });

  it("records and closes IPM only through the allowed state machine", () => {
    const run = createDefaultRunPackage(at);
    const recorded = applyRunCommand(
      run,
      {
        kind: "ipm.record",
        inspection: {
          id: "ipm-1",
          plantId: run.plants[0]?.id ?? null,
          inspectedAt: at.toISOString(),
          day: 4,
          finding: "Spuren an Blattunterseite",
          location: "Canopy NW",
          severity: "trace",
          suspectedOrganism: null,
          confirmed: false,
          photoIds: [],
          action: "Beobachten",
          followUpDate: "2026-08-20",
        },
      },
      at,
    );
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) return;
    expect(run.ipmInspections).toEqual([]);
    expect(recorded.value.ipmInspections[0]?.status).toBe("open");

    const invalidClose = applyRunCommand(recorded.value, {
      kind: "ipm.transition",
      inspectionId: "ipm-1",
      status: "closed",
      reason: "zu früh",
    });
    expect(invalidClose).toMatchObject({
      ok: false,
      errors: [{ code: "invalid-transition" }],
    });

    const resolved = applyRunCommand(recorded.value, {
      kind: "ipm.transition",
      inspectionId: "ipm-1",
      status: "resolved",
      reason: "Keine weiteren Spuren",
      outcome: "Ohne Behandlung abgeklungen",
      followUpCompleted: true,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const closed = applyRunCommand(resolved.value, {
      kind: "ipm.transition",
      inspectionId: "ipm-1",
      status: "closed",
      reason: "Follow-up abgeschlossen",
      outcome: "Ohne Behandlung abgeklungen",
      followUpCompleted: true,
    });
    expect(closed.ok && closed.value.ipmInspections[0]?.closedAt).toBeTruthy();
  });

  it("supersedes the plan for a critical incident until reviewed recovery closes", () => {
    const run = createDefaultRunPackage(at);
    const created = applyRunCommand(
      run,
      {
        kind: "incident.create",
        incident: {
          id: "incident-1",
          category: "water-leak",
          detectedAt: at.toISOString(),
          detectedDay: 4,
          severity: "critical",
          description: "Wasser in Auffangwanne",
          affectedEquipmentIds: [],
          affectedPlantIds: [],
          planSuperseded: false,
        },
      },
      at,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.incidents[0]?.planSuperseded).toBe(true);
    expect(
      applyRunCommand(created.value, {
        kind: "incident.transition",
        incidentId: "incident-1",
        status: "closed",
        reason: "skip",
      }),
    ).toMatchObject({ ok: false, errors: [{ code: "invalid-transition" }] });

    let current = created.value;
    for (const [status, reason] of [
      ["mitigating", "Zufuhr gestoppt"],
      ["recovering", "Fläche getrocknet"],
      ["resolved", "Leck behoben"],
    ] as const) {
      const result = applyRunCommand(current, {
        kind: "incident.transition",
        incidentId: "incident-1",
        status,
        reason,
      });
      expect(result.ok).toBe(true);
      if (result.ok) current = result.value;
    }
    const closed = applyRunCommand(current, {
      kind: "incident.transition",
      incidentId: "incident-1",
      status: "closed",
      reason: "Review beendet",
      rootCause: "Lose Verbindung",
      lessonsLearned: "Verbindung in Wartungscheck aufnehmen",
    });
    expect(closed.ok).toBe(true);
    if (closed.ok)
      expect(closed.value.incidents[0]).toMatchObject({
        status: "closed",
        planSuperseded: false,
      });
  });

  it("links equipment and append-only maintenance while failed results mark the asset", () => {
    const run = createDefaultRunPackage(at);
    const added = applyRunCommand(run, {
      kind: "equipment.add",
      equipment: {
        id: "fan-1",
        category: "exhaust",
        manufacturer: "Example",
        model: "Fan 100",
        serialOrAssetId: null,
        ratedPowerW: 30,
        installedAt: "2026-08-01",
        position: "oben",
        notes: "",
      },
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const maintained = applyRunCommand(added.value, {
      kind: "maintenance.record",
      maintenance: {
        id: "maint-1",
        equipmentId: "fan-1",
        type: "inspection",
        performedAt: at.toISOString(),
        performedBy: "operator",
        nextDueAt: null,
        result: "failed",
        notes: "Lagergeräusch",
        cost: null,
        currency: "EUR",
      },
    });
    expect(maintained.ok).toBe(true);
    if (maintained.ok) {
      expect(maintained.value.maintenanceEvents).toHaveLength(1);
      expect(maintained.value.equipment[0]?.status).toBe("failed");
    }
  });

  it("records inventory, reservoir, lung room and energy with audit events", () => {
    let run = createDefaultRunPackage(at);
    const commands = [
      {
        kind: "product-inventory.adjust" as const,
        item: {
          id: "product-1",
          productName: "HESI TNT",
          productCatalogId: null,
          owned: true,
          containerSize: "1 L",
          remainingEstimate: "750 ml",
          lot: null,
          openedAt: null,
          expiresAt: null,
          pricePaid: null,
          currency: "EUR",
          notes: "",
        },
      },
      {
        kind: "reservoir.record" as const,
        reservoir: {
          id: "reservoir-1",
          tankSizeLiters: 20,
          material: "PE",
          temperatureC: 20,
          standtimeHours: 1,
        },
      },
      {
        kind: "lung-room.update" as const,
        profile: {
          roomTempMinC: 20,
          roomTempMaxC: 24,
          roomRhMin: 45,
          roomRhMax: 60,
          climateReserveNotes: "Reserve vorhanden",
          measuredAt: at.toISOString(),
        },
      },
      {
        kind: "energy.record" as const,
        reading: {
          id: "energy-1",
          category: "lighting" as const,
          equipmentId: null,
          day: 4,
          kwhEstimate: 2.52,
          hoursPerDay: 18,
          powerW: 140,
          source: "rated-estimate" as const,
          notes: "",
        },
      },
    ];
    for (const command of commands) {
      const result = applyRunCommand(run, command);
      expect(result.ok).toBe(true);
      if (result.ok) run = result.value;
    }
    expect(run.productInventory).toHaveLength(1);
    expect(run.reservoirs).toHaveLength(1);
    expect(run.lungRoom?.roomTempMaxC).toBe(24);
    expect(run.energyReadings).toHaveLength(1);
    expect(run.auditEvents.slice(0, 4).map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        "product-inventory-adjusted",
        "reservoir-recorded",
        "lung-room-updated",
        "energy-recorded",
      ]),
    );
  });

  it("requires an evidence-backed rule bundle before a nutrient system is operational", () => {
    const run = createDefaultRunPackage(at);
    const blocked = applyRunCommand(run, {
      kind: "nutrient-system.upsert",
      profile: {
        id: "custom",
        name: "Custom",
        description: "",
        products: [],
        phBehavior: "",
        mixOrder: [],
        compatibilityNotes: "",
        evidenceRef: "KB-1",
        isCustom: true,
        status: "operational",
        ruleBundleVersion: null,
      },
    });
    expect(blocked).toMatchObject({
      ok: false,
      errors: [{ code: "safety-blocked" }],
    });
  });

  it("supersedes immutable mix batches and records a separate application", () => {
    const base = createDefaultRunPackage(at);
    const original: MixBatchRecord = {
      id: "batch-1",
      runId: base.id,
      day: 4,
      createdAt: at.toISOString(),
      waterSourceEc: null,
      waterSourcePh: null,
      waterTempC: null,
      waterVolumeLiters: 10,
      components: [],
      finalEc: 1,
      finalPh: 5.9,
      finalVolumeLiters: 10,
      plannedDay: 4,
      deviationNotes: "",
      reservoirId: null,
      batchLabel: "Original",
      revision: 1,
    };
    const run = { ...base, mixBatches: [original] };
    const corrected = applyRunCommand(run, {
      kind: "mix-batch.supersede",
      originalBatchId: original.id,
      reason: "EC-Messfehler korrigiert",
      replacement: {
        ...original,
        id: "batch-2",
        finalEc: 1.2,
        batchLabel: "Korrektur",
      },
    });
    expect(corrected.ok).toBe(true);
    if (!corrected.ok) return;
    expect(
      corrected.value.mixBatches.find((entry) => entry.id === "batch-1")
        ?.supersededBy,
    ).toBe("batch-2");
    const applied = applyRunCommand(corrected.value, {
      kind: "mix-application.record",
      application: {
        id: "application-1",
        mixBatchId: "batch-2",
        plantIds: [run.plants[0]?.id ?? ""],
        appliedAt: at.toISOString(),
        volumeLiters: 0.8,
        method: "manual",
        notes: "",
      },
    });
    expect(applied.ok && applied.value.mixApplications).toHaveLength(1);
  });

  it("creates mix batches atomically with audit and timeline records", () => {
    const run = createDefaultRunPackage(at);
    const result = applyRunCommand(
      run,
      {
        kind: "mix-batch.create",
        batch: {
          id: "batch-created",
          day: 4,
          createdAt: at.toISOString(),
          waterSourceEc: null,
          waterSourcePh: null,
          waterTempC: null,
          waterVolumeLiters: 10,
          components: [
            {
              productName: "HESI TNT",
              productId: null,
              plannedDoseMlPerL: 2.5,
              actualDoseMlPerL: 2.4,
              actualTotalMl: 24,
              mixOrder: 1,
            },
          ],
          finalEc: 1.2,
          finalPh: 5.9,
          finalVolumeLiters: 10,
          plannedDay: 4,
          deviationNotes: "",
          reservoirId: null,
          batchLabel: "Batch Tag 4",
        },
      },
      at,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mixBatches[0]).toMatchObject({
      id: "batch-created",
      revision: 1,
    });
    expect(result.value.mixBatches[0]?.supersededBy).toBeUndefined();
    expect(result.value.auditEvents[0]?.action).toBe("mix-batch-created");
    expect(result.value.events[0]?.category).toBe("mix-batch");
  });

  it("attaches only hashed, privacy-processed media to an existing entity", () => {
    const run = createDefaultRunPackage(at);
    const result = applyRunCommand(run, {
      kind: "media.attach",
      asset: {
        id: "media-1",
        createdAt: at.toISOString(),
        sha256: "A".repeat(64),
        mimeType: "image/webp",
        width: 1200,
        height: 900,
        byteLength: 1234,
        privacyStatus: "exif-stripped",
        encryption: { algorithm: "AES-GCM", keyId: "key-1", iv: "iv" },
        entityType: "plant",
        entityId: run.plants[0]?.id ?? "",
        caption: "Canopy",
      },
    });
    expect(result.ok && result.value.mediaAssets[0]?.privacyStatus).toBe(
      "exif-stripped",
    );
  });

  it("commits a validated connector batch once and keeps trust unverified", () => {
    const run = createDefaultRunPackage(at);
    const batch = {
      id: "import-1",
      connectorId: "ukd.file-import",
      fileName: "measurements.csv",
      fileSha256: "B".repeat(64),
      createdAt: at.toISOString(),
      mapping: {
        timestamp: "time",
        metric: "metric",
        value: "value",
        unit: "unit",
        deviceId: "device",
        source: "source",
      },
      records: [
        {
          timestamp: at.toISOString(),
          metric: "water.ec" as const,
          value: 1.2,
          unit: "mS/cm" as const,
          deviceId: "ec-1",
          source: "manual-export",
        },
      ],
      findings: [],
      status: "validated" as const,
    };
    const result = applyRunCommand(
      run,
      { kind: "measurements.import", batch },
      at,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.measurements[0]).toMatchObject({
      trustStatus: "unverified",
      calibrationState: "unknown",
      deviceId: "ec-1",
    });
    expect(result.value.auditEvents[0]?.action).toBe("imported");
    expect(result.value.domainEvents[0]?.actor).toBe("connector");
    const duplicate = applyRunCommand(
      result.value,
      { kind: "measurements.import", batch },
      at,
    );
    expect(duplicate).toMatchObject({
      ok: false,
      errors: [{ code: "duplicate" }],
    });
  });
});
