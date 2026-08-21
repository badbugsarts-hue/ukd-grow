import type {
  AiProposalReview,
  AuditEvent,
  CultivarProfile,
  DomainEvent,
  DomainEventType,
  EnergyReading,
  EquipmentProfile,
  IncidentAction,
  IncidentRecord,
  IncidentStatus,
  InventoryItem,
  IpmInspection,
  LungRoomProfile,
  MaintenanceEvent,
  MediaAsset,
  ImportBatch,
  Measurement,
  MixApplication,
  MixBatchRecord,
  NutrientSystemProfile,
  PostHarvestRecord,
  ReservoirProfile,
  RunEvent,
  RunPackage,
} from "./types";
import { createDefaultRunPackage } from "./run-state";

export type DomainErrorCode =
  | "invalid-input"
  | "not-found"
  | "duplicate"
  | "invalid-transition"
  | "safety-blocked";

export interface DomainError {
  code: DomainErrorCode;
  path: string;
  message: string;
}

export type DomainResult<T> =
  | { ok: true; value: T; events: DomainEvent[] }
  | { ok: false; errors: DomainError[] };

type NewIpmInspection = Omit<
  IpmInspection,
  | "id"
  | "runId"
  | "status"
  | "outcome"
  | "closedAt"
  | "followUpCompleted"
  | "updatedAt"
  | "revision"
> & { id?: string };

type NewIncident = Omit<
  IncidentRecord,
  | "id"
  | "runId"
  | "status"
  | "actions"
  | "resolvedAt"
  | "rootCause"
  | "lessonsLearned"
  | "updatedAt"
  | "revision"
> & { id?: string };

export type RunCommand =
  | {
      kind: "live.clone-and-start";
      startedAtUtc: string;
      timeZoneAtConfirmation: string;
    }
  | { kind: "live.correct-anchor"; nextStartedAtUtc: string; reason: string }
  | { kind: "live.complete"; reason: string }
  | {
      kind: "ai-proposal.accept";
      proposalId: string;
      fileSha256: string;
      targetPath: string;
      reason: string;
      value?: unknown;
    }
  | {
      kind: "ai-proposal.reject";
      proposalId: string;
      fileSha256: string;
      targetPath: string;
      reason: string;
    }
  | {
      kind: "backup.checkpoint";
      checkpointId: string;
      sha256: string;
      checkpointKind: "automatic" | "critical" | "manual" | "completion";
      verified: boolean;
    }
  | { kind: "ipm.record"; inspection: NewIpmInspection }
  | {
      kind: "ipm.transition";
      inspectionId: string;
      status: NonNullable<IpmInspection["status"]>;
      reason: string;
      action?: string;
      outcome?: string;
      followUpCompleted?: boolean;
    }
  | { kind: "incident.create"; incident: NewIncident }
  | {
      kind: "incident.transition";
      incidentId: string;
      status: IncidentStatus;
      reason: string;
      action?: Omit<IncidentAction, "id" | "performedAt">;
      rootCause?: string;
      lessonsLearned?: string;
    }
  | {
      kind: "equipment.add";
      equipment: Omit<
        EquipmentProfile,
        "id" | "status" | "version" | "revision"
      > & { id?: string };
    }
  | {
      kind: "maintenance.record";
      maintenance: Omit<MaintenanceEvent, "id"> & { id?: string };
    }
  | {
      kind: "product-inventory.adjust";
      item: Omit<InventoryItem, "id" | "revision"> & { id?: string };
    }
  | {
      kind: "reservoir.record";
      reservoir: Omit<ReservoirProfile, "id" | "recordedAt" | "revision"> & {
        id?: string;
      };
    }
  | { kind: "lung-room.update"; profile: LungRoomProfile }
  | {
      kind: "energy.record";
      reading: Omit<EnergyReading, "id"> & { id?: string };
    }
  | {
      kind: "post-harvest.record";
      record: Omit<PostHarvestRecord, "id" | "revision"> & { id?: string };
    }
  | {
      kind: "cultivar-profile.upsert";
      profile: Omit<CultivarProfile, "id"> & { id?: string };
    }
  | {
      kind: "nutrient-system.upsert";
      profile: Omit<NutrientSystemProfile, "revision">;
    }
  | {
      kind: "mix-batch.create";
      batch: Omit<
        MixBatchRecord,
        | "id"
        | "runId"
        | "revision"
        | "supersedesBatchId"
        | "supersededBy"
        | "correctionReason"
      > & { id?: string };
    }
  | {
      kind: "mix-batch.supersede";
      originalBatchId: string;
      reason: string;
      replacement: Omit<
        MixBatchRecord,
        | "id"
        | "runId"
        | "supersedesBatchId"
        | "supersededBy"
        | "correctionReason"
        | "revision"
      > & { id?: string };
    }
  | {
      kind: "mix-application.record";
      application: Omit<MixApplication, "id" | "runId" | "revision"> & {
        id?: string;
      };
    }
  | {
      kind: "media.attach";
      asset: Omit<MediaAsset, "id" | "runId" | "revision"> & { id?: string };
    }
  | { kind: "measurements.import"; batch: ImportBatch };

const ipmTransitions: Record<
  NonNullable<IpmInspection["status"]>,
  NonNullable<IpmInspection["status"]>[]
> = {
  open: ["monitoring", "treated", "resolved"],
  monitoring: ["treated", "resolved"],
  treated: ["monitoring", "resolved"],
  resolved: ["monitoring", "closed"],
  closed: [],
};

const incidentTransitions: Record<IncidentStatus, IncidentStatus[]> = {
  open: ["mitigating"],
  mitigating: ["recovering", "resolved"],
  recovering: ["mitigating", "resolved"],
  resolved: ["mitigating", "closed"],
  closed: [],
};

