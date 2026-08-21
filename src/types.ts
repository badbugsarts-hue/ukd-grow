export type CellValue = string | number | boolean | null;

export interface WorkbookSheet {
  range: string;
  values: CellValue[][];
  formulas: string[][];
}

export type Workbook = Record<string, WorkbookSheet>;
export type ExperienceLens = "guided" | "advanced" | "expert";
export type RouteId =
  | "masterplan"
  | "plan-editor"
  | "autoflower"
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
  | "inventory"
  | "reservoir"
  | "post-harvest"
  | "energy"
  | "media"
  | "compatibility"
  | "diagnostics"
  | "knowledge"
  | "audit"
  | "raw"
  | "legal"
  | "reports"
  | "system"
  | "equipment"
  | "ipm"
  | "incidents"
  | "connector"
  | "profiles"
  | "calc";

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
  glossary: KnowledgeGlossaryEntry[];
  claims: KnowledgeClaim[];
  sources: Source[];
}

export interface KnowledgeGlossaryEntry {
  key: string;
  acronym: string;
  germanName: string;
  unit: ScientificUnit | string;
  category: "climate" | "light" | "nutrients" | "phase" | "plant";
  beginner: string;
  advanced: string;
  expert: string;
  sourceIds: string[];
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

export type MeasurementTrustStatus =
  | "valid"
  | "stale"
  | "unverified"
  | "calibration-due"
  | "outlier"
  | "conflicting"
  | "missing"
  | "suspect";

export interface TransformationStep {
  id: string;
  operation: string;
  formulaVersion?: string;
  inputRefs: string[];
  executedAt: string;
}

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
  method?: string;
  precision?: number;
  uncertainty?: number;
  uncertaintyUnit?: ScientificUnit;
  confidence?: "low" | "medium" | "high";
  formulaVersion?: string;
  evidenceVersion?: string;
  calibrationId?: string;
  transformation?: TransformationStep[];
}

// ── v7: Water Chemistry Profile ──
export interface WaterProfile {
  sourceType: "municipal" | "well" | "ro" | "rain" | "mixed" | "unknown";
  sourceDescription: string;
  sourcePh: number | null;
  sourceEc: number | null;
  calciumMgL: number | null;
  magnesiumMgL: number | null;
  alkalinityMgL: number | null;
  sodiumMgL: number | null;
  chlorideMgL: number | null;
  sulfateMgL: number | null;
  analysisDate: string | null;
  analysisSource: string | null;
  analysisMethod: "lab-report" | "test-kit" | "meter" | "assumed" | "unknown";
  verified: boolean;
}

// ── v7: Pot Profile ──
export interface PotProfile {
  type: "fabric" | "plastic" | "airpot" | "autopot" | "other";
  nominalVolumeLiters: number;
  actualFillLiters: number | null;
  diameterCm: number | null;
  heightCm: number | null;
  emptyMassGrams: number | null;
  saturatedMassGrams: number | null;
}

// ── v7: Plant Identity ──
export interface PlantIdentity {
  breeder: string | null;
  seedType: "regular" | "feminized" | "autoflower" | "clone" | "unknown";
  seedLot: string | null;
  packBatch: string | null;
  sourceDate: string | null;
  phenotypeNotes: string;
  pottingDateIso?: string;
  emergenceDateIso?: string;
  dayZeroAnchorDate?: string;
}

export interface PlantMilestones {
  pottingDateIso?: string;
  emergenceDateIso?: string;
  dayZeroAnchor?: DayZeroAnchor;
}

// ── v7: Growth Events & Day Zero Anchor ──
export type DayZeroAnchor =
  | "seed-started"
  | "seed-planted"
  | "emergence"
  | "first-true-leaves"
  | "run-operational-start";

export type GrowthEventKind =
  | "seed-started"
  | "seed-planted"
  | "emergence"
  | "first-true-leaves"
  | "run-operational-start"
  | "preflower-observed"
  | "flower-onset"
  | "stretch-ending"
  | "late-flower"
  | "harvest-ready"
  | "harvested"
  | "custom";

export interface GrowthEvent {
  id: string;
  plantId: string;
  kind: GrowthEventKind;
  occurredAt: string;
  day: number | null;
  observedBy: "user" | "system";
  confidence: "confirmed" | "estimated" | "uncertain";
  notes: string;
  photoIds: string[];
}

