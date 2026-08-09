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

export type DataStatus =
  "target" | "measured" | "simulated" | "missing" | "stale";

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

export interface RunEvent {
  id: string;
  day: number;
  occurredAt: string;
  category: "measurement" | "action" | "note" | "override" | "system";
  title: string;
  detail: string;
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
  schemaVersion: "1.0.0";
  id: string;
  createdAt: string;
  updatedAt: string;
  config: RunConfig;
  observations: DailyObservation[];
  events: RunEvent[];
  completedTasks: Record<string, string[]>;
  acknowledgedAlertIds: string[];
  inventory: InventoryEvent[];
}