export function applyRunCommand(
  run: RunPackage,
  command: RunCommand,
  now = new Date(),
): DomainResult<RunPackage> {
  const occurredAt = now.toISOString();
  if (
    run.executionMode === "live" &&
    run.clockHealth.status !== "healthy" &&
    ![
      "live.correct-anchor",
      "live.complete",
      "backup.checkpoint",
      "ai-proposal.reject",
    ].includes(command.kind)
  )
    return blocked(
      "clockHealth",
      "Die Live-Uhr ist blockiert. Fachliche Commands bleiben bis zur Anker-/Zeitprüfung gesperrt.",
    );
  switch (command.kind) {
    case "live.clone-and-start":
      return cloneAndStartLive(run, command, occurredAt);
    case "live.correct-anchor":
      return correctLiveAnchor(run, command, occurredAt);
    case "live.complete":
      return completeLive(run, command, occurredAt);
    case "ai-proposal.accept":
      return reviewAiProposal(run, command, "accepted", occurredAt);
    case "ai-proposal.reject":
      return reviewAiProposal(run, command, "rejected", occurredAt);
    case "backup.checkpoint":
      return recordBackupCheckpoint(run, command, occurredAt);
    case "ipm.record":
      return recordIpm(run, command.inspection, occurredAt);
    case "ipm.transition":
      return transitionIpm(run, command, occurredAt);
    case "incident.create":
      return createIncident(run, command.incident, occurredAt);
    case "incident.transition":
      return transitionIncident(run, command, occurredAt);
    case "equipment.add":
      return addEquipment(run, command.equipment, occurredAt);
    case "maintenance.record":
      return recordMaintenance(run, command.maintenance, occurredAt);
    case "product-inventory.adjust":
      return adjustInventory(run, command.item, occurredAt);
    case "reservoir.record":
      return recordReservoir(run, command.reservoir, occurredAt);
    case "lung-room.update":
      return updateLungRoom(run, command.profile, occurredAt);
    case "energy.record":
      return recordEnergy(run, command.reading, occurredAt);
    case "post-harvest.record":
      return recordPostHarvest(run, command.record, occurredAt);
    case "cultivar-profile.upsert":
      return upsertCultivar(run, command.profile, occurredAt);
    case "nutrient-system.upsert":
      return upsertNutrientSystem(run, command.profile, occurredAt);
    case "mix-batch.create":
      return createMixBatch(run, command.batch, occurredAt);
    case "mix-batch.supersede":
      return supersedeMixBatch(run, command, occurredAt);
    case "mix-application.record":
      return recordMixApplication(run, command.application, occurredAt);
    case "media.attach":
      return attachMedia(run, command.asset, occurredAt);
    case "measurements.import":
      return importMeasurements(run, command.batch, occurredAt);
  }
}

function cloneAndStartLive(
  source: RunPackage,
  command: Extract<RunCommand, { kind: "live.clone-and-start" }>,
  occurredAt: string,
): DomainResult<RunPackage> {
  if (source.executionMode !== "simulation")
    return blocked(
      "executionMode",
      "Nur eine Simulation kann als neuer Live-Run gestartet werden.",
    );
  const anchorMs = Date.parse(command.startedAtUtc);
  if (!Number.isFinite(anchorMs))
    return invalid("startedAtUtc", "Der Aussaatzeitpunkt ist ungültig.");
  if (anchorMs > Date.parse(occurredAt) + 60_000)
    return invalid(
      "startedAtUtc",
      "Der Aussaatzeitpunkt darf nicht in der Zukunft liegen.",
    );
  if (!command.timeZoneAtConfirmation.trim())
    return invalid("timeZoneAtConfirmation", "Die bestätigte Zeitzone fehlt.");

  const fresh = createDefaultRunPackage(new Date(occurredAt));
  const zoneMap = new Map(
    source.zones.map((zone) => [zone.id, crypto.randomUUID()]),
  );
  const zones = source.zones.map((zone) => ({
    ...structuredClone(zone),
    id: zoneMap.get(zone.id) ?? zone.id,
  }));
  const plants = source.plants.map((plant) => ({
    ...structuredClone(plant),
    id: crypto.randomUUID(),
    zoneId:
      zoneMap.get(plant.zoneId) ??
      zones[0]?.id ??
      fresh.zones[0]?.id ??
      "unassigned-zone",
    status: "active" as const,
  }));
  const runId = fresh.id;
  const anchorId = crypto.randomUUID();
  const growthEvents = plants.map((plant) => ({
    id: crypto.randomUUID(),
    plantId: plant.id,
    kind: "seed-planted" as const,
    occurredAt: command.startedAtUtc,
    day: 0,
    observedBy: "user" as const,
    confidence: "confirmed" as const,
    notes: "Aussaat beim Live-Start bestätigt.",
    photoIds: [],
  }));
  const domain: DomainEvent = {
    id: crypto.randomUUID(),
    schemaVersion: "1.0.0",
    aggregateType: "run",
    aggregateId: runId,
    type: "live.started",
    occurredAt: command.startedAtUtc,
    recordedAt: occurredAt,
    actor: "user",
    source: "ukd-live-preflight",
    payload: {
      sourceSimulationRunId: source.id,
      anchorId,
      kind: "seed-planted",
    },
  };
  const audit: AuditEvent = {
    id: crypto.randomUUID(),
    occurredAt,
    action: "live-started",
    entityType: "run",
    entityId: runId,
    detail: `Live-Run aus Simulation ${source.id} gestartet; UTC-Anker ${command.startedAtUtc}.`,
  };
  const timeline: RunEvent = {
    id: crypto.randomUUID(),
    day: 0,
    occurredAt: command.startedAtUtc,
    category: "live",
    title: "Live-Run gestartet",
    detail:
      "Aussaat bestätigt; der operative Tag folgt exakten 24-Stunden-Perioden.",
    relatedEntityId: anchorId,
  };
  const config = structuredClone(source.config);
  const value: RunPackage = {
    ...fresh,
    status: "active",
    config,
    configurationSnapshot: {
      id: crypto.randomUUID(),
      version: 1,
      capturedAt: occurredAt,
      config: structuredClone(config),
      evidenceVersion: source.configurationSnapshot.evidenceVersion,
      immutable: true,
    },
    zones,
    plants,
    devices: structuredClone(source.devices),
    equipment: structuredClone(source.equipment),
    cultivarProfiles: structuredClone(source.cultivarProfiles),
    nutrientSystems: structuredClone(source.nutrientSystems),
    growthEvents,
    auditEvents: [audit],
    domainEvents: [domain],
    events: [timeline],
    executionMode: "live",
    sourceSimulationRunId: source.id,
    liveAnchor: {
      id: anchorId,
      kind: "seed-planted",
      startedAtUtc: command.startedAtUtc,
      confirmedAtUtc: occurredAt,
      timeZoneAtConfirmation: command.timeZoneAtConfirmation,
    },
    clockHealth: {
      status: "healthy",
      lastObservedAtUtc: occurredAt,
      detail: null,
    },
    backupState: { ...fresh.backupState, pending: true },
  };
  return { ok: true, value, events: [domain] };
}