// ── v7: Light Profile & PPFD Mapping ──
export type PpfdMapPosition =
  "NW" | "N" | "NE" | "W" | "C" | "E" | "SW" | "S" | "SE";

export interface PpfdMapPoint {
  position: PpfdMapPosition;
  ppfd: number;
}

export interface PpfdMap {
  id: string;
  dimmerPercent: number | null;
  powerWatts: number | null;
  fixtureHeightCm: number;
  points: PpfdMapPoint[];
  mean: number;
  min: number;
  max: number;
  uniformity: number;
  measurementDevice: string;
  measuredAt: string;
}

export interface LightProfile {
  manufacturer: string;
  model: string;
  serialOrAssetId: string | null;
  ratedPowerW: number;
  measuredMaxPowerW: number | null;
  dimmerLevels: number[];
  spectrumType: string;
  fixtureDimensions: string | null;
  ppfdMaps: PpfdMap[];
  commissionedAt: string | null;
}

// ── v7: Irrigation Event ──
export interface IrrigationEvent {
  id: string;
  runId: string;
  plantId: string;
  day: number;
  occurredAt: string;
  potMassBeforeGrams: number | null;
  potMassAfterGrams: number | null;
  timeSinceLastIrrigationMin: number | null;
  waterAppliedLiters: number;
  drainVolumeLiters: number | null;
  drainPercent: number | null;
  drainPh: number | null;
  drainEc: number | null;
  rootZoneMoisture: "dry" | "light" | "medium" | "heavy" | "saturated" | null;
  mixBatchId: string | null;
  notes: string;
}

// ── v7: Mix Batch Record ──
export interface MixBatchComponent {
  productName: string;
  productId: string | null;
  plannedDoseMlPerL: number | null;
  actualDoseMlPerL: number;
  actualTotalMl: number;
  mixOrder: number;
}

export interface MixBatchRecord {
  id: string;
  runId: string;
  day: number;
  createdAt: string;
  waterSourceEc: number | null;
  waterSourcePh: number | null;
  waterTempC: number | null;
  waterVolumeLiters: number;
  components: MixBatchComponent[];
  finalEc: number | null;
  finalPh: number | null;
  finalVolumeLiters: number;
  plannedDay: number | null;
  deviationNotes: string;
  reservoirId: string | null;
  batchLabel: string;
  supersedesBatchId?: string;
  supersededBy?: string;
  correctionReason?: string;
  revision?: number;
}

export interface MixApplication {
  id: string;
  runId: string;
  mixBatchId: string;
  plantIds: string[];
  appliedAt: string;
  volumeLiters: number;
  method: "manual" | "irrigation" | "reservoir";
  notes: string;
  revision: number;
}

// ── v7: Reservoir Profile ──
export interface ReservoirProfile {
  id: string;
  tankSizeLiters: number | null;
  material: string;
  temperatureC: number | null;
  standtimeHours: number | null;
  recordedAt?: string;
  revision?: number;
}

// ── v7: Equipment Profile ──
export type EquipmentCategory =
  | "light"
  | "exhaust"
  | "carbon-filter"
  | "circulation-fan"
  | "humidifier"
  | "dehumidifier"
  | "heater"
  | "sensor"
  | "meter"
  | "pump"
  | "controller"
  | "other";

export interface EquipmentProfile {
  id: string;
  category: EquipmentCategory;
  manufacturer: string;
  model: string;
  serialOrAssetId: string | null;
  ratedPowerW: number | null;
  exhaustM3h?: number | null;
  airflowM3h?: number | null;
  installedAt: string | null;
  position: string;
  notes: string;
  status?: "active" | "maintenance-due" | "failed" | "retired";
  version?: number;
  revision?: number;
}

// ── v7: Maintenance Events ──
export type MaintenanceEventType =
  | "calibration"
  | "cleaning"
  | "filter-change"
  | "bulb-change"
  | "repair"
  | "inspection"
  | "replacement"
  | "other";

