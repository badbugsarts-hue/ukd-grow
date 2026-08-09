import { DAILY_COLUMNS, numberAt, type DayPlan } from "./domain";
import type {
  AuditEvent,
  DailyObservation,
  InventoryEvent,
  Measurement,
  MeasurementMetric,
  ObservationValues,
  RunAlert,
  RunConfig,
  RunEvent,
  RunOverride,
  RunPackage,
  RunTask,
  StructuredObservation,
} from "./types";

export const RUN_SCHEMA_VERSION = "2.0.0" as const;

const measurementMap: Array<{
  key: keyof ObservationValues;
  metric: MeasurementMetric;
  unit?: Measurement["reading"]["unit"];
}> = [
  { key: "tempMax", metric: "temperature.air.max", unit: "°C" },
  { key: "tempMin", metric: "temperature.air.min", unit: "°C" },
  { key: "humidityMax", metric: "humidity.relative.max", unit: "%" },
  { key: "humidityMin", metric: "humidity.relative.min", unit: "%" },
  { key: "leafTemp", metric: "temperature.leaf", unit: "°C" },
  { key: "ppfd", metric: "light.ppfd", unit: "µmol/m²/s" },
  { key: "phIn", metric: "water.ph", unit: "pH" },
  { key: "ecIn", metric: "water.ec", unit: "mS/cm" },
  { key: "phDrain", metric: "drain.ph", unit: "pH" },
  { key: "ecDrain", metric: "drain.ec", unit: "mS/cm" },
  { key: "waterLiters", metric: "water.volume", unit: "L" },
  { key: "plantHeightCm", metric: "plant.height", unit: "cm" },
  { key: "stress", metric: "plant.stress" },
];

const emptyValues = (): ObservationValues => ({
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
  plantHeightCm: null,
  stress: null,
});

export function createDefaultRunPackage(now = new Date()): RunPackage {
  const timestamp = now.toISOString();
  const runId = crypto.randomUUID();
  const zoneId = crypto.randomUUID();
  const plantId = crypto.randomUUID();
  const config: RunConfig = {
    name: "UKD Run 2026",
    genetics: "Double Grape Auto",
    startDate: timestamp.slice(0, 10),
    endDay: 80,
    plantCount: 1,
    tentWidthCm: 60,
    tentDepthCm: 60,
    tentHeightCm: 180,
    ledMaxW: 140,
    lightHours: 18,
    medium: "Coco",
    irrigationSystem: "Manuell / indoor-freigegeben",
    nutrientSystem: "UKD HESI Conservative",
    water: {
      sourcePh: null,
      sourceEc: null,
      calciumMgL: null,
      magnesiumMgL: null,
      alkalinityMgL: null,
    },
  };
  return {
    schemaVersion: RUN_SCHEMA_VERSION,
    id: runId,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "draft",
    config,
    configurationSnapshot: {
      id: crypto.randomUUID(),
      version: 1,
      capturedAt: timestamp,
      config: copyConfig(config),
      evidenceVersion: "v6 Evidence-Guarded",
      immutable: true,
    },
    zones: [
      {
        id: zoneId,
        name: "Hauptzone",
        kind: "tent",
        widthCm: config.tentWidthCm,
        depthCm: config.tentDepthCm,
        heightCm: config.tentHeightCm,
      },
    ],
    plants: [
      {
        id: plantId,
        zoneId,
        label: "Pflanze A1",
        genetics: config.genetics,
        status: "planned",
      },
    ],
    observations: [],
    measurements: [],
    structuredObservations: [],
    tasks: [],
    overrides: [],
    auditEvents: [
      auditEvent(
        "run-created",
        "run",
        runId,
        "Run als Entwurf angelegt.",
        timestamp,
      ),
    ],
    events: [],
    completedTasks: {},
    acknowledgedAlertIds: [],
    inventory: [],
  };
}

export function createObservation(
  day: number,
  now = new Date(),
): DailyObservation {
  return {
    id: crypto.randomUUID(),
    day,
    recordedAt: now.toISOString(),
    source: "manual",
    status: "measured",
    values: emptyValues(),
    notes: "",
  };
}