function correctLiveAnchor(
  run: RunPackage,
  command: Extract<RunCommand, { kind: "live.correct-anchor" }>,
  occurredAt: string,
): DomainResult<RunPackage> {
  if (run.executionMode !== "live" || !run.liveAnchor)
    return blocked(
      "liveAnchor",
      "Nur ein Live-Run besitzt einen korrigierbaren Aussaatanker.",
    );
  if (command.reason.trim().length < 8)
    return invalid(
      "reason",
      "Eine nachvollziehbare Begründung ist erforderlich.",
    );
  if (!Number.isFinite(Date.parse(command.nextStartedAtUtc)))
    return invalid("nextStartedAtUtc", "Der neue UTC-Anker ist ungültig.");
  const revision = {
    id: crypto.randomUUID(),
    previousStartedAtUtc: run.liveAnchor.startedAtUtc,
    nextStartedAtUtc: command.nextStartedAtUtc,
    reason: command.reason.trim(),
    correctedAtUtc: occurredAt,
  };
  return commit(
    run,
    {
      liveAnchor: { ...run.liveAnchor, startedAtUtc: command.nextStartedAtUtc },
      anchorRevisions: [revision, ...run.anchorRevisions],
      clockHealth: {
        status: "healthy",
        lastObservedAtUtc: occurredAt,
        detail: null,
      },
      backupState: { ...run.backupState, pending: true },
    },
    {
      domainType: "live.anchor-corrected",
      auditAction: "live-anchor-corrected",
      category: "live",
      entityType: "live-anchor",
      entityId: run.liveAnchor.id,
      title: "Aussaatanker korrigiert",
      detail: command.reason.trim(),
      occurredAt,
    },
  );
}

function completeLive(
  run: RunPackage,
  command: Extract<RunCommand, { kind: "live.complete" }>,
  occurredAt: string,
): DomainResult<RunPackage> {
  if (run.executionMode !== "live" || !run.liveAnchor)
    return blocked(
      "executionMode",
      "Nur ein Live-Run kann abgeschlossen werden.",
    );
  if (command.reason.trim().length < 3)
    return invalid("reason", "Ein Abschlussgrund ist erforderlich.");
  return commit(
    run,
    { status: "archived", backupState: { ...run.backupState, pending: true } },
    {
      domainType: "live.completed",
      auditAction: "live-completed",
      category: "live",
      entityType: "run",
      entityId: run.id,
      title: "Live-Run abgeschlossen",
      detail: command.reason.trim(),
      occurredAt,
    },
  );
}

function reviewAiProposal(
  run: RunPackage,
  command: Extract<
    RunCommand,
    { kind: "ai-proposal.accept" | "ai-proposal.reject" }
  >,
  decision: AiProposalReview["decision"],
  occurredAt: string,
): DomainResult<RunPackage> {
  if (command.reason.trim().length < 3)
    return invalid("reason", "Die Entscheidung benötigt eine Begründung.");
  if (
    run.aiProposalReviews.some(
      (entry) =>
        entry.proposalId === command.proposalId &&
        entry.fileSha256 === command.fileSha256,
    )
  )
    return duplicate(
      "proposalId",
      "Dieser AI-Vorschlag wurde bereits entschieden.",
    );
  const review: AiProposalReview = {
    id: crypto.randomUUID(),
    proposalId: command.proposalId,
    fileSha256: command.fileSha256,
    decision,
    reason: command.reason.trim(),
    decidedAtUtc: occurredAt,
    targetPath: command.targetPath,
  };
  let config = run.config;
  if (
    decision === "accepted" &&
    "value" in command &&
    run.executionMode === "simulation" &&
    run.status === "draft"
  ) {
    const allowed = new Set([
      "config.name",
      "config.genetics",
      "config.mediumProduct",
      "config.irrigationSystem",
    ]);
    if (!allowed.has(command.targetPath))
      return blocked(
        "targetPath",
        "Dieses Feld darf nicht durch einen AI-Vorschlag verändert werden.",
      );
    const key = command.targetPath.slice("config.".length) as
      "name" | "genetics" | "mediumProduct" | "irrigationSystem";
    if (typeof command.value !== "string")
      return invalid("value", "Der Vorschlagswert muss Text sein.");
    config = { ...run.config, [key]: command.value };
  }
  return commit(
    run,
    {
      config,
      aiProposalReviews: [review, ...run.aiProposalReviews],
      backupState: { ...run.backupState, pending: true },
    },
    {
      domainType:
        decision === "accepted"
          ? "ai-proposal.accepted"
          : "ai-proposal.rejected",
      auditAction:
        decision === "accepted"
          ? "ai-proposal-accepted"
          : "ai-proposal-rejected",
      category: "ai-review",
      entityType: "ai-proposal",
      entityId: command.proposalId,
      title:
        decision === "accepted"
          ? "AI-Vorschlag angenommen"
          : "AI-Vorschlag abgelehnt",
      detail: `${command.targetPath}: ${command.reason.trim()}`,
      occurredAt,
    },
  );
}