export interface MaintenanceEvent {
  id: string;
  equipmentId: string;
  type: MaintenanceEventType;
  performedAt: string;
  performedBy: string;
  nextDueAt: string | null;
  result: "passed" | "failed" | "limited" | "replaced";
  notes: string;
  cost: number | null;
  currency: string;
}

// ── v7: Lung Room ──
export interface LungRoomProfile {
  roomTempMinC: number | null;
  roomTempMaxC: number | null;
  roomRhMin: number | null;
  roomRhMax: number | null;
  climateReserveNotes: string;
  measuredAt: string | null;
}

// ── v7: IPM / Plant Health ──
export type IpmSeverity =
  "none" | "trace" | "low" | "moderate" | "severe" | "critical";

export interface IpmInspection {
  id: string;
  runId: string;
  plantId: string | null;
  inspectedAt: string;
  day: number;
  finding: string;
  location: string;
  severity: IpmSeverity;
  suspectedOrganism: string | null;
  confirmed: boolean;
  photoIds: string[];
  action: string;
  followUpDate: string | null;
  outcome: string | null;
  closedAt: string | null;
  status?: "open" | "monitoring" | "treated" | "resolved" | "closed";
  followUpCompleted?: boolean;
  updatedAt?: string;
  revision?: number;
}

// ── v7: Incident / Recovery ──
// biome-ignore lint/suspicious/noExplicitAny: Raw JSON parse
export type AnyJson = any;

export type { DayPlan } from "./domain";

// ------------------------------------------------------------------
export type IncidentStatus =
  "open" | "mitigating" | "recovering" | "resolved" | "closed";

export type IncidentCategory =
  | "sensor-failure"
  | "lamp-failure"
  | "water-leak"
  | "fan-failure"
  | "high-rh-event"
  | "unexpected-ec"
  | "root-zone-saturation"
  | "suspected-pathogen"
  | "power-interruption"
  | "other";

export interface IncidentAction {
  id: string;
  performedAt: string;
  action: string;
  result: string;
}

export interface IncidentRecord {
  id: string;
  runId: string;
  category: IncidentCategory;
  status: IncidentStatus;
  detectedAt: string;
  detectedDay: number;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedEquipmentIds: string[];
  affectedPlantIds: string[];
  actions: IncidentAction[];
  resolvedAt: string | null;
  rootCause: string | null;
  lessonsLearned: string;
  planSuperseded: boolean;
  updatedAt?: string;
  revision?: number;
}

// ── v7: Post-Harvest ──
export interface DryingCheckpoint {
  id: string;
  recordedAt: string;
  dayOfDrying: number;
  massGrams: number;
  temperatureC: number | null;
  relativeHumidity: number | null;
  aw: number | null;
  notes: string;
}

export interface CureCheckpoint {
  id: string;
  recordedAt: string;
  dayOfCure: number;
  containerRh: number | null;
  opened: boolean;
  notes: string;
}

export interface PostHarvestRecord {
  id: string;
  plantId: string;
  harvestedAt: string;
  wetWeightGrams: number | null;
  dryingStartedAt: string | null;
  dryingEndedAt: string | null;
  dryingCheckpoints: DryingCheckpoint[];
  finalDryWeightGrams: number | null;
  cureContainerType: string;
  cureStartedAt: string | null;
  cureCheckpoints: CureCheckpoint[];
  storageLocation: string;
  storageStartedAt: string | null;
  finalAwTarget: number | null;
  status?: "planned" | "drying" | "curing" | "stored" | "closed";
  revision?: number;
}

// ── v7: Energy ──
export type EnergyCategory =
  | "lighting"
  | "exhaust"
  | "circulation"
  | "dehumidification"
  | "humidification"
  | "heating"
  | "pumps"
  | "sensors"
  | "other";

export interface EnergyReading {
  id: string;
  category: EnergyCategory;
  equipmentId: string | null;
  day: number;
  kwhEstimate: number;
  hoursPerDay: number;
  powerW: number;
  source: "measured" | "rated-estimate" | "smart-plug" | "manual";
  notes: string;
}

export interface RunEnergySummary {
  lightingKwh: number;
  climateKwh: number;
  irrigationKwh: number;
  totalKwh: number;
  costPerKwh: number;
  totalCost: number;
  gramsPerKwh: number | null;
}