export function latestObservation(
  run: RunPackage,
  day: number,
): DailyObservation | undefined {
  return run.observations
    .filter((entry) => entry.day === day)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
}

export function addObservation(
  run: RunPackage,
  observation: DailyObservation,
): RunPackage {
  const measurements = measurementsFromObservation(run, observation);
  const event: RunEvent = {
    id: crypto.randomUUID(),
    day: observation.day,
    occurredAt: observation.recordedAt,
    category: "measurement",
    title: "Messdatensatz gespeichert",
    detail: observation.notes || "Manuelle Messwerte erfasst",
    relatedEntityId: observation.id,
  };
  return touch({
    ...run,
    observations: [...run.observations, observation],
    measurements: [...run.measurements, ...measurements],
    auditEvents: [
      auditEvent(
        "measurement-recorded",
        "observation",
        observation.id,
        `${measurements.length} typisierte Messwerte erfasst.`,
        observation.recordedAt,
      ),
      ...run.auditEvents,
    ],
    events: [event, ...run.events],
  });
}

export function addRunEvent(run: RunPackage, event: RunEvent): RunPackage {
  return touch({ ...run, events: [event, ...run.events] });
}

export function addInventoryEvent(
  run: RunPackage,
  event: InventoryEvent,
): RunPackage {
  return touch({ ...run, inventory: [event, ...run.inventory] });
}

export function updateRunConfig(
  run: RunPackage,
  config: RunConfig,
): RunPackage {
  const occurredAt = new Date().toISOString();
  return touch({
    ...run,
    config,
    ...(run.status === "draft" ? synchronizedAssets(run, config) : {}),
    events: [
      {
        id: crypto.randomUUID(),
        day: 0,
        occurredAt,
        category: "configuration-change",
        title:
          run.status === "draft"
            ? "Run-Entwurf aktualisiert"
            : "Setup-Profil aktualisiert; aktiver Snapshot bleibt unverändert",
        detail: `${config.genetics} · ${config.medium} · ${config.ledMaxW} W`,
      },
      ...run.events,
    ],
    auditEvents: [
      auditEvent(
        "configuration-changed",
        "run-config",
        run.id,
        run.status === "draft"
          ? "Entwurfskonfiguration geändert."
          : `Profil geändert; Snapshot ${run.configurationSnapshot.id} nicht verändert.`,
        occurredAt,
      ),
      ...run.auditEvents,
    ],
  });
}

export function activateRun(run: RunPackage, now = new Date()): RunPackage {
  if (run.status !== "draft") return run;
  const occurredAt = now.toISOString();
  const configurationSnapshot = {
    id: crypto.randomUUID(),
    version: run.configurationSnapshot.version + 1,
    capturedAt: occurredAt,
    config: copyConfig(run.config),
    evidenceVersion: "v6 Evidence-Guarded",
    immutable: true as const,
  };
  return touch({
    ...run,
    status: "active",
    configurationSnapshot,
    plants: run.plants.map((plant) => ({
      ...plant,
      status: "active" as const,
    })),
    auditEvents: [
      auditEvent(
        "run-activated",
        "configuration-snapshot",
        configurationSnapshot.id,
        `Run mit Snapshot v${configurationSnapshot.version} aktiviert.`,
        occurredAt,
      ),
      ...run.auditEvents,
    ],
    events: [
      {
        id: crypto.randomUUID(),
        day: 0,
        occurredAt,
        category: "phase-change",
        title: "Run aktiviert",
        detail: `Immutable Konfiguration v${configurationSnapshot.version}`,
        relatedEntityId: configurationSnapshot.id,
      },
      ...run.events,
    ],
  });
}

export function effectiveRunConfig(run: RunPackage): RunConfig {
  return run.status === "draft" ? run.config : run.configurationSnapshot.config;
}