function recordBackupCheckpoint(
  run: RunPackage,
  command: Extract<RunCommand, { kind: "backup.checkpoint" }>,
  occurredAt: string,
): DomainResult<RunPackage> {
  if (!/^[a-f0-9]{64}$/i.test(command.sha256))
    return invalid("sha256", "Checkpoint-Hash ist ungültig.");
  return commit(
    run,
    {
      backupState: {
        ...run.backupState,
        pending: false,
        lastCheckpointAtUtc: occurredAt,
        lastCheckpointSha256: command.sha256,
        lastVerifiedAtUtc: command.verified
          ? occurredAt
          : run.backupState.lastVerifiedAtUtc,
      },
      backupCheckpoints: [
        {
          id: command.checkpointId,
          createdAtUtc: occurredAt,
          sha256: command.sha256,
          kind: command.checkpointKind,
          verified: command.verified,
        },
        ...run.backupCheckpoints,
      ].slice(0, 120),
    },
    {
      domainType: "backup.checkpoint",
      auditAction: "backup-checkpoint",
      category: "backup",
      entityType: "backup-checkpoint",
      entityId: command.checkpointId,
      title: "Backup-Checkpoint verifiziert",
      detail: `${command.checkpointKind} · ${command.sha256.slice(0, 12)}`,
      occurredAt,
      actor: "system",
    },
  );
}

function createMixBatch(
  run: RunPackage,
  input: Extract<RunCommand, { kind: "mix-batch.create" }>["batch"],
  occurredAt: string,
): DomainResult<RunPackage> {
  if (!Number.isFinite(input.finalVolumeLiters) || input.finalVolumeLiters <= 0)
    return invalid(
      "batch.finalVolumeLiters",
      "Tatsächliches Endvolumen muss positiv sein.",
    );
  if (input.components.length === 0)
    return invalid(
      "batch.components",
      "Die Charge benötigt mindestens eine dokumentierte Komponente.",
    );
  if (
    input.components.some(
      (entry) => entry.actualDoseMlPerL === null || entry.actualDoseMlPerL < 0,
    )
  )
    return invalid(
      "batch.components.actualDoseMlPerL",
      "Ist-Dosen müssen vollständig und nichtnegativ sein.",
    );
  const id = input.id ?? crypto.randomUUID();
  if (run.mixBatches.some((entry) => entry.id === id))
    return duplicate("batch.id", "Mix-Charge ist bereits vorhanden.");
  const batch: MixBatchRecord = {
    ...input,
    id,
    runId: run.id,
    revision: 1,
  };
  return commit(
    run,
    { mixBatches: [batch, ...run.mixBatches] },
    {
      domainType: "mix-batch.created",
      auditAction: "mix-batch-created",
      category: "mix-batch",
      entityType: "mix-batch",
      entityId: id,
      title: "Mix-Charge erfasst",
      detail: `${batch.batchLabel}: ${batch.finalVolumeLiters} L`,
      occurredAt,
    },
  );
}

function importMeasurements(
  run: RunPackage,
  batch: ImportBatch,
  occurredAt: string,
): DomainResult<RunPackage> {
  if (
    batch.status !== "validated" ||
    batch.findings.some((entry) => entry.severity === "error")
  )
    return blocked(
      "batch",
      "Nur fehlerfrei validierte Import-Batches dürfen übernommen werden.",
    );
  if (batch.records.length === 0)
    return invalid("batch.records", "Der Import enthält keine Messwerte.");
  if (
    run.measurements.some((entry) =>
      entry.reading.source.reference.includes(batch.fileSha256),
    )
  )
    return duplicate(
      "batch.fileSha256",
      "Diese Datei wurde bereits in den Run importiert.",
    );
  const zoneId = run.zones[0]?.id;
  if (!zoneId) return missing("run.zones", "Der Run besitzt keine Zielzone.");
  const measurements: Measurement[] = batch.records.map((record) => ({
    id: crypto.randomUUID(),
    runId: run.id,
    zoneId,
    metric: record.metric,
    reading: {
      value: record.value,
      unit: record.unit,
      semantic: "measured",
      source: {
        kind: "import",
        reference: `${batch.connectorId}:${batch.fileSha256}:${record.source}`,
        actor: "connector",
      },
      timestamp: record.timestamp,
      quality: "unverified",
      method: "validated-file-import",
    },
    measuredAt: record.timestamp,
    deviceId: record.deviceId,
    calibrationState: "unknown",
    trustStatus: "unverified",
  }));
  return commit(
    run,
    { measurements: [...measurements, ...run.measurements] },
    {
      domainType: "run.imported",
      auditAction: "imported",
      category: "import",
      entityType: "import-batch",
      entityId: batch.id,
      title: "Messdatei importiert",
      detail: `${batch.fileName}: ${measurements.length} unbestätigte Messwerte`,
      occurredAt,
      actor: "connector",
      source: batch.connectorId,
    },
  );
}

function recordIpm(
  run: RunPackage,
  input: NewIpmInspection,
  occurredAt: string,
): DomainResult<RunPackage> {
  if (!input.finding.trim())
    return invalid("inspection.finding", "Befund fehlt.");
  if (!input.location.trim())
    return invalid("inspection.location", "Inspektionsort fehlt.");
  if (input.day < 0 || !Number.isInteger(input.day))
    return invalid(
      "inspection.day",
      "Run-Tag muss eine nichtnegative Ganzzahl sein.",
    );
  if (input.plantId && !run.plants.some((plant) => plant.id === input.plantId))
    return missing("inspection.plantId", "Pflanze wurde nicht gefunden.");
  const id = input.id ?? crypto.randomUUID();
  if (run.ipmInspections.some((entry) => entry.id === id))
    return duplicate("inspection.id", "IPM-ID ist bereits vorhanden.");
  const inspection: IpmInspection = {
    ...input,
    id,
    runId: run.id,
    status: "open",
    outcome: null,
    closedAt: null,
    followUpCompleted: false,
    updatedAt: occurredAt,
    revision: 1,
  };
  return commit(
    run,
    { ipmInspections: [inspection, ...run.ipmInspections] },
    {
      domainType: "ipm-inspection.recorded",
      auditAction: "ipm-inspection-recorded",
      category: "ipm",
      entityType: "ipm-inspection",
      entityId: id,
      title: "IPM-Inspektion erfasst",
      detail: `${inspection.severity}: ${inspection.finding}`,
      occurredAt,
    },
  );
}