// ── v7: Cultivar Profile ──
export interface CultivarObservation {
  runId: string;
  actualCycleDays: number | null;
  actualStretchFactor: number | null;
  yieldGrams: number | null;
  notes: string;
  recordedAt: string;
  source: "breeder-claim" | "personal-observation" | "ukd-heuristic";
}

export interface CultivarProfile {
  id: string;
  name: string;
  breeder: string;
  seedType: "regular" | "feminized" | "autoflower" | "clone";
  breederCycleDays: string;
  breederCycleAnchor: DayZeroAnchor | null;
  breederStretch: string | null;
  personalObservations: CultivarObservation[];
  profileVersion: number;
  updatedAt: string;
}

// ── v8: Autoflower Cockpit & Strain Models ──
export type PlantProvenance = "original" | "whitelabel" | "unklar";

export type ExperienceLevel =
  | "Anfänger"
  | "Fortgeschritten"
  | "Profi"
  | "Expert";

export type MoldResistanceRating =
  | "gering"
  | "gering – erhöhtes Risiko"
  | "gering-mittel"
  | "mittel"
  | "mittel-gut"
  | "gut"
  | "sehr gut"
  | "UNBEKANNT";

export type NutrientFeedTolerance =
  | "gering"
  | "gering-mittel"
  | "mittel"
  | "mittel-hoch"
  | "vorsichtig – unbekannt";

export type CultivarType = "Autoflower" | "Photoperiodisch" | "Fast Version";

export type CultivarKind = "jungpflanze" | "samen";

export interface AutoflowerStrain {
  rank: number;
  name: string;
  shop: string;
  score: number;
  id: string;
  breeder: string;
  prov: PlantProvenance;
  warn: string | null;
  form: string;
  gen: string;
  indica: number | null;
  sativa: number | null;
  cross: string;
  thc: string;
  cbd: string;
  cbn: string;
  minor: string;
  ester: string;
  wirkung: string;
  geschmack: string;
  geruch: string;
  terpene_src: string;
  terpene: string;
  reviews: string;
  med: string;
  med_src: string;
  feed: NutrientFeedTolerance | string;
  feed_note: string;
  mold: MoldResistanceRating | string;
  mold_note: string;
  level: ExperienceLevel | string;
  level_note: string;
  zeit: string;
  hoehe: string;
  hmin: number | null;
  hmax: number | null;
  ertrag_lo: number;
  ertrag_hi: number;
  ertrag_src: string;
  urteil: string;
  evidenz: string;
  q: number;
  kind: CultivarKind;
  typ: CultivarType;
}

export type AutoflowerCockpitEntry = AutoflowerStrain;

// ── v7: Product Inventory ──
export interface InventoryItem {
  id: string;
  productName: string;
  productCatalogId: string | null;
  owned: boolean;
  containerSize: string;
  remainingEstimate: string | null;
  lot: string | null;
  openedAt: string | null;
  expiresAt: string | null;
  pricePaid: number | null;
  currency: string;
  notes: string;
  revision?: number;
}

// ── v7: Nutrient System Profile ──
export type NutrientSystemId =
  "ukd-hesi-conservative" | "hesi-label-reference" | "an-ph-perfect" | "custom";

export interface NutrientSystemProfile {
  id: NutrientSystemId | string;
  name: string;
  description: string;
  products: string[];
  phBehavior: string;
  mixOrder: string[];
  compatibilityNotes: string;
  evidenceRef: string;
  isCustom: boolean;
  status?: "reference" | "validated" | "operational";
  ruleBundleVersion?: string | null;
  revision?: number;
}

// ── v8: Product Presets ──
export interface ProductPresetCompatibility {
  recommendedSubstrates: string[];
  notRecommendedSubstrates: string[];
  irrigationWarning: string;
  phBehavior: string;
}

export interface NutrientPreset {
  id: string;
  name: string;
  brand: string;
  type: "organic" | "mineral" | "hybrid";
  compatibility: ProductPresetCompatibility;
  description: string;
}

export interface SubstratePreset {
  id: string;
  name: string;
  brand: string;
  category: "soil" | "soil_organic" | "coco" | "rockwool";
  bufferCapacity: "none" | "low" | "medium" | "high";
  preFertilized: boolean;
  description: string;
}

