export type CellValue = string | number | boolean | null;

export interface WorkbookSheet {
  range: string;
  values: CellValue[][];
  formulas: string[][];
}

export type Workbook = Record<string, WorkbookSheet>;
export type ExperienceLens = "guided" | "advanced" | "expert";
export type RouteId =
  | "cockpit"
  | "setup"
  | "log"
  | "today"
  | "timeline"
  | "history"
  | "mix"
  | "climate"
  | "nutrients"
  | "products"
  | "compatibility"
  | "diagnostics"
  | "knowledge"
  | "audit"
  | "raw"
  | "legal"
  | "reports"
  | "system";

export interface Source {
  id: string;
  title: string;
  publisher: string;
  type: string;
  url: string;
  checkedAt: string;
}

export interface KnowledgeClaim {
  id: string;
  title: string;
  statement: string;
  status: string;
  evidence: "A" | "B" | "C" | "D" | "E";
  scope: string;
  uncertainty: string;
  sourceIds: string[];
}

export interface KnowledgeBase {
  schemaVersion: string;
  reviewedAt: string;
  scope: string;
  evidenceScale: Record<string, string>;
  claims: KnowledgeClaim[];
  sources: Source[];
}

export type LegalBasis =
  "kcang-private" | "medcang-prescription" | "medcang-section-4-permit";

export interface LegalAuthorization {
  legalBasis: LegalBasis;
  documentVerified: boolean;
  validFrom: string | null;
  validUntil: string | null;
  authorizedActivities: Array<
    "possess" | "acquire-from-pharmacy" | "cultivate" | "destroy"
  >;
  limits: {
    livePlants: number | null;
    dispensedGramsPerPeriod: number | null;
    retainedDryGrams: number | null;
  };
}

export interface LegalProfile {
  schemaVersion: string;
  jurisdiction: "DE";
  verifiedAt: string | null;
  authorizations: LegalAuthorization[];
  planning: {
    yieldModel: "technical-capacity-unconstrained";
    inventoryGateRequired: true;
    destructionLogRequired: true;
  };
}

export interface AuditFinding {
  id: string;
  severity: string;
  area: string;
  finding: string;
  risk: string;
  correction: string;
  evidence: string;
  status: string;
  uncertainty: string;
  priority: string;
}

export type DataSemantic =
  | "target"
  | "measured"
  | "derived"
  | "simulated"
  | "user-assumption"
  | "manufacturer-reference"
  | "missing";

export type DataStatus = DataSemantic | "stale";

export type ScientificUnit =
  | "pH"
  | "mS/cm"
  | "°C"
  | "%"
  | "µmol/m²/s"
  | "mol/m²/d"
  | "kPa"
  | "ppm"
  | "L"
  | "cm"
  | "g"
  | "mg/L";

export interface DataSource {
  kind:
    | "canonical-plan"
    | "manual"
    | "calculation"
    | "import"
    | "sensor"
    | "manufacturer";
  reference: string;
  actor?: string;
}

export type QualityStatus =
  "unknown" | "unverified" | "plausible" | "verified" | "rejected";

export interface ScientificValue<T> {
  value: T | null;
  unit?: ScientificUnit;
  semantic: DataSemantic;
  source: DataSource;
  timestamp?: string;
  validAt?: string;
  quality?: QualityStatus;
  evidenceRef?: string;
  stale?: boolean;
}

export interface RunConfig {
  name: string;
  genetics: string;
  startDate: string;
  endDay: number;
  plantCount: number;
  tentWidthCm: number;
  tentDepthCm: number;
  tentHeightCm: number;
  ledMaxW: number;
  lightHours: number;
  medium: string;
  irrigationSystem: string;
  nutrientSystem: string;
  water: {
    sourcePh: number | null;
    sourceEc: number | null;
    calciumMgL: number | null;
    magnesiumMgL: number | null;
    alkalinityMgL: number | null;
  };
}

export interface ObservationValues {
  tempMax: number | null;
  tempMin: number | null;
  humidityMax: number | null;
  humidityMin: number | null;
  leafTemp: number | null;
  ppfd: number | null;
  phIn: number | null;
  ecIn: number | null;
  phDrain: number | null;
  ecDrain: number | null;
  waterLiters: number | null;
  plantHeightCm: number | null;
  stress: number | null;
}