function transitionIpm(
  run: RunPackage,
  command: Extract<RunCommand, { kind: "ipm.transition" }>,
  occurredAt: string,
): DomainResult<RunPackage> {
  const current = run.ipmInspections.find(
    (entry) => entry.id === command.inspectionId,
  );
  if (!current)
    return missing("inspectionId", "IPM-Inspektion wurde nicht gefunden.");
  const from = current.status ?? (current.closedAt ? "closed" : "open");
  if (!ipmTransitions[from].includes(command.status))
    return transitionError(
      "status",
      `IPM-Transition ${from} → ${command.status} ist nicht zulässig.`,
    );
  if (!command.reason.trim())
    return invalid("reason", "Ein Übergangsgrund ist erforderlich.");
  const outcome = command.outcome?.trim() || current.outcome;
  const followUpCompleted =
    command.followUpCompleted ?? current.followUpCompleted ?? false;
  if (command.status === "closed" && (!outcome || !followUpCompleted))
    return blocked(
      "status",
      "Schließen erfordert ein Ergebnis und einen abgeschlossenen Follow-up.",
    );
  const next: IpmInspection = {
    ...current,
    status: command.status,
    action: command.action?.trim() || current.action,
    outcome,
    followUpCompleted,
    updatedAt: occurredAt,
    closedAt: command.status === "closed" ? occurredAt : null,
    revision: (current.revision ?? 1) + 1,
  };
  return commit(
    run,
    {
      ipmInspections: run.ipmInspections.map((entry) =>
        entry.id === next.id ? next : entry,
      ),
    },
    {
      domainType: "ipm-inspection.recorded",
      auditAction: "ipm-inspection-recorded",
      category: "ipm",
      entityType: "ipm-inspection",
      entityId: next.id,
      title: `IPM: ${from} → ${command.status}`,
      detail: command.reason.trim(),
      occurredAt,
    },
  );
}

function createIncident(
  run: RunPackage,
  input: NewIncident,
  occurredAt: string,
): DomainResult<RunPackage> {
  if (!input.description.trim())
    return invalid("incident.description", "Incident-Beschreibung fehlt.");
  if (input.detectedDay < 0 || !Number.isInteger(input.detectedDay))
    return invalid("incident.detectedDay", "Run-Tag ist ungültig.");
  for (const equipmentId of input.affectedEquipmentIds) {
    if (!run.equipment.some((entry) => entry.id === equipmentId))
      return missing(
        "incident.affectedEquipmentIds",
        `Equipment ${equipmentId} fehlt.`,
      );
  }
  for (const plantId of input.affectedPlantIds) {
    if (!run.plants.some((entry) => entry.id === plantId))
      return missing("incident.affectedPlantIds", `Pflanze ${plantId} fehlt.`);
  }
  const id = input.id ?? crypto.randomUUID();
  if (run.incidents.some((entry) => entry.id === id))
    return duplicate("incident.id", "Incident-ID ist bereits vorhanden.");
  const incident: IncidentRecord = {
    ...input,
    id,
    runId: run.id,
    status: "open",
    actions: [],
    resolvedAt: null,
    rootCause: null,
    lessonsLearned: "",
    planSuperseded:
      input.planSuperseded ||
      input.severity === "high" ||
      input.severity === "critical",
    updatedAt: occurredAt,
    revision: 1,
  };
  return commit(
    run,
    { incidents: [incident, ...run.incidents] },
    {
      domainType: "incident.created",
      auditAction: "incident-created",
      category: "incident",
      entityType: "incident",
      entityId: id,
      title: `Incident: ${incident.category}`,
      detail: incident.description,
      occurredAt,
    },
  );
}

function transitionIncident(
  run: RunPackage,
  command: Extract<RunCommand, { kind: "incident.transition" }>,
  occurredAt: string,
): DomainResult<RunPackage> {
  const current = run.incidents.find(
    (entry) => entry.id === command.incidentId,
  );
  if (!current) return missing("incidentId", "Incident wurde nicht gefunden.");
  if (!incidentTransitions[current.status].includes(command.status))
    return transitionError(
      "status",
      `Incident-Transition ${current.status} → ${command.status} ist nicht zulässig.`,
    );
  if (!command.reason.trim())
    return invalid("reason", "Ein Übergangsgrund ist erforderlich.");
  const rootCause = command.rootCause?.trim() || current.rootCause;
  const lessonsLearned =
    command.lessonsLearned?.trim() || current.lessonsLearned;
  if (command.status === "closed" && (!rootCause || !lessonsLearned.trim()))
    return blocked(
      "status",
      "Schließen erfordert Root Cause und Lessons Learned.",
    );
  const action: IncidentAction | null = command.action
    ? {
        id: crypto.randomUUID(),
        performedAt: occurredAt,
        action: command.action.action.trim(),
        result: command.action.result.trim(),
      }
    : null;
  const next: IncidentRecord = {
    ...current,
    status: command.status,
    actions: action ? [action, ...current.actions] : current.actions,
    rootCause,
    lessonsLearned,
    resolvedAt:
      command.status === "resolved" || command.status === "closed"
        ? (current.resolvedAt ?? occurredAt)
        : null,
    planSuperseded:
      command.status === "closed" ? false : current.planSuperseded,
    updatedAt: occurredAt,
    revision: (current.revision ?? 1) + 1,
  };
  return commit(
    run,
    {
      incidents: run.incidents.map((entry) =>
        entry.id === next.id ? next : entry,
      ),
    },
    {
      domainType: "incident.updated",
      auditAction: "incident-updated",
      category: "incident",
      entityType: "incident",
      entityId: next.id,
      title: `Incident: ${current.status} → ${command.status}`,
      detail: command.reason.trim(),
      occurredAt,
    },
  );
}