export interface IrrigationPreset {
  id: string;
  name: string;
  type: "manual" | "drip" | "flood";
}

export interface ProductDatabase {
  nutrients: NutrientPreset[];
  substrates: SubstratePreset[];
  irrigation: IrrigationPreset[];
}

export interface RunConfig {
  name: string;
  genetics: string;
  startDate: string;
  endDay: number;
  plantCount: number;
  dayZeroAnchor: DayZeroAnchor;
  tentWidthCm: number;
  tentDepthCm: number;
  tentHeightCm: number;
  ledMaxW: number;
  lightHours: number;
  medium: string;
  mediumProduct: string;
  irrigationSystem: string;
  nutrientSystem: string;
  exhaustM3h?: number;
  water: WaterProfile;
  pot: PotProfile;
  light: LightProfile | null;
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
  drainLiters: number | null;
  drainPercent: number | null;
  potMassGrams: number | null;
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
  identity: PlantIdentity;
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
  | "drain.volume"
  | "pot.mass"
  | "rootzone.moisture"
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
  trustStatus: MeasurementTrustStatus;
  freshnessExpiresAt?: string;
  supersededBy?: string;
  correctionReason?: string;
}

export interface DeviceCapability {
  metric: MeasurementMetric;
  unit: ScientificUnit;
  resolution?: number;
}

export interface MeasurementDevice {
  id: string;
  providerId: string;
  manufacturer: string;
  model: string;
  serial?: string;
  capabilities: DeviceCapability[];
  health: "online" | "offline" | "degraded" | "unknown";
  lastSeenAt?: string;
}

export interface CalibrationRecord {
  id: string;
  deviceId: string;
  metric: MeasurementMetric;
  performedAt: string;
  validUntil?: string;
  method: string;
  referenceStandard?: string;
  uncertainty?: number;
  unit?: ScientificUnit;
  result: "passed" | "failed" | "limited";
  points?: CalibrationPoint[];
  referenceLot?: string | null;
  temperatureC?: number | null;
  electrodeCondition?: "good" | "limited" | "replace" | "unknown";
  revision?: number;
}

export interface CalibrationPoint {
  referenceValue: number;
  rawValue: number;
  unit: ScientificUnit;
  temperatureC: number | null;
}

export type StructuredObservationCategory =
  "foliage" | "root-zone" | "structure" | "pest" | "environment" | "general";

export type ObservationSeverity = "info" | "mild" | "moderate" | "severe";

export interface StructuredObservation {
  id: string;
  runId: string;
  zoneId: string;
  plantId?: string;
  observedAt: string;
  category: StructuredObservationCategory;
  severity: ObservationSeverity;
  text: string;
  tags: string[];
  photoIds: string[];
}

export type TaskRequirement = "required" | "recommended" | "optional";
export type TaskState =
  "planned" | "due" | "ready" | "completed" | "skipped" | "blocked";

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
    | "exported"
    | "sensor-calibrated"
    | "irrigation-recorded"
    | "mix-batch-created"
    | "growth-event-recorded"
    | "equipment-added"
    | "maintenance-recorded"
    | "ipm-inspection-recorded"
    | "incident-created"
    | "incident-updated"
    | "product-inventory-adjusted"
    | "reservoir-recorded"
    | "lung-room-updated"
    | "energy-recorded"
    | "post-harvest-recorded"
    | "cultivar-profile-updated"
    | "nutrient-system-updated"
    | "mix-batch-superseded"
    | "mix-application-recorded"
    | "media-attached"
    | "live-started"
    | "live-anchor-corrected"
    | "live-completed"
    | "ai-proposal-accepted"
    | "ai-proposal-rejected"
    | "backup-checkpoint";
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
    | "system"
    | "irrigation"
    | "mix-batch"
    | "growth-event"
    | "equipment"
    | "maintenance"
    | "ipm"
    | "incident"
    | "live"
    | "ai-review"
    | "backup";
  title: string;
  detail: string;
  relatedEntityId?: string;
  supersededBy?: string;
}