export interface DailyObservation {
  id: string;
  day: number;
  recordedAt: string;
  source: "manual" | "import" | "sensor";
  status: Exclude<DataStatus, "target" | "simulated">;
  values: ObservationValues;
  notes: string;
}

export interface RunConfigurationSnapshot {
  id: string;
  version: number;
  capturedAt: string;
  config: RunConfig;
  evidenceVersion: string;
  immutable: true;
}

export interface Zone {
  id: string;
  name: string;
  kind: "tent" | "room" | "outdoor" | "other";
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
}

export interface Plant {
  id: string;
  zoneId: string;
  label: string;
  genetics: string;
  status: "planned" | "active" | "harvested" | "removed";
}

export type MeasurementMetric =
  | "temperature.air.max"
  | "temperature.air.min"
  | "temperature.leaf"
  | "humidity.relative.max"
  | "humidity.relative.min"
  | "light.ppfd"
  | "water.ph"
  | "water.ec"
  | "drain.ph"
  | "drain.ec"
  | "water.volume"
  | "plant.height"
  | "plant.stress";

export interface Measurement {
  id: string;
  runId: string;
  zoneId: string;
  plantId?: string;
  metric: MeasurementMetric;
  reading: ScientificValue<number>;
  measuredAt: string;
  deviceId?: string;
  calibrationState?: "unknown" | "valid" | "expired" | "failed";
  supersededBy?: string;
  correctionReason?: string;
}

export interface StructuredObservation {
  id: string;
  runId: string;
  zoneId: string;
  plantId?: string;
  observedAt: string;
  category:
    "foliage" | "root-zone" | "structure" | "pest" | "environment" | "general";
  severity: "info" | "mild" | "moderate" | "severe";
  text: string;
  tags: string[];
  photoIds: string[];
}

export type TaskRequirement = "required" | "recommended" | "optional";
export type TaskState = "planned" | "due" | "completed" | "skipped" | "blocked";

export interface RunTask {
  id: string;
  runId: string;
  day: number;
  type: string;
  title: string;
  requirement: TaskRequirement;
  dueAt: string | null;
  phase: string;
  state: TaskState;
  reason: string;
  evidenceRefs: string[];
  dependencies: string[];
  completedAt?: string;
}

export interface RunOverride {
  id: string;
  field: string;
  canonicalValue: unknown;
  overrideValue: unknown;
  evidenceConflict: string;
  reason: string;
  createdAt: string;
  reversedAt?: string;
  reversible: true;
}

export interface AuditEvent {
  id: string;
  occurredAt: string;
  action:
    | "run-created"
    | "run-activated"
    | "configuration-changed"
    | "measurement-recorded"
    | "measurement-superseded"
    | "observation-recorded"
    | "task-state-changed"
    | "override-created"
    | "override-reversed"
    | "imported"
    | "exported";
  entityType: string;
  entityId: string;
  detail: string;
}

export interface RunEvent {
  id: string;
  day: number;
  occurredAt: string;
  category:
    | "measurement"
    | "observation"
    | "task-completed"
    | "configuration-change"
    | "mix-created"
    | "watering"
    | "training"
    | "photo"
    | "warning"
    | "override"
    | "phase-change"
    | "evidence-update"
    | "import"
    | "export"
    | "action"
    | "note"
    | "system";
  title: string;
  detail: string;
  relatedEntityId?: string;
  supersededBy?: string;
}

export interface InventoryEvent {
  id: string;
  occurredAt: string;
  type:
    | "harvest-wet"
    | "harvest-dry"
    | "pharmacy-acquisition"
    | "consumption"
    | "destruction"
    | "correction";
  grams: number;
  legalBasis: LegalBasis;
  note: string;
  evidenceReference: string;
}

export interface RunAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  action: string;
  persistent: true;
}

export interface RunPackage {
  schemaVersion: "2.0.0";
  id: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "active" | "archived";
  config: RunConfig;
  configurationSnapshot: RunConfigurationSnapshot;
  zones: Zone[];
  plants: Plant[];
  observations: DailyObservation[];
  measurements: Measurement[];
  structuredObservations: StructuredObservation[];
  tasks: RunTask[];
  overrides: RunOverride[];
  auditEvents: AuditEvent[];
  events: RunEvent[];
  completedTasks: Record<string, string[]>;
  acknowledgedAlertIds: string[];
  inventory: InventoryEvent[];
}