function addEquipment(
  run: RunPackage,
  input: Extract<RunCommand, { kind: "equipment.add" }>["equipment"],
  occurredAt: string,
): DomainResult<RunPackage> {
  if (!input.manufacturer.trim() || !input.model.trim())
    return invalid("equipment", "Hersteller und Modell sind erforderlich.");
  const id = input.id ?? crypto.randomUUID();
  if (run.equipment.some((entry) => entry.id === id))
    return duplicate("equipment.id", "Equipment-ID ist bereits vorhanden.");
  const equipment: EquipmentProfile = {
    ...input,
    id,
    status: "active",
    version: 1,
    revision: 1,
  };
  return commit(
    run,
    { equipment: [equipment, ...run.equipment] },
    {
      domainType: "equipment.added",
      auditAction: "equipment-added",
      category: "equipment",
      entityType: "equipment",
      entityId: id,
      title: "Equipment hinzugefügt",
      detail: `${equipment.manufacturer} ${equipment.model}`,
      occurredAt,
    },
  );
}

function recordMaintenance(
  run: RunPackage,
  input: Extract<RunCommand, { kind: "maintenance.record" }>["maintenance"],
  occurredAt: string,
): DomainResult<RunPackage> {
  if (!run.equipment.some((entry) => entry.id === input.equipmentId))
    return missing(
      "maintenance.equipmentId",
      "Equipment wurde nicht gefunden.",
    );
  if (!input.performedBy.trim())
    return invalid("maintenance.performedBy", "Ausführende Person fehlt.");
  const id = input.id ?? crypto.randomUUID();
  if (run.maintenanceEvents.some((entry) => entry.id === id))
    return duplicate("maintenance.id", "Wartungs-ID ist bereits vorhanden.");
  const maintenance: MaintenanceEvent = { ...input, id };
  const equipment = run.equipment.map((entry) =>
    entry.id === input.equipmentId
      ? {
          ...entry,
          status:
            input.result === "failed"
              ? ("failed" as const)
              : ("active" as const),
          revision: (entry.revision ?? 1) + 1,
        }
      : entry,
  );
  return commit(
    run,
    { maintenanceEvents: [maintenance, ...run.maintenanceEvents], equipment },
    {
      domainType: "maintenance.recorded",
      auditAction: "maintenance-recorded",
      category: "maintenance",
      entityType: "maintenance",
      entityId: id,
      title: "Wartung dokumentiert",
      detail: `${maintenance.type}: ${maintenance.result}`,
      occurredAt,
    },
  );
}

function adjustInventory(
  run: RunPackage,
  input: Extract<RunCommand, { kind: "product-inventory.adjust" }>["item"],
  occurredAt: string,
): DomainResult<RunPackage> {
  if (!input.productName.trim())
    return invalid("item.productName", "Produktname fehlt.");
  const existing = input.id
    ? run.productInventory.find((entry) => entry.id === input.id)
    : undefined;
  const item: InventoryItem = {
    ...input,
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    revision: (existing?.revision ?? 0) + 1,
  };
  const productInventory = existing
    ? run.productInventory.map((entry) => (entry.id === item.id ? item : entry))
    : [item, ...run.productInventory];
  return commit(
    run,
    { productInventory },
    {
      domainType: "product-inventory.adjusted",
      auditAction: "product-inventory-adjusted",
      category: "action",
      entityType: "product-inventory",
      entityId: item.id,
      title: "Produktbestand aktualisiert",
      detail: item.productName,
      occurredAt,
    },
  );
}

function recordReservoir(
  run: RunPackage,
  input: Extract<RunCommand, { kind: "reservoir.record" }>["reservoir"],
  occurredAt: string,
): DomainResult<RunPackage> {
  if (input.tankSizeLiters !== null && input.tankSizeLiters <= 0)
    return invalid("reservoir.tankSizeLiters", "Tankgröße muss positiv sein.");
  const reservoir: ReservoirProfile = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    recordedAt: occurredAt,
    revision: 1,
  };
  if (run.reservoirs.some((entry) => entry.id === reservoir.id))
    return duplicate("reservoir.id", "Reservoir-ID ist bereits vorhanden.");
  return commit(
    run,
    { reservoirs: [reservoir, ...run.reservoirs] },
    {
      domainType: "reservoir.recorded",
      auditAction: "reservoir-recorded",
      category: "action",
      entityType: "reservoir",
      entityId: reservoir.id,
      title: "Reservoir erfasst",
      detail: `${reservoir.tankSizeLiters ?? "unbekannt"} L`,
      occurredAt,
    },
  );
}

function updateLungRoom(
  run: RunPackage,
  profile: LungRoomProfile,
  occurredAt: string,
): DomainResult<RunPackage> {
  if (
    profile.roomTempMinC !== null &&
    profile.roomTempMaxC !== null &&
    profile.roomTempMinC > profile.roomTempMaxC
  )
    return invalid("profile.temperature", "Minimum liegt über dem Maximum.");
  return commit(
    run,
    { lungRoom: { ...profile, measuredAt: profile.measuredAt ?? occurredAt } },
    {
      domainType: "lung-room.updated",
      auditAction: "lung-room-updated",
      category: "action",
      entityType: "lung-room",
      entityId: run.id,
      title: "Lung-Room-Profil aktualisiert",
      detail: profile.climateReserveNotes || "Messkorridor aktualisiert",
      occurredAt,
    },
  );
}

function recordEnergy(
  run: RunPackage,
  input: Extract<RunCommand, { kind: "energy.record" }>["reading"],
  occurredAt: string,
): DomainResult<RunPackage> {
  if (
    input.day < 0 ||
    input.kwhEstimate < 0 ||
    input.hoursPerDay < 0 ||
    input.hoursPerDay > 24 ||
    input.powerW < 0
  )
    return invalid(
      "reading",
      "Energieangaben liegen außerhalb des gültigen Bereichs.",
    );
  if (
    input.equipmentId &&
    !run.equipment.some((entry) => entry.id === input.equipmentId)
  )
    return missing("reading.equipmentId", "Equipment wurde nicht gefunden.");
  const reading: EnergyReading = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
  };
  return commit(
    run,
    { energyReadings: [reading, ...run.energyReadings] },
    {
      domainType: "energy.recorded",
      auditAction: "energy-recorded",
      category: "action",
      entityType: "energy-reading",
      entityId: reading.id,
      title: "Energie erfasst",
      detail: `${reading.category}: ${reading.kwhEstimate} kWh`,
      occurredAt,
    },
  );
}