export function setTaskCompleted(
  run: RunPackage,
  day: number,
  task: string,
  completed: boolean,
): RunPackage {
  const key = String(day);
  const current = new Set(run.completedTasks[key] ?? []);
  if (completed) current.add(task);
  else current.delete(task);
  const taskId = taskKey(day, task);
  const occurredAt = new Date().toISOString();
  const existing = run.tasks.find((entry) => entry.id === taskId);
  const semanticTask: RunTask = {
    id: taskId,
    runId: run.id,
    day,
    type: existing?.type ?? "daily-operation",
    title: task,
    requirement: existing?.requirement ?? "required",
    dueAt: existing?.dueAt ?? null,
    phase: existing?.phase ?? "plan-derived",
    state: completed ? "completed" : "due",
    reason: existing?.reason ?? "Aus kanonischem Tagesplan abgeleitet.",
    evidenceRefs: existing?.evidenceRefs ?? [],
    dependencies: existing?.dependencies ?? [],
    ...(completed ? { completedAt: occurredAt } : {}),
  };
  return touch({
    ...run,
    completedTasks: { ...run.completedTasks, [key]: [...current] },
    tasks: [semanticTask, ...run.tasks.filter((entry) => entry.id !== taskId)],
    auditEvents: [
      auditEvent(
        "task-state-changed",
        "task",
        taskId,
        `Status auf ${semanticTask.state} gesetzt.`,
        occurredAt,
      ),
      ...run.auditEvents,
    ],
  });
}

export function acknowledgeAlert(run: RunPackage, alertId: string): RunPackage {
  return touch({
    ...run,
    acknowledgedAlertIds: [...new Set([...run.acknowledgedAlertIds, alertId])],
  });
}

export function addStructuredObservation(
  run: RunPackage,
  observation: StructuredObservation,
): RunPackage {
  return touch({
    ...run,
    structuredObservations: [observation, ...run.structuredObservations],
    events: [
      {
        id: crypto.randomUUID(),
        day: dayFromTimestamp(run, observation.observedAt),
        occurredAt: observation.observedAt,
        category: "observation",
        title: `${observation.category} · ${observation.severity}`,
        detail: observation.text,
        relatedEntityId: observation.id,
      },
      ...run.events,
    ],
    auditEvents: [
      auditEvent(
        "observation-recorded",
        "observation",
        observation.id,
        observation.text,
        observation.observedAt,
      ),
      ...run.auditEvents,
    ],
  });
}

export function supersedeMeasurement(
  run: RunPackage,
  measurementId: string,
  correctedValue: number,
  reason: string,
  now = new Date(),
): RunPackage {
  const original = run.measurements.find((entry) => entry.id === measurementId);
  if (!original || original.supersededBy || !reason.trim()) return run;
  const occurredAt = now.toISOString();
  const correction: Measurement = {
    ...original,
    id: crypto.randomUUID(),
    measuredAt: occurredAt,
    reading: {
      ...original.reading,
      value: correctedValue,
      semantic: "measured",
      source: { kind: "manual", reference: `correction:${original.id}` },
      timestamp: occurredAt,
      quality: "verified",
    },
    correctionReason: reason.trim(),
    supersededBy: undefined,
  };
  return touch({
    ...run,
    measurements: [
      correction,
      ...run.measurements.map((entry) =>
        entry.id === original.id
          ? {
              ...entry,
              supersededBy: correction.id,
              correctionReason: reason.trim(),
            }
          : entry,
      ),
    ],
    events: [
      {
        id: crypto.randomUUID(),
        day: dayFromTimestamp(run, occurredAt),
        occurredAt,
        category: "measurement",
        title: "Messwert korrigiert",
        detail: `${original.metric}: ${String(original.reading.value)} → ${correctedValue}; ${reason.trim()}`,
        relatedEntityId: correction.id,
      },
      ...run.events,
    ],
    auditEvents: [
      auditEvent(
        "measurement-superseded",
        "measurement",
        original.id,
        `Ersetzt durch ${correction.id}: ${reason.trim()}`,
        occurredAt,
      ),
      ...run.auditEvents,
    ],
  });
}

