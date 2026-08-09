import { DAILY_COLUMNS, numberAt, type DayPlan } from "./domain";
import type {
  DailyObservation,
  InventoryEvent,
  ObservationValues,
  RunAlert,
  RunConfig,
  RunEvent,
  RunPackage,
} from "./types";

export const RUN_SCHEMA_VERSION = "1.0.0" as const;

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
  return {
    schemaVersion: RUN_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    config: {
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
    },
    observations: [],
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
  const event: RunEvent = {
    id: crypto.randomUUID(),
    day: observation.day,
    occurredAt: observation.recordedAt,
    category: "measurement",
    title: "Messdatensatz gespeichert",
    detail: observation.notes || "Manuelle Messwerte erfasst",
  };
  return touch({
    ...run,
    observations: [...run.observations, observation],
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
  return touch({
    ...run,
    config,
    events: [
      {
        id: crypto.randomUUID(),
        day: 0,
        occurredAt: new Date().toISOString(),
        category: "system",
        title: "Run-Konfiguration aktualisiert",
        detail: `${config.genetics} · ${config.medium} · ${config.ledMaxW} W`,
      },
      ...run.events,
    ],
  });
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
  return touch({
    ...run,
    completedTasks: { ...run.completedTasks, [key]: [...current] },
  });
}

export function acknowledgeAlert(run: RunPackage, alertId: string): RunPackage {
  return touch({
    ...run,
    acknowledgedAlertIds: [...new Set([...run.acknowledgedAlertIds, alertId])],
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
  if (
    run.config.water.sourcePh === null ||
    run.config.water.sourceEc === null
  ) {
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
  const candidate = value as Partial<RunPackage>;
  if (candidate.schemaVersion !== RUN_SCHEMA_VERSION)
    errors.push(
      `Schema ${String(candidate.schemaVersion)} wird nicht unterstützt.`,
    );
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
  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, value: candidate as RunPackage };
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