function recordPostHarvest(
  run: RunPackage,
  input: Extract<RunCommand, { kind: "post-harvest.record" }>["record"],
  occurredAt: string,
): DomainResult<RunPackage> {
  if (!run.plants.some((entry) => entry.id === input.plantId))
    return missing("record.plantId", "Pflanze wurde nicht gefunden.");
  const existing = input.id
    ? run.postHarvest.find((entry) => entry.id === input.id)
    : undefined;
  const record: PostHarvestRecord = {
    ...input,
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    status:
      input.status ??
      (input.storageStartedAt
        ? "stored"
        : input.cureStartedAt
          ? "curing"
          : input.dryingStartedAt
            ? "drying"
            : "planned"),
    revision: (existing?.revision ?? 0) + 1,
  };
  const postHarvest = existing
    ? run.postHarvest.map((entry) => (entry.id === record.id ? record : entry))
    : [record, ...run.postHarvest];
  return commit(
    run,
    { postHarvest },
    {
      domainType: "post-harvest.recorded",
      auditAction: "post-harvest-recorded",
      category: "action",
      entityType: "post-harvest",
      entityId: record.id,
      title: "Post-Harvest aktualisiert",
      detail: record.status ?? "planned",
      occurredAt,
    },
  );
}

function upsertCultivar(
  run: RunPackage,
  input: Extract<RunCommand, { kind: "cultivar-profile.upsert" }>["profile"],
  occurredAt: string,
): DomainResult<RunPackage> {
  if (!input.name.trim() || !input.breeder.trim())
    return invalid("profile", "Name und Breeder sind erforderlich.");
  const existing = input.id
    ? run.cultivarProfiles.find((entry) => entry.id === input.id)
    : undefined;
  const profile: CultivarProfile = {
    ...input,
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    profileVersion: (existing?.profileVersion ?? 0) + 1,
    updatedAt: occurredAt,
  };
  const cultivarProfiles = existing
    ? run.cultivarProfiles.map((entry) =>
        entry.id === profile.id ? profile : entry,
      )
    : [profile, ...run.cultivarProfiles];
  return commit(
    run,
    { cultivarProfiles },
    {
      domainType: "cultivar-profile.updated",
      auditAction: "cultivar-profile-updated",
      category: "action",
      entityType: "cultivar-profile",
      entityId: profile.id,
      title: "Cultivar-Profil aktualisiert",
      detail: `${profile.breeder} · ${profile.name}`,
      occurredAt,
    },
  );
}

function upsertNutrientSystem(
  run: RunPackage,
  input: Extract<RunCommand, { kind: "nutrient-system.upsert" }>["profile"],
  occurredAt: string,
): DomainResult<RunPackage> {
  if (!input.name.trim() || !input.evidenceRef.trim())
    return invalid("profile", "Name und Evidenzreferenz sind erforderlich.");
  if (
    input.status === "operational" &&
    (!input.ruleBundleVersion ||
      input.products.length === 0 ||
      input.mixOrder.length === 0)
  )
    return blocked(
      "profile.status",
      "Operational benötigt Regelpaketversion, Produkte und Mischreihenfolge.",
    );
  const existing = run.nutrientSystems.find((entry) => entry.id === input.id);
  const profile: NutrientSystemProfile = {
    ...input,
    revision: (existing?.revision ?? 0) + 1,
  };
  const nutrientSystems = existing
    ? run.nutrientSystems.map((entry) =>
        entry.id === profile.id ? profile : entry,
      )
    : [profile, ...run.nutrientSystems];
  return commit(
    run,
    { nutrientSystems },
    {
      domainType: "nutrient-system.updated",
      auditAction: "nutrient-system-updated",
      category: "action",
      entityType: "nutrient-system",
      entityId: profile.id,
      title: "Nährstoffsystem aktualisiert",
      detail: `${profile.name}: ${profile.status ?? "reference"}`,
      occurredAt,
    },
  );
}

function supersedeMixBatch(
  run: RunPackage,
  command: Extract<RunCommand, { kind: "mix-batch.supersede" }>,
  occurredAt: string,
): DomainResult<RunPackage> {
  const original = run.mixBatches.find(
    (entry) => entry.id === command.originalBatchId,
  );
  if (!original)
    return missing("originalBatchId", "Originalcharge wurde nicht gefunden.");
  if (original.supersededBy)
    return blocked("originalBatchId", "Originalcharge wurde bereits ersetzt.");
  if (!command.reason.trim())
    return invalid("reason", "Korrekturgrund ist erforderlich.");
  if (command.replacement.finalVolumeLiters <= 0)
    return invalid(
      "replacement.finalVolumeLiters",
      "Endvolumen muss positiv sein.",
    );
  const id = command.replacement.id ?? crypto.randomUUID();
  const replacement: MixBatchRecord = {
    ...command.replacement,
    id,
    runId: run.id,
    supersedesBatchId: original.id,
    correctionReason: command.reason.trim(),
    revision: 1,
  };
  const mixBatches = [
    replacement,
    ...run.mixBatches.map((entry) =>
      entry.id === original.id ? { ...entry, supersededBy: id } : entry,
    ),
  ];
  return commit(
    run,
    { mixBatches },
    {
      domainType: "mix-batch.superseded",
      auditAction: "mix-batch-superseded",
      category: "mix-batch",
      entityType: "mix-batch",
      entityId: original.id,
      title: "Mix-Charge korrigiert",
      detail: command.reason.trim(),
      occurredAt,
    },
  );
}