export function addRunOverride(
  run: RunPackage,
  override: RunOverride,
): RunPackage {
  if (!override.reason.trim()) return run;
  return touch({
    ...run,
    overrides: [override, ...run.overrides],
    events: [
      {
        id: crypto.randomUUID(),
        day: dayFromTimestamp(run, override.createdAt),
        occurredAt: override.createdAt,
        category: "override",
        title: `Override: ${override.field}`,
        detail: override.reason,
        relatedEntityId: override.id,
      },
      ...run.events,
    ],
    auditEvents: [
      auditEvent(
        "override-created",
        "override",
        override.id,
        `${override.field}: ${override.reason}`,
        override.createdAt,
      ),
      ...run.auditEvents,
    ],
  });
}

export function reverseRunOverride(
  run: RunPackage,
  overrideId: string,
  now = new Date(),
): RunPackage {
  const occurredAt = now.toISOString();
  const override = run.overrides.find((entry) => entry.id === overrideId);
  if (!override || override.reversedAt) return run;
  return touch({
    ...run,
    overrides: run.overrides.map((entry) =>
      entry.id === overrideId ? { ...entry, reversedAt: occurredAt } : entry,
    ),
    auditEvents: [
      auditEvent(
        "override-reversed",
        "override",
        overrideId,
        "Override reversiert.",
        occurredAt,
      ),
      ...run.auditEvents,
    ],
  });
}

export function deriveRunAlerts(
  run: RunPackage,
  plan: DayPlan,
  now = new Date(),
): RunAlert[] {
  const observation = latestObservation(run, plan.day);
  const alerts: RunAlert[] = [];
  if (!observation) {
    alerts.push({
      id: `day-${plan.day}-missing-measurement`,
      severity: "warning",
      title: "Aktuelle Messung fehlt",
      detail: `Für Run-Tag ${plan.day} ist kein Messdatensatz vorhanden.`,
      action: "Messwerte erfassen, bevor Planwerte verändert werden.",
      persistent: true,
    });
  } else {
    const ageHours =
      (now.getTime() - new Date(observation.recordedAt).getTime()) / 3_600_000;
    if (ageHours > 24) {
      alerts.push({
        id: `day-${plan.day}-stale-measurement`,
        severity: "warning",
        title: "Messdaten sind veraltet",
        detail: `Die letzte Messung ist ${Math.floor(ageHours)} Stunden alt.`,
        action: "Vor einer Entscheidung neu messen.",
        persistent: true,
      });
    }
    const targetPh = numberAt(plan, DAILY_COLUMNS.ph);
    const targetEc = numberAt(plan, DAILY_COLUMNS.ec);
    if (
      observation.values.phIn !== null &&
      Math.abs(observation.values.phIn - targetPh) > 0.3
    ) {
      alerts.push({
        id: `day-${plan.day}-ph-deviation`,
        severity: "critical",
        title: "pH außerhalb des Arbeitskorridors",
        detail: `Gemessen ${observation.values.phIn.toFixed(2)}, Planwert ${targetPh.toFixed(2)}.`,
        action: "Messung bestätigen und nur den finalen Endmix korrigieren.",
        persistent: true,
      });
    }
    if (
      observation.values.ecIn !== null &&
      Math.abs(observation.values.ecIn - targetEc) > 0.3
    ) {
      alerts.push({
        id: `day-${plan.day}-ec-deviation`,
        severity: "critical",
        title: "EC deutlich vom Planwert entfernt",
        detail: `Gemessen ${observation.values.ecIn.toFixed(2)}, Planwert ${targetEc.toFixed(2)} mS/cm.`,
        action:
          "Nicht blind nachdosieren; Wasser, Messgerät und Pflanzenreaktion prüfen.",
        persistent: true,
      });
    }
  }
  const config = effectiveRunConfig(run);
  if (config.water.sourcePh === null || config.water.sourceEc === null) {
    alerts.push({
      id: "water-baseline-missing",
      severity: "warning",
      title: "Wasser-Baseline unvollständig",
      detail: "Ausgangs-pH oder Ausgangs-EC fehlen in der Run-Konfiguration.",
      action:
        "Wasserprofil erfassen; keine automatische Conditioner-Dosis ableiten.",
      persistent: true,
    });
  }
  return alerts;
}