export type DomainEventType =
  | "run.created"
  | "run.activated"
  | "configuration.changed"
  | "measurement.recorded"
  | "measurement.superseded"
  | "observation.recorded"
  | "task.transitioned"
  | "override.created"
  | "override.reversed"
  | "inventory.recorded"
  | "run.imported"
  | "irrigation.recorded"
  | "mix-batch.created"
  | "growth-event.recorded"
  | "equipment.added"
  | "maintenance.recorded"
  | "ipm-inspection.recorded"
  | "incident.created"
  | "incident.updated"
  | "product-inventory.adjusted"
  | "reservoir.recorded"
  | "lung-room.updated"
  | "energy.recorded"
  | "post-harvest.recorded"
  | "cultivar-profile.updated"
  | "nutrient-system.updated"
  | "mix-batch.superseded"
  | "mix-application.recorded"
  | "media.attached"
  | "sensor-calibrated"
  | "ppfd-map-recorded"
  | "configuration-changed"
  | "equipment-added"
  | "exported"
  | "growth-event-recorded"
  | "imported"
  | "ipm-inspection-recorded"
  | "irrigation-recorded"
  | "maintenance-recorded"
  | "measurement-recorded"
  | "measurement-superseded"
  | "mix-batch-created"
  | "observation-recorded"
  | "override-created"
  | "override-reversed"
  | "run-activated"
  | "run-created"
  | "run-imported"
  | "task-state-changed"
  | "live.started"
  | "live.anchor-corrected"
  | "live.completed"
  | "ai-proposal.accepted"
  | "ai-proposal.rejected"
  | "backup.checkpoint";

export interface DomainEvent {
  id: string;
  schemaVersion: "1.0.0";
  aggregateType: "run";
  aggregateId: string;
  type: DomainEventType;
  occurredAt: string;
  recordedAt: string;
  actor: "user" | "system" | "migration" | "connector";
  source: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
  supersedesEventId?: string;
}

export type StorageHealthState =
  "healthy" | "degraded" | "read-only" | "recovery-required";

export type StorageFailureKind =
  "quota" | "blocked" | "unavailable" | "corrupt" | "unknown";

export interface RunStorageState {
  state: StorageHealthState;
  lastSuccessfulWriteAt: string | null;
  lastFailureAt: string | null;
  failureKind: StorageFailureKind | null;
  detail: string | null;
  unsavedChanges: boolean;
}

export interface MediaAsset {
  id: string;
  runId: string;
  createdAt: string;
  sha256: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  byteLength: number;
  privacyStatus: "exif-stripped" | "verified-no-exif";
  encryption: {
    algorithm: "AES-GCM";
    keyId: string;
    iv: string;
  };
  entityType: "plant" | "ipm" | "incident" | "post-harvest" | "observation";
  entityId: string;
  caption: string;
  revision: number;
}

export interface UserPreferences {
  schemaVersion: "1.0.0";
  language: "de-DE" | "en-US";
  unitSystem: "si" | "imperial";
  theme: "light" | "dark" | "system";
  contrast: "normal" | "high";
  experienceLens: ExperienceLens;
  helpIntensity: "full" | "contextual" | "minimal";
  favorites: RouteId[];
  tableColumns: Record<string, string[]>;
  layout: Record<string, "compact" | "comfortable">;
}

export interface SetupProfile {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  config: Partial<RunConfig>;
  equipmentIds: string[];
  nutrientSystemId: string | null;
  evidenceVersion: string;
}

export interface RunTemplate {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  setupProfileId: string | null;
  configOverrides: Partial<RunConfig>;
  taskTemplateIds: string[];
  evidenceVersion: string;
}

export interface WorkspacePackage {
  format: "ukd-workspace-package";
  schemaVersion: "2.0.0";
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  setupProfiles: SetupProfile[];
  runTemplates: RunTemplate[];
  preferences: UserPreferences;
  runIds: string[];
  backupPolicy: {
    debounceSeconds: 30;
    maxRecent: 20;
    maxDaily: 30;
    maxMonthly: 12;
    reminderDays: 7;
  };
}

export interface ConnectorManifest {
  id: string;
  name: string;
  version: string;
  readOnly: true;
  formats: Array<"csv" | "json">;
  requiredFields: Array<
    "timestamp" | "metric" | "unit" | "deviceId" | "source"
  >;
}

export interface ColumnMapping {
  timestamp: string;
  metric: string;
  value: string;
  unit: string;
  deviceId: string;
  source: string;
}