function recordMixApplication(
  run: RunPackage,
  input: Extract<RunCommand, { kind: "mix-application.record" }>["application"],
  occurredAt: string,
): DomainResult<RunPackage> {
  if (
    !run.mixBatches.some(
      (entry) => entry.id === input.mixBatchId && !entry.supersededBy,
    )
  )
    return missing(
      "application.mixBatchId",
      "Aktive Mix-Charge wurde nicht gefunden.",
    );
  if (input.volumeLiters <= 0)
    return invalid(
      "application.volumeLiters",
      "Applikationsvolumen muss positiv sein.",
    );
  if (input.plantIds.length === 0)
    return invalid(
      "application.plantIds",
      "Mindestens eine Pflanze ist erforderlich.",
    );
  for (const plantId of input.plantIds) {
    if (!run.plants.some((entry) => entry.id === plantId))
      return missing("application.plantIds", `Pflanze ${plantId} fehlt.`);
  }
  const application: MixApplication = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    runId: run.id,
    revision: 1,
  };
  return commit(
    run,
    { mixApplications: [application, ...run.mixApplications] },
    {
      domainType: "mix-application.recorded",
      auditAction: "mix-application-recorded",
      category: "action",
      entityType: "mix-application",
      entityId: application.id,
      title: "Mix appliziert",
      detail: `${application.volumeLiters} L · ${application.plantIds.length} Pflanze(n)`,
      occurredAt,
    },
  );
}

function attachMedia(
  run: RunPackage,
  input: Extract<RunCommand, { kind: "media.attach" }>["asset"],
  occurredAt: string,
): DomainResult<RunPackage> {
  if (!/^[A-Fa-f0-9]{64}$/.test(input.sha256))
    return invalid("asset.sha256", "SHA-256 muss 64 Hex-Zeichen enthalten.");
  if (input.width <= 0 || input.height <= 0 || input.byteLength <= 0)
    return invalid(
      "asset",
      "Medienabmessungen und Dateigröße müssen positiv sein.",
    );
  if (!entityExists(run, input.entityType, input.entityId))
    return missing(
      "asset.entityId",
      "Referenzierte Fachentität wurde nicht gefunden.",
    );
  const asset: MediaAsset = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    runId: run.id,
    revision: 1,
  };
  if (
    run.mediaAssets.some(
      (entry) => entry.id === asset.id || entry.sha256 === asset.sha256,
    )
  )
    return duplicate(
      "asset",
      "Medium oder identischer Datei-Hash ist bereits vorhanden.",
    );
  return commit(
    run,
    { mediaAssets: [asset, ...run.mediaAssets] },
    {
      domainType: "media.attached",
      auditAction: "media-attached",
      category: "photo",
      entityType: "media",
      entityId: asset.id,
      title: "Medium verknüpft",
      detail: `${asset.mimeType} · ${asset.width}×${asset.height}`,
      occurredAt,
    },
  );
}

interface CommitMetadata {
  domainType: DomainEventType;
  auditAction: AuditEvent["action"];
  category: RunEvent["category"];
  entityType: string;
  entityId: string;
  title: string;
  detail: string;
  occurredAt: string;
  actor?: DomainEvent["actor"];
  source?: string;
}

function commit(
  run: RunPackage,
  patch: Partial<RunPackage>,
  metadata: CommitMetadata,
): DomainResult<RunPackage> {
  const domainEvent: DomainEvent = {
    id: crypto.randomUUID(),
    schemaVersion: "1.0.0",
    aggregateType: "run",
    aggregateId: run.id,
    type: metadata.domainType,
    occurredAt: metadata.occurredAt,
    recordedAt: metadata.occurredAt,
    actor: metadata.actor ?? "user",
    source: metadata.source ?? "ukd-run-command",
    payload: { entityType: metadata.entityType, entityId: metadata.entityId },
  };
  const auditEvent: AuditEvent = {
    id: crypto.randomUUID(),
    occurredAt: metadata.occurredAt,
    action: metadata.auditAction,
    entityType: metadata.entityType,
    entityId: metadata.entityId,
    detail: metadata.detail,
  };
  const runEvent: RunEvent = {
    id: crypto.randomUUID(),
    day: dayFromTimestamp(run, metadata.occurredAt),
    occurredAt: metadata.occurredAt,
    category: metadata.category,
    title: metadata.title,
    detail: metadata.detail,
    relatedEntityId: metadata.entityId,
  };
  return {
    ok: true,
    value: {
      ...run,
      ...patch,
      updatedAt: metadata.occurredAt,
      domainEvents: [domainEvent, ...run.domainEvents],
      auditEvents: [auditEvent, ...run.auditEvents],
      events: [runEvent, ...run.events],
    },
    events: [domainEvent],
  };
}

function entityExists(
  run: RunPackage,
  type: MediaAsset["entityType"],
  id: string,
): boolean {
  switch (type) {
    case "plant":
      return run.plants.some((entry) => entry.id === id);
    case "ipm":
      return run.ipmInspections.some((entry) => entry.id === id);
    case "incident":
      return run.incidents.some((entry) => entry.id === id);
    case "post-harvest":
      return run.postHarvest.some((entry) => entry.id === id);
    case "observation":
      return (
        run.observations.some((entry) => entry.id === id) ||
        run.structuredObservations.some((entry) => entry.id === id)
      );
  }
}

function dayFromTimestamp(run: RunPackage, timestamp: string): number {
  const start = new Date(
    `${run.configurationSnapshot.config.startDate}T00:00:00Z`,
  );
  const value = new Date(timestamp);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(value.getTime()))
    return 0;
  return Math.max(
    0,
    Math.floor((value.getTime() - start.getTime()) / 86_400_000),
  );
}

function invalid(path: string, message: string): DomainResult<never> {
  return { ok: false, errors: [{ code: "invalid-input", path, message }] };
}

function missing(path: string, message: string): DomainResult<never> {
  return { ok: false, errors: [{ code: "not-found", path, message }] };
}

function duplicate(path: string, message: string): DomainResult<never> {
  return { ok: false, errors: [{ code: "duplicate", path, message }] };
}

function transitionError(path: string, message: string): DomainResult<never> {
  return { ok: false, errors: [{ code: "invalid-transition", path, message }] };
}

function blocked(path: string, message: string): DomainResult<never> {
  return { ok: false, errors: [{ code: "safety-blocked", path, message }] };
}