export function validateRunPackage(
  value: unknown,
): { ok: true; value: RunPackage } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== "object")
    return { ok: false, errors: ["Datei enthält kein Objekt."] };
  const migrated = migrateRunPackage(value);
  if (!migrated)
    return {
      ok: false,
      errors: [
        `Schema ${String((value as { schemaVersion?: unknown }).schemaVersion)} wird nicht unterstützt.`,
      ],
    };
  const candidate: Partial<RunPackage> = migrated;
  if (!candidate.id || typeof candidate.id !== "string")
    errors.push("Run-ID fehlt.");
  if (!candidate.config || typeof candidate.config !== "object")
    errors.push("Run-Konfiguration fehlt.");
  if (!Array.isArray(candidate.observations))
    errors.push("Messwertliste fehlt.");
  if (!Array.isArray(candidate.events)) errors.push("Ereignisliste fehlt.");
  if (!candidate.completedTasks || typeof candidate.completedTasks !== "object")
    errors.push("Checklistenstatus fehlt.");
  if (!Array.isArray(candidate.acknowledgedAlertIds))
    errors.push("Alertstatus fehlt.");
  if (!Array.isArray(candidate.inventory)) errors.push("Bestandslog fehlt.");
  if (!candidate.configurationSnapshot)
    errors.push("Konfigurations-Snapshot fehlt.");
  if (!Array.isArray(candidate.zones)) errors.push("Zonenliste fehlt.");
  if (!Array.isArray(candidate.plants)) errors.push("Pflanzenliste fehlt.");
  if (!Array.isArray(candidate.measurements))
    errors.push("Typisierte Messwertliste fehlt.");
  if (!Array.isArray(candidate.structuredObservations))
    errors.push("Beobachtungsliste fehlt.");
  if (!Array.isArray(candidate.tasks)) errors.push("Aufgabenliste fehlt.");
  if (!Array.isArray(candidate.overrides)) errors.push("Override-Liste fehlt.");
  if (!Array.isArray(candidate.auditEvents)) errors.push("Audit-Log fehlt.");
  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, value: migrated };
}

export function migrateRunPackage(value: unknown): RunPackage | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion === RUN_SCHEMA_VERSION)
    return candidate as unknown as RunPackage;
  if (candidate.schemaVersion !== "1.0.0") return null;
  if (!candidate.config || typeof candidate.config !== "object") return null;
  const createdAt =
    typeof candidate.createdAt === "string"
      ? candidate.createdAt
      : new Date().toISOString();
  const base = createDefaultRunPackage(new Date(createdAt));
  const config = candidate.config as RunConfig;
  const observations = Array.isArray(candidate.observations)
    ? (candidate.observations as DailyObservation[])
    : [];
  const migrated: RunPackage = {
    ...base,
    id: typeof candidate.id === "string" ? candidate.id : base.id,
    createdAt,
    updatedAt:
      typeof candidate.updatedAt === "string" ? candidate.updatedAt : createdAt,
    config,
    ...synchronizedAssets(base, config),
    configurationSnapshot: {
      ...base.configurationSnapshot,
      capturedAt: createdAt,
      config: copyConfig(config),
    },
    observations,
    events: Array.isArray(candidate.events)
      ? (candidate.events as RunEvent[])
      : [],
    completedTasks:
      candidate.completedTasks && typeof candidate.completedTasks === "object"
        ? (candidate.completedTasks as Record<string, string[]>)
        : {},
    acknowledgedAlertIds: Array.isArray(candidate.acknowledgedAlertIds)
      ? (candidate.acknowledgedAlertIds as string[])
      : [],
    inventory: Array.isArray(candidate.inventory)
      ? (candidate.inventory as InventoryEvent[])
      : [],
    auditEvents: [
      auditEvent(
        "imported",
        "run",
        typeof candidate.id === "string" ? candidate.id : base.id,
        "RunPackage v1 verlustfrei auf v2 migriert.",
      ),
      ...base.auditEvents,
    ],
  };
  migrated.measurements = observations.flatMap((observation) =>
    measurementsFromObservation(migrated, observation),
  );
  return migrated;
}