export interface ImportFinding {
  row: number;
  severity: "error" | "warning";
  code:
    | "missing-field"
    | "invalid-timestamp"
    | "invalid-number"
    | "unknown-metric"
    | "unit-mismatch"
    | "duplicate-file"
    | "duplicate-row";
  message: string;
}

export interface ImportRecord {
  timestamp: string;
  metric: MeasurementMetric;
  value: number;
  unit: ScientificUnit;
  deviceId: string;
  source: string;
}

export interface ImportBatch {
  id: string;
  connectorId: string;
  fileName: string;
  fileSha256: string;
  createdAt: string;
  mapping: ColumnMapping;
  records: ImportRecord[];
  findings: ImportFinding[];
  status: "probed" | "mapped" | "validated" | "blocked" | "committed";
}

export type DataClassification =
  "public" | "project" | "personal" | "sensitive" | "secret";

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

export type RunExecutionMode = "simulation" | "live";

export interface LiveAnchor {
  id: string;
  kind: "seed-planted";
  startedAtUtc: string;
  confirmedAtUtc: string;
  timeZoneAtConfirmation: string;
}

export interface LiveAnchorRevision {
  id: string;
  previousStartedAtUtc: string;
  nextStartedAtUtc: string;
  reason: string;
  correctedAtUtc: string;
}

export interface RunClockHealth {
  status: "healthy" | "blocked-before-anchor" | "blocked-clock-rollback";
  lastObservedAtUtc: string | null;
  detail: string | null;
}

export interface RunBackupState {
  pending: boolean;
  lastCheckpointAtUtc: string | null;
  lastCheckpointSha256: string | null;
  lastVerifiedAtUtc: string | null;
  lastExternalBackupAtUtc: string | null;
  externalMode: "directory" | "download" | "none";
  persistentStorage: "granted" | "denied" | "unknown";
  usageBytes: number | null;
  quotaBytes: number | null;
}

export interface AiProposalReview {
  id: string;
  proposalId: string;
  fileSha256: string;
  decision: "accepted" | "rejected";
  reason: string;
  decidedAtUtc: string;
  targetPath: string;
}

export interface BackupCheckpointRecord {
  id: string;
  createdAtUtc: string;
  sha256: string;
  kind: "automatic" | "critical" | "manual" | "completion";
  verified: boolean;
}

export interface RunPackage {
  schemaVersion: "6.0.0";
  id: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "active" | "archived";
  config: RunConfig;
  configurationSnapshot: RunConfigurationSnapshot;
  zones: Zone[];
  plants: Plant[];
  devices: MeasurementDevice[];
  calibrations: CalibrationRecord[];
  observations: DailyObservation[];
  measurements: Measurement[];
  structuredObservations: StructuredObservation[];
  tasks: RunTask[];
  overrides: RunOverride[];
  auditEvents: AuditEvent[];
  domainEvents: DomainEvent[];
  events: RunEvent[];
  completedTasks: Record<string, string[]>;
  acknowledgedAlertIds: string[];
  inventory: InventoryEvent[];
  privacyClassification: "project";
  growthEvents: GrowthEvent[];
  irrigationEvents: IrrigationEvent[];
  mixBatches: MixBatchRecord[];
  reservoirs: ReservoirProfile[];
  equipment: EquipmentProfile[];
  maintenanceEvents: MaintenanceEvent[];
  lungRoom: LungRoomProfile | null;
  ipmInspections: IpmInspection[];
  incidents: IncidentRecord[];
  postHarvest: PostHarvestRecord[];
  energyReadings: EnergyReading[];
  cultivarProfiles: CultivarProfile[];
  productInventory: InventoryItem[];
  nutrientSystems: NutrientSystemProfile[];
  mixApplications: MixApplication[];
  mediaAssets: MediaAsset[];
  storageState: RunStorageState;
  executionMode: RunExecutionMode;
  sourceSimulationRunId: string | null;
  liveAnchor: LiveAnchor | null;
  anchorRevisions: LiveAnchorRevision[];
  clockHealth: RunClockHealth;
  backupState: RunBackupState;
  aiProposalReviews: AiProposalReview[];
  backupCheckpoints: BackupCheckpointRecord[];
}