export function inventoryBalance(run: RunPackage): number {
  return run.inventory.reduce((sum, event) => {
    const outgoing =
      event.type === "consumption" || event.type === "destruction";
    return sum + (outgoing ? -Math.abs(event.grams) : event.grams);
  }, 0);
}

export function runToCsv(run: RunPackage): string {
  const header = [
    "day",
    "recordedAt",
    "source",
    ...Object.keys(emptyValues()),
    "notes",
  ];
  const csvEscape = (value: unknown) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = run.observations.map((entry) => [
    entry.day,
    entry.recordedAt,
    entry.source,
    ...Object.values(entry.values),
    entry.notes,
  ]);
  return [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");
}

function touch(run: RunPackage): RunPackage {
  return { ...run, updatedAt: new Date().toISOString() };
}

function copyConfig(config: RunConfig): RunConfig {
  return { ...config, water: { ...config.water } };
}

function synchronizedAssets(
  run: RunPackage,
  config: RunConfig,
): Pick<RunPackage, "zones" | "plants"> {
  const primaryZone = run.zones[0] ?? {
    id: crypto.randomUUID(),
    name: "Hauptzone",
    kind: "tent" as const,
    widthCm: null,
    depthCm: null,
    heightCm: null,
  };
  const zones = [
    {
      ...primaryZone,
      widthCm: config.tentWidthCm,
      depthCm: config.tentDepthCm,
      heightCm: config.tentHeightCm,
    },
    ...run.zones.slice(1),
  ];
  const count = Math.max(0, Math.round(config.plantCount));
  const plants = Array.from({ length: count }, (_, index) => {
    const existing = run.plants[index];
    return existing
      ? {
          ...existing,
          zoneId: primaryZone.id,
          genetics: config.genetics,
        }
      : {
          id: crypto.randomUUID(),
          zoneId: primaryZone.id,
          label: `Pflanze ${String.fromCharCode(65 + (index % 26))}${Math.floor(index / 26) + 1}`,
          genetics: config.genetics,
          status: "planned" as const,
        };
  });
  return { zones, plants };
}

function auditEvent(
  action: AuditEvent["action"],
  entityType: string,
  entityId: string,
  detail: string,
  occurredAt = new Date().toISOString(),
): AuditEvent {
  return {
    id: crypto.randomUUID(),
    occurredAt,
    action,
    entityType,
    entityId,
    detail,
  };
}

function measurementsFromObservation(
  run: RunPackage,
  observation: DailyObservation,
): Measurement[] {
  const zoneId = run.zones[0]?.id ?? "unassigned-zone";
  const plantId = run.plants.length === 1 ? run.plants[0]?.id : undefined;
  return measurementMap.flatMap(({ key, metric, unit }) => {
    const value = observation.values[key];
    if (value === null) return [];
    return [
      {
        id: crypto.randomUUID(),
        runId: run.id,
        zoneId,
        ...(plantId ? { plantId } : {}),
        metric,
        reading: {
          value,
          ...(unit ? { unit } : {}),
          semantic: "measured" as const,
          source: {
            kind: observation.source,
            reference: `daily-observation:${observation.id}`,
          },
          timestamp: observation.recordedAt,
          quality: "unverified" as const,
          stale: observation.status === "stale",
        },
        measuredAt: observation.recordedAt,
        calibrationState:
          observation.source === "sensor" ? "unknown" : undefined,
      },
    ];
  });
}

function dayFromTimestamp(run: RunPackage, timestamp: string): number {
  const start = new Date(`${effectiveRunConfig(run).startDate}T00:00:00Z`);
  const value = new Date(timestamp);
  if (Number.isNaN(start.getTime()) || Number.isNaN(value.getTime())) return 0;
  return Math.max(
    0,
    Math.round((value.getTime() - start.getTime()) / 86_400_000),
  );
}

function taskKey(day: number, title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `day-${day}:${slug || "task"}`;
}
