import type { AutoflowerStrain } from "./types";
import autoflowerData from "./data/autoflower-cockpit.json";

export interface PredictionContext {
  genetics?: string;
  startDate?: string;
  pottingDate?: string;
  emergenceDate?: string;
  day?: number;
  growthStage?: string;
  lightIntensityPpfd?: number;
  lightHours?: number;
  potVolumeL?: number;
  potTareG?: number;
  potSatG?: number;
  potCurrentG?: number;
  reservoirVolumeL?: number;
  targetEc?: number;
  targetPh?: number;
  airTempC?: number;
  relativeHumidityPct?: number;
  leafTempOffsetC?: number;
}

export type PredictorContext = PredictionContext; // alias for backwards compatibility

export interface PredictionSuggestion<T = string | number> {
  value: T;
  label: string;
  hint: string;
  badge?:
    | "Plan"
    | "Empfohlen"
    | "Sicher"
    | "Katalog"
    | "Letzter Wert"
    | "⚡ Vorhersage"
    | "Optimal"
    | "Grenzwert";
  confidence?: number;
  payload?: unknown;
}

export interface GeneticsMetadataPrediction {
  breeder?: string;
  seedType?: "autoflower" | "feminized" | "regular";
  phenotypeNotes?: string;
  floweringDays?: number;
  floweringTimeRange?: string;
  expectedThc?: string;
  heightRangeCm?: [number, number];
  yieldRangeG?: [number, number];
  feedDemand?: string;
  moldRisk?: string;
  difficulty?: string;
  score?: number;
  id?: string;
  name?: string;
  matchType?: "exact" | "fuzzy" | "heuristic";
}

export interface EnvironmentalCorridor {
  stage: string;
  stageNameDe: string;
  dayRange: [number, number];
  tempLightC: { min: number; opt: number; max: number };
  tempDarkC: { min: number; opt: number; max: number };
  humidityPct: { min: number; opt: number; max: number };
  ppfd: { min: number; opt: number; max: number };
  dli: { min: number; opt: number; max: number };
  leafVpdKpa: { min: number; opt: number; max: number };
  airVpdKpa: { min: number; opt: number; max: number };
  notes: string;
}

export interface DetailedVpdResult {
  leafVpd: number;
  airVpd: number;
  leafTempC: number;
  status: "danger-low" | "low" | "optimal" | "high" | "danger-high";
  statusDe: string;
  guidance: string;
}

export interface NutrientTitrationPrediction {
  ecDelta: number;
  phDelta: number;
  actionEc: "add_nutrients" | "dilute_water" | "optimal";
  actionPh: "add_ph_down" | "add_ph_up" | "optimal";
  recommendedWaterDilutionL: number;
  recommendedBaseNutrientMl: number;
  recommendedPhDownMl: number;
  recommendedPhUpMl: number;
  calibrationRequired: boolean;
  calibrated: boolean;
  warning?: string;
  guidance: string;
}

export interface NutrientTitrationCalibration {
  /** Measured EC rise per ml/L of the exact base product in the exact source water. */
  baseEcRisePerMlPerL?: number;
  /** EC of the dilution water. Required for a mass-balance dilution amount. */
  dilutionWaterEc?: number;
  /** Product- and water-specific test-batch response; never a generic acid constant. */
  phDownMlPerLPerPh?: number;
  phUpMlPerLPerPh?: number;
}

export interface DrybackPrediction {
  currentDrybackPct: number;
  targetDrybackPct: number;
  remainingDrybackPct: number;
  weightLossG: number;
  isReadyForWatering: boolean;
  urgency: "wait" | "approaching" | "water_now" | "overdry";
  recommendedIrrigationVolumeL: number;
  recommendation: string;
}

// ---------------------------------------------------------------------------
// 1. Genetics & Strain Intelligence
// ---------------------------------------------------------------------------

function parseFloweringDays(zeit?: string): number | undefined {
  if (!zeit) return undefined;
  const match = zeit.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match?.[1] && match[2]) {
    const min = Number.parseInt(match[1], 10);
    const max = Number.parseInt(match[2], 10);
    if (!Number.isNaN(min) && !Number.isNaN(max)) {
      return Math.round((min + max) / 2);
    }
  }
  const single = zeit.match(/(\d+)\s*(?:tage|days)/i);
  if (single?.[1]) {
    const val = Number.parseInt(single[1], 10);
    if (!Number.isNaN(val)) return val;
  }
  return undefined;
}

export function predictGeneticsMetadata(
  strainName: string,
): GeneticsMetadataPrediction | null {
  if (!strainName || strainName.trim().length < 2) return null;

  const rawInput = strainName.trim();
  const normalizedInput = rawInput.toLowerCase();
  const catalog = autoflowerData as AutoflowerStrain[];

  // 1. Try exact match
  let match = catalog.find((s) => s.name.toLowerCase() === normalizedInput);
  let matchType: "exact" | "fuzzy" | "heuristic" = "exact";

  // 2. Try fuzzy match (contains or contained by)
  if (!match) {
    match = catalog.find(
      (s) =>
        normalizedInput.includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(normalizedInput),
    );
    if (match) {
      matchType = "fuzzy";
    }
  }

  // 3. Try token-based match (e.g. "Double Grape" in "Double Grape Auto")
  if (!match) {
    const inputTokens = normalizedInput
      .replace(/[^a-z0-9]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && t !== "auto" && t !== "seeds");
    if (inputTokens.length > 0) {
      match = catalog.find((s) => {
        const sLower = s.name.toLowerCase();
        return inputTokens.every((t) => sLower.includes(t));
      });
      if (match) {
        matchType = "fuzzy";
      }
    }
  }

  if (match) {
    return {
      breeder: match.breeder,
      seedType: match.typ === "Autoflower" ? "autoflower" : "feminized",
      phenotypeNotes: match.urteil || match.wirkung || match.geschmack || "",
      floweringDays: parseFloweringDays(match.zeit),
      floweringTimeRange: match.zeit,
      expectedThc: match.thc,
      heightRangeCm: [match.hmin ?? 25, match.hmax ?? 80],
      yieldRangeG: [match.ertrag_lo ?? 60, match.ertrag_hi ?? 120],
      feedDemand: match.feed,
      moldRisk: match.mold,
      difficulty: match.level,
      score: match.score,
      id: match.id,
      name: match.name,
      matchType,
    };
  }

  // 4. Heuristics fallback for unknown strains
  const heuristics: Partial<GeneticsMetadataPrediction> = {};
  if (
    normalizedInput.includes("auto") ||
    normalizedInput.includes("autoflower") ||
    normalizedInput.includes("ruderalis") ||
    normalizedInput.includes("fast")
  ) {
    heuristics.seedType = "autoflower";
  } else if (normalizedInput.includes("fem")) {
    heuristics.seedType = "feminized";
  }

  // Check common breeders
  if (
    normalizedInput.includes("sensi seeds") ||
    normalizedInput.includes("sensi")
  ) {
    heuristics.breeder = "Sensi Seeds";
  } else if (normalizedInput.includes("mephisto")) {
    heuristics.breeder = "Mephisto Genetics";
  } else if (
    normalizedInput.includes("fast buds") ||
    normalizedInput.includes("fastbuds")
  ) {
    heuristics.breeder = "Fast Buds";
  } else if (
    normalizedInput.includes("barneys") ||
    normalizedInput.includes("barney's")
  ) {
    heuristics.breeder = "Barney's Farm";
  } else if (
    normalizedInput.includes("royal queen") ||
    normalizedInput.includes("rqs")
  ) {
    heuristics.breeder = "Royal Queen Seeds";
  } else if (normalizedInput.includes("dutch passion")) {
    heuristics.breeder = "Dutch Passion";
  } else if (normalizedInput.includes("sweet seeds")) {
    heuristics.breeder = "Sweet Seeds";
  } else if (normalizedInput.includes("night owl")) {
    heuristics.breeder = "Night Owl Seeds";
  } else if (normalizedInput.includes("humboldt")) {
    heuristics.breeder = "Humboldt Seed Company";
  } else if (normalizedInput.includes("ethos")) {
    heuristics.breeder = "Ethos Genetics";
  }

  if (Object.keys(heuristics).length > 0) {
    return {
      ...heuristics,
      matchType: "heuristic",
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// 2. Milestone & Emergence Prediction
// ---------------------------------------------------------------------------

export function predictEmergenceDate(pottingDateStr: string): string | null {
  if (!pottingDateStr) return null;
  const pottingDate = new Date(pottingDateStr);
  if (Number.isNaN(pottingDate.getTime())) return null;

  // Scientific baseline for cannabis seeds under 24-26°C: 3 calendar days
  const emergenceDate = new Date(pottingDate.getTime());
  emergenceDate.setUTCDate(emergenceDate.getUTCDate() + 3);
  return emergenceDate.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// 3. Environmental Corridors
// ---------------------------------------------------------------------------

const DEFAULT_CORRIDOR: EnvironmentalCorridor = {
  stage: "vegetative",
  stageNameDe: "Hauptvegetation",
  dayRange: [15, 28],
  tempLightC: { min: 24, opt: 26, max: 29 },
  tempDarkC: { min: 19, opt: 21, max: 23 },
  humidityPct: { min: 50, opt: 60, max: 70 },
  ppfd: { min: 400, opt: 500, max: 650 },
  dli: { min: 26, opt: 32, max: 42 },
  leafVpdKpa: { min: 0.85, opt: 1.05, max: 1.25 },
  airVpdKpa: { min: 0.95, opt: 1.15, max: 1.35 },
  notes: "Kräftiges Blatt- und Triebwachstum; LST-Training durchführen.",
};

const STAGE_CORRIDORS: Record<string, EnvironmentalCorridor> = {
  seedling: {
    stage: "seedling",
    stageNameDe: "Keimung & Sämling",
    dayRange: [0, 4],
    tempLightC: { min: 23, opt: 25, max: 27 },
    tempDarkC: { min: 20, opt: 22, max: 24 },
    humidityPct: { min: 65, opt: 72, max: 80 },
    ppfd: { min: 150, opt: 200, max: 300 },
    dli: { min: 10, opt: 13, max: 19 },
    leafVpdKpa: { min: 0.4, opt: 0.65, max: 0.85 },
    airVpdKpa: { min: 0.5, opt: 0.75, max: 0.95 },
    notes:
      "Hohe Luftfeuchtigkeit und sanftes Licht verhindern Austrocknung des jungen Keimlings.",
  },
  early_veg: {
    stage: "early_veg",
    stageNameDe: "Frühe Vegetation",
    dayRange: [5, 14],
    tempLightC: { min: 23, opt: 25.5, max: 28 },
    tempDarkC: { min: 19, opt: 21.5, max: 24 },
    humidityPct: { min: 58, opt: 65, max: 75 },
    ppfd: { min: 250, opt: 350, max: 450 },
    dli: { min: 16, opt: 23, max: 29 },
    leafVpdKpa: { min: 0.7, opt: 0.85, max: 1.05 },
    airVpdKpa: { min: 0.8, opt: 0.95, max: 1.15 },
    notes: "Wurzelwachstum fördern; Lichtintensität schrittweise steigern.",
  },
  vegetative: {
    stage: "vegetative",
    stageNameDe: "Hauptvegetation",
    dayRange: [15, 28],
    tempLightC: { min: 24, opt: 26, max: 29 },
    tempDarkC: { min: 19, opt: 21, max: 23 },
    humidityPct: { min: 50, opt: 60, max: 70 },
    ppfd: { min: 400, opt: 500, max: 650 },
    dli: { min: 26, opt: 32, max: 42 },
    leafVpdKpa: { min: 0.85, opt: 1.05, max: 1.25 },
    airVpdKpa: { min: 0.95, opt: 1.15, max: 1.35 },
    notes: "Kräftiges Blatt- und Triebwachstum; LST-Training durchführen.",
  },
  early_bloom: {
    stage: "early_bloom",
    stageNameDe: "Frühe Blüte (Stretch)",
    dayRange: [29, 42],
    tempLightC: { min: 23, opt: 25, max: 28 },
    tempDarkC: { min: 18, opt: 20, max: 22 },
    humidityPct: { min: 45, opt: 55, max: 62 },
    ppfd: { min: 550, opt: 680, max: 800 },
    dli: { min: 35, opt: 44, max: 52 },
    leafVpdKpa: { min: 1.05, opt: 1.25, max: 1.45 },
    airVpdKpa: { min: 1.15, opt: 1.35, max: 1.55 },
    notes:
      "Übergang in die Blütenbildung; Luftfeuchte reduzieren zur Botrytis-Prävention.",
  },
  peak_bloom: {
    stage: "peak_bloom",
    stageNameDe: "Hauptblüte",
    dayRange: [43, 63],
    tempLightC: { min: 22, opt: 24.5, max: 27 },
    tempDarkC: { min: 17, opt: 19.5, max: 22 },
    humidityPct: { min: 40, opt: 50, max: 55 },
    ppfd: { min: 650, opt: 800, max: 950 },
    dli: { min: 42, opt: 52, max: 62 },
    leafVpdKpa: { min: 1.2, opt: 1.4, max: 1.6 },
    airVpdKpa: { min: 1.3, opt: 1.5, max: 1.7 },
    notes:
      "Maximale Dichte und Harzproduktion. Schimmelgefahr bei hoher rF beachten.",
  },
  late_bloom: {
    stage: "late_bloom",
    stageNameDe: "Spätblüte & Abreife",
    dayRange: [64, 74],
    tempLightC: { min: 20, opt: 23, max: 26 },
    tempDarkC: { min: 16, opt: 18.5, max: 21 },
    humidityPct: { min: 38, opt: 45, max: 50 },
    ppfd: { min: 450, opt: 600, max: 750 },
    dli: { min: 29, opt: 39, max: 49 },
    leafVpdKpa: { min: 1.1, opt: 1.3, max: 1.5 },
    airVpdKpa: { min: 1.2, opt: 1.4, max: 1.6 },
    notes:
      "Terpen- und Trichomreifung; kühlere Nachttemperaturen unterstützen Farbgebung.",
  },
  flush: {
    stage: "flush",
    stageNameDe: "Spülung & Erntefenster",
    dayRange: [75, 80],
    tempLightC: { min: 18, opt: 21, max: 24 },
    tempDarkC: { min: 15, opt: 17.5, max: 20 },
    humidityPct: { min: 35, opt: 40, max: 48 },
    ppfd: { min: 300, opt: 400, max: 550 },
    dli: { min: 19, opt: 26, max: 36 },
    leafVpdKpa: { min: 1.0, opt: 1.2, max: 1.4 },
    airVpdKpa: { min: 1.1, opt: 1.3, max: 1.5 },
    notes:
      "Reines Wasser ohne Nährstoffzusatz. Trichom-Check (milchig/bernstein).",
  },
};

export function predictEnvironmentalCorridor(
  growthStage: string | number,
  lightIntensityPpfd?: number,
): EnvironmentalCorridor {
  let resolvedKey = "vegetative";

  if (typeof growthStage === "number") {
    const day = Math.max(0, Math.round(growthStage));
    if (day <= 4) resolvedKey = "seedling";
    else if (day <= 14) resolvedKey = "early_veg";
    else if (day <= 28) resolvedKey = "vegetative";
    else if (day <= 42) resolvedKey = "early_bloom";
    else if (day <= 63) resolvedKey = "peak_bloom";
    else if (day <= 74) resolvedKey = "late_bloom";
    else resolvedKey = "flush";
  } else if (typeof growthStage === "string") {
    const normalized = growthStage.toLowerCase().trim();
    if (normalized.includes("seed") || normalized.includes("keim")) {
      resolvedKey = "seedling";
    } else if (
      normalized.includes("early_bloom") ||
      normalized.includes("frühe blüte") ||
      normalized.includes("frühblüte") ||
      normalized.includes("vorblüte") ||
      normalized.includes("stretch")
    ) {
      resolvedKey = "early_bloom";
    } else if (
      normalized.includes("early_veg") ||
      normalized.includes("frühe veg") ||
      normalized.includes("frühes wachs") ||
      normalized.includes("früh")
    ) {
      resolvedKey = "early_veg";
    } else if (
      normalized.includes("peak") ||
      normalized.includes("hauptblüte") ||
      normalized.includes("bloom") ||
      normalized.includes("blüte")
    ) {
      resolvedKey = "peak_bloom";
    } else if (
      normalized.includes("late") ||
      normalized.includes("spät") ||
      normalized.includes("reife")
    ) {
      resolvedKey = "late_bloom";
    } else if (
      normalized.includes("flush") ||
      normalized.includes("spül") ||
      normalized.includes("harvest") ||
      normalized.includes("ernte")
    ) {
      resolvedKey = "flush";
    } else if (normalized.includes("veg") || normalized.includes("wachs")) {
      resolvedKey = "vegetative";
    }
  }

  const corridor = STAGE_CORRIDORS[resolvedKey] ?? DEFAULT_CORRIDOR;

  if (typeof lightIntensityPpfd === "number" && lightIntensityPpfd > 0) {
    let lightNote = corridor.notes;
    if (lightIntensityPpfd < corridor.ppfd.min) {
      lightNote += ` Warnung: Gemessene ${lightIntensityPpfd} PPFD liegt unter dem Minimum (${corridor.ppfd.min} PPFD).`;
    } else if (lightIntensityPpfd > corridor.ppfd.max) {
      lightNote += ` Warnung: Gemessene ${lightIntensityPpfd} PPFD überschreitet das Maximum (${corridor.ppfd.max} PPFD) ohne zusätzliche CO₂-Begasung.`;
    }
    return {
      ...corridor,
      notes: lightNote,
    };
  }

  return corridor;
}

// ---------------------------------------------------------------------------
// 4. Physical Calculations: Magnus-Tetens VPD
// ---------------------------------------------------------------------------

function saturationPressureKpa(tempC: number): number {
  return 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

/**
 * Calculates live leaf VPD in kPa based on air temperature, relative humidity,
 * and estimated leaf temperature offset (default -1.0 °C transpiration cooling under LED).
 */
export function calculateLiveVpd(
  airTempC: number,
  relativeHumidityPct: number,
  leafTempOffsetC = -1.0,
): number {
  if (
    typeof airTempC !== "number" ||
    !Number.isFinite(airTempC) ||
    typeof relativeHumidityPct !== "number" ||
    !Number.isFinite(relativeHumidityPct)
  ) {
    return 0;
  }

  const leafTemp = airTempC + leafTempOffsetC;
  const vpsAir = saturationPressureKpa(airTempC);
  const vpaAir =
    (Math.max(0, Math.min(100, relativeHumidityPct)) / 100) * vpsAir;
  const vpsLeaf = saturationPressureKpa(leafTemp);
  const rawLeafVpd = Math.max(0, vpsLeaf - vpaAir);

  return Math.round(rawLeafVpd * 100) / 100;
}

export function calculateLiveVpdDetailed(
  airTempC: number,
  relativeHumidityPct: number,
  leafTempOffsetC = -1.0,
): DetailedVpdResult {
  const leafVpd = calculateLiveVpd(
    airTempC,
    relativeHumidityPct,
    leafTempOffsetC,
  );
  const leafTempC = Math.round((airTempC + leafTempOffsetC) * 10) / 10;
  const vpsAir = saturationPressureKpa(airTempC);
  const vpaAir =
    (Math.max(0, Math.min(100, relativeHumidityPct)) / 100) * vpsAir;
  const airVpd = Math.round(Math.max(0, vpsAir - vpaAir) * 100) / 100;

  let status: DetailedVpdResult["status"] = "optimal";
  let statusDe = "Optimal";
  let guidance =
    "Gesunder Transpirationsbereich für ungehinderte Nährstoffaufnahme.";

  if (leafVpd < 0.4) {
    status = "danger-low";
    statusDe = "Gefahr: Zu niedrig (Kondensations-/Schimmelrisiko)";
    guidance =
      "Luftfeuchte dringend senken oder Temperatur erhöhen, um Schimmel zu verhindern.";
  } else if (leafVpd < 0.8) {
    status = "low";
    statusDe = "Niedrig (Verlangsamte Transpiration)";
    guidance =
      "Pflanze transpiriert wenig; Nährstofftransport zu den Triebspitzen gedrosselt.";
  } else if (leafVpd <= 1.45) {
    status = "optimal";
    statusDe = "Optimal";
    guidance = "Optimaler Bereich für Transpiration und Nährstofffluss.";
  } else if (leafVpd <= 1.75) {
    status = "high";
    statusDe = "Erhöht (Stomata schließen)";
    guidance =
      "Pflanze schützt sich vor Austrocknung; rF leicht erhöhen oder Temperatur senken.";
  } else {
    status = "danger-high";
    statusDe = "Gefahr: Zu hoch (Extremer Trockenstress)";
    guidance =
      "Extremer Trockenstress: Spaltöffnungen schließen komplett, Wachstumsstopp und Blattverbrennungen drohen.";
  }

  return {
    leafVpd,
    airVpd,
    leafTempC,
    status,
    statusDe,
    guidance,
  };
}

// ---------------------------------------------------------------------------
// 5. Nutrient Titration Predictions
// ---------------------------------------------------------------------------

export function predictNutrientTitration(
  currentEc: number,
  targetEc: number,
  currentPh: number,
  targetPh: number,
  reservoirVolumeL: number,
  calibration: NutrientTitrationCalibration = {},
): NutrientTitrationPrediction {
  const safeVol = Math.max(0.5, reservoirVolumeL || 10);
  const safeCurEc = Math.max(0, currentEc || 0);
  const safeTargetEc = Math.max(0.1, targetEc || 1.4);
  const safeCurPh = Math.max(3.0, Math.min(10.0, currentPh || 7.0));
  const safeTargetPh = Math.max(4.0, Math.min(8.0, targetPh || 6.0));

  const ecDelta = Math.round((safeTargetEc - safeCurEc) * 100) / 100;
  const phDelta = Math.round((safeCurPh - safeTargetPh) * 100) / 100;

  let actionEc: NutrientTitrationPrediction["actionEc"] = "optimal";
  let recommendedBaseNutrientMl = 0;
  let recommendedWaterDilutionL = 0;

  if (ecDelta > 0.05) {
    actionEc = "add_nutrients";
    if (
      calibration.baseEcRisePerMlPerL !== undefined &&
      calibration.baseEcRisePerMlPerL > 0
    ) {
      recommendedBaseNutrientMl =
        Math.round((ecDelta / calibration.baseEcRisePerMlPerL) * safeVol * 10) /
        10;
    }
  } else if (ecDelta < -0.05 && safeCurEc > 0) {
    actionEc = "dilute_water";
    const dilutionEc = calibration.dilutionWaterEc;
    if (
      dilutionEc !== undefined &&
      Number.isFinite(dilutionEc) &&
      dilutionEc >= 0 &&
      dilutionEc < safeTargetEc
    ) {
      recommendedWaterDilutionL =
        Math.round(
          ((safeVol * (safeCurEc - safeTargetEc)) /
            (safeTargetEc - dilutionEc)) *
            10,
        ) / 10;
    }
  }

  let actionPh: NutrientTitrationPrediction["actionPh"] = "optimal";
  let recommendedPhDownMl = 0;
  let recommendedPhUpMl = 0;

  if (phDelta > 0.1) {
    actionPh = "add_ph_down";
    if (calibration.phDownMlPerLPerPh && calibration.phDownMlPerLPerPh > 0) {
      recommendedPhDownMl =
        Math.round(phDelta * calibration.phDownMlPerLPerPh * safeVol * 100) /
        100;
    }
  } else if (phDelta < -0.1) {
    actionPh = "add_ph_up";
    if (calibration.phUpMlPerLPerPh && calibration.phUpMlPerLPerPh > 0) {
      recommendedPhUpMl =
        Math.round(
          Math.abs(phDelta) * calibration.phUpMlPerLPerPh * safeVol * 100,
        ) / 100;
    }
  }

  const calibrationRequired =
    (actionEc === "add_nutrients" && recommendedBaseNutrientMl === 0) ||
    (actionEc === "dilute_water" && recommendedWaterDilutionL === 0) ||
    (actionPh === "add_ph_down" && recommendedPhDownMl === 0) ||
    (actionPh === "add_ph_up" && recommendedPhUpMl === 0);
  const warnings = [];
  if (safeVol < 3)
    warnings.push(
      "Kleines Tankvolumen (<3 L): Korrekturen nur im Testbatch titrieren.",
    );
  if (calibrationRequired)
    warnings.push(
      "Keine belastbare Produkt-/Wasser-Titration: UKD nennt die Richtung, aber erfindet keine ml-Dosis.",
    );
  const warning = warnings.length > 0 ? warnings.join(" ") : undefined;

  const adviceParts: string[] = [];
  if (actionEc === "add_nutrients") {
    adviceParts.push(
      recommendedBaseNutrientMl > 0
        ? `Kalibriert +${recommendedBaseNutrientMl} ml Basisdünger als Testschritt (EC +${ecDelta} mS/cm)`
        : "EC zu niedrig: kleinen Testbatch mit dem freigegebenen Basisprodukt titrieren, neu messen und erst dann skalieren",
    );
  } else if (actionEc === "dilute_water") {
    adviceParts.push(
      recommendedWaterDilutionL > 0
        ? `Kalibriert +${recommendedWaterDilutionL} L gemessenes Verdünnungswasser zugeben`
        : "EC zu hoch: EC des Verdünnungswassers messen; ohne diesen Wert keine Literzahl berechnen",
    );
  } else {
    adviceParts.push("EC im Zielkorridor");
  }

  if (actionPh === "add_ph_down") {
    adviceParts.push(
      recommendedPhDownMl > 0
        ? `Kalibrierter Testschritt: +${recommendedPhDownMl} ml pH-Minus`
        : "Endmix zu hoch: produktbezogenen Testbatch tropfenweise titrieren und nach Stabilisierung neu messen",
    );
  } else if (actionPh === "add_ph_up") {
    adviceParts.push(
      recommendedPhUpMl > 0
        ? `Kalibrierter Testschritt: +${recommendedPhUpMl} ml pH-Plus`
        : "Endmix zu niedrig: Wasserchemie prüfen und pH-Up/Balance nur per Testbatch titrieren",
    );
  } else {
    adviceParts.push("pH im Zielkorridor");
  }

  return {
    ecDelta,
    phDelta,
    actionEc,
    actionPh,
    recommendedWaterDilutionL,
    recommendedBaseNutrientMl,
    recommendedPhDownMl,
    recommendedPhUpMl,
    calibrationRequired,
    calibrated: !calibrationRequired,
    warning,
    guidance: adviceParts.join(" · "),
  };
}

// ---------------------------------------------------------------------------
// 6. Substrate Hydration & Dryback Prediction
// ---------------------------------------------------------------------------

export function predictDrybackDuration(
  initialWeightG: number,
  currentWeightG: number,
  drybackTargetPct = 45,
): DrybackPrediction {
  const safeInit = Math.max(100, initialWeightG || 3000);
  const safeCur = Math.max(
    50,
    Math.min(safeInit * 1.5, currentWeightG || safeInit),
  );
  const safeTarget = Math.max(10, Math.min(80, drybackTargetPct));

  const weightLossG = Math.max(0, Math.round(safeInit - safeCur));
  const currentDrybackPct =
    Math.round((weightLossG / safeInit) * 100 * 10) / 10;
  const remainingDrybackPct =
    Math.round((safeTarget - currentDrybackPct) * 10) / 10;
  const isReadyForWatering = currentDrybackPct >= safeTarget;

  let urgency: DrybackPrediction["urgency"] = "wait";
  let recommendation = "";

  if (currentDrybackPct < safeTarget * 0.7) {
    urgency = "wait";
    recommendation = `Substrat noch ausreichend feucht (${currentDrybackPct}% Dryback). Noch nicht gießen.`;
  } else if (currentDrybackPct < safeTarget) {
    urgency = "approaching";
    recommendation = `Dryback nähert sich dem Zielwert (${currentDrybackPct}% / ${safeTarget}%). Gießfenster in Kürze.`;
  } else if (currentDrybackPct <= safeTarget + 15) {
    urgency = "water_now";
    recommendation = `Ziel-Dryback erreicht (${currentDrybackPct}%). Jetzt gießen für optimale Sauerstoffversorgung der Wurzeln.`;
  } else {
    urgency = "overdry";
    recommendation = `Substrat übertrocknet (${currentDrybackPct}% Dryback). Sofort gießen; ggf. langsames Benetzen nötig gegen Hydrophobie.`;
  }

  // 1 g water = 1 ml = 0.001 L
  const recommendedIrrigationVolumeL =
    Math.round((weightLossG / 1000) * 10) / 10;

  return {
    currentDrybackPct,
    targetDrybackPct: safeTarget,
    remainingDrybackPct,
    weightLossG,
    isReadyForWatering,
    urgency,
    recommendedIrrigationVolumeL,
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// 7. Unified Live In-Memory Field Suggestion Hook (<5ms latency)
// ---------------------------------------------------------------------------

export function getLiveFieldSuggestions(
  fieldKey: string,
  partialInput: string,
  context: PredictionContext = {},
): PredictionSuggestion[] {
  const normKey = (fieldKey || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const normInput = (partialInput || "").trim().toLowerCase();

  // 1. Genetics & Strain name
  if (
    normKey.includes("genetics") ||
    normKey.includes("strain") ||
    normKey.includes("cultivar") ||
    normKey.includes("sorte")
  ) {
    const catalog = autoflowerData as AutoflowerStrain[];
    let filtered = catalog;
    if (normInput.length > 0) {
      filtered = catalog.filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(normInput);
        const breederMatch = s.breeder.toLowerCase().includes(normInput);
        const aromaMatch = (s.geschmack || "")
          .toLowerCase()
          .includes(normInput);
        return nameMatch || breederMatch || aromaMatch;
      });
    }

    // Limit to top 5-6 suggestions
    return filtered.slice(0, 6).map((s) => ({
      value: s.name,
      label: s.name,
      hint: `${s.breeder} · Score ${s.score}/100 · ${s.typ}`,
      badge: "Katalog",
      confidence:
        normInput && s.name.toLowerCase().startsWith(normInput) ? 0.95 : 0.85,
      payload: s,
    }));
  }

  // 2. PPFD
  if (
    normKey.includes("ppfd") ||
    (normKey.includes("light") &&
      !normKey.includes("dli") &&
      !normKey.includes("hour"))
  ) {
    const day = context.day ?? 21;
    const corridor = predictEnvironmentalCorridor(context.growthStage ?? day);
    return [
      {
        value: corridor.ppfd.opt,
        label: `${corridor.ppfd.opt} µmol/m²/s`,
        hint: `Optimal für ${corridor.stageNameDe} (Tag ${day})`,
        badge: "Optimal",
        confidence: 0.95,
      },
      {
        value: corridor.ppfd.min,
        label: `${corridor.ppfd.min} µmol/m²/s`,
        hint: "Untergrenze ohne Wachstumsstagnation",
        badge: "Grenzwert",
        confidence: 0.8,
      },
      {
        value: corridor.ppfd.max,
        label: `${corridor.ppfd.max} µmol/m²/s`,
        hint: "Obergrenze ohne CO₂-Zufuhr",
        badge: "Grenzwert",
        confidence: 0.8,
      },
    ];
  }

  // 3. DLI
  if (normKey.includes("dli")) {
    const day = context.day ?? 21;
    const corridor = predictEnvironmentalCorridor(context.growthStage ?? day);
    return [
      {
        value: corridor.dli.opt,
        label: `${corridor.dli.opt} mol/m²/d`,
        hint: `Optimales Lichtintegral für ${corridor.stageNameDe}`,
        badge: "Optimal",
        confidence: 0.95,
      },
      {
        value: corridor.dli.min,
        label: `${corridor.dli.min} mol/m²/d`,
        hint: "Mindest-DLI für gesunde Entwicklung",
        badge: "Grenzwert",
        confidence: 0.8,
      },
    ];
  }

  // 4. Temperature (Air / Light / Dark)
  if (
    normKey.includes("temp") ||
    normKey.includes("temperature") ||
    normKey.includes("klima")
  ) {
    const day = context.day ?? 21;
    const corridor = predictEnvironmentalCorridor(context.growthStage ?? day);
    return [
      {
        value: corridor.tempLightC.opt,
        label: `${corridor.tempLightC.opt} °C`,
        hint: `Optimale Tagestemperatur (${corridor.stageNameDe})`,
        badge: "Optimal",
        confidence: 0.95,
      },
      {
        value: corridor.tempDarkC.opt,
        label: `${corridor.tempDarkC.opt} °C`,
        hint: "Optimale Nachttemperatur",
        badge: "Empfohlen",
        confidence: 0.9,
      },
      {
        value: corridor.tempLightC.max,
        label: `${corridor.tempLightC.max} °C`,
        hint: "Hitzestress-Grenzwert",
        badge: "Grenzwert",
        confidence: 0.85,
      },
    ];
  }

  // 5. Relative Humidity
  if (
    normKey.includes("rh") ||
    normKey.includes("humid") ||
    normKey.includes("feucht")
  ) {
    const day = context.day ?? 21;
    const corridor = predictEnvironmentalCorridor(context.growthStage ?? day);
    return [
      {
        value: corridor.humidityPct.opt,
        label: `${corridor.humidityPct.opt} % rF`,
        hint: `Optimale Luftfeuchte (${corridor.stageNameDe})`,
        badge: "Optimal",
        confidence: 0.95,
      },
      {
        value: corridor.humidityPct.min,
        label: `${corridor.humidityPct.min} % rF`,
        hint: "Trockenheits-Untergrenze",
        badge: "Grenzwert",
        confidence: 0.8,
      },
      {
        value: corridor.humidityPct.max,
        label: `${corridor.humidityPct.max} % rF`,
        hint: "Schimmelrisiko-Obergrenze",
        badge: "Grenzwert",
        confidence: 0.8,
      },
    ];
  }

  // 6. Leaf-VPD / VPD
  if (normKey.includes("vpd")) {
    const day = context.day ?? 21;
    const corridor = predictEnvironmentalCorridor(context.growthStage ?? day);
    return [
      {
        value: corridor.leafVpdKpa.opt,
        label: `${corridor.leafVpdKpa.opt} kPa`,
        hint: `Optimaler Blatt-VPD (${corridor.stageNameDe})`,
        badge: "Optimal",
        confidence: 0.95,
      },
      {
        value: corridor.leafVpdKpa.min,
        label: `${corridor.leafVpdKpa.min} kPa`,
        hint: "Transpirations-Untergrenze",
        badge: "Grenzwert",
        confidence: 0.8,
      },
      {
        value: corridor.leafVpdKpa.max,
        label: `${corridor.leafVpdKpa.max} kPa`,
        hint: "Stress-Obergrenze",
        badge: "Grenzwert",
        confidence: 0.8,
      },
    ];
  }

  // 7. EC (Electrical Conductivity)
  if (normKey.includes("ec")) {
    const day = context.day ?? 21;
    let target = 1.2;
    if (day <= 7) target = 0.8;
    else if (day <= 21) target = 1.2;
    else if (day <= 45) target = 1.5;
    else if (day <= 65) target = 1.7;
    else if (day <= 74) target = 1.3;
    else target = 0.2; // Flush

    return [
      {
        value: target,
        label: `${target.toFixed(1)} mS/cm`,
        hint: `Standard-Ziel-EC für Tag ${day}`,
        badge: "Plan",
        confidence: 0.9,
      },
      {
        value: Math.max(0.4, Math.round((target - 0.2) * 10) / 10),
        label: `${(target - 0.2).toFixed(1)} mS/cm`,
        hint: "Konservative Dosis für empfindliche Autos",
        badge: "Sicher",
        confidence: 0.85,
      },
      {
        value: Math.round((target + 0.2) * 10) / 10,
        label: `${(target + 0.2).toFixed(1)} mS/cm`,
        hint: "Aggressive Dosis für stark zehrende Phänotypen",
        badge: "Empfohlen",
        confidence: 0.75,
      },
    ];
  }

  // 8. pH
  if (normKey.includes("ph")) {
    return [
      {
        value: 5.8,
        label: "5.8 pH",
        hint: "Hydro / Coco / UGro Rhiza Optimum",
        badge: "Optimal",
        confidence: 0.95,
      },
      {
        value: 6.2,
        label: "6.2 pH",
        hint: "Boden- / Torf-Mischung Optimum",
        badge: "Empfohlen",
        confidence: 0.9,
      },
      {
        value: 6.0,
        label: "6.0 pH",
        hint: "Universal-Mittelwert",
        badge: "Sicher",
        confidence: 0.85,
      },
    ];
  }

  // 9. Pot Weight / Topfgewicht
  if (
    normKey.includes("mass") ||
    normKey.includes("weight") ||
    normKey.includes("topf") ||
    normKey.includes("pot")
  ) {
    const potSat = context.potSatG || 5200;
    const potTare = context.potTareG || 1850;
    const dryback50 = Math.round(potSat - (potSat - potTare) * 0.5);
    const dryback40 = Math.round(potSat - (potSat - potTare) * 0.4);

    return [
      {
        value: potSat,
        label: `${potSat} g`,
        hint: "100 % Wasserkapazität (nach vollem Drain)",
        badge: "Letzter Wert",
        confidence: 0.9,
      },
      {
        value: dryback50,
        label: `${dryback50} g`,
        hint: "50 % Dryback Ziel (Optimales Gießfenster)",
        badge: "⚡ Vorhersage",
        confidence: 0.95,
      },
      {
        value: dryback40,
        label: `${dryback40} g`,
        hint: "40 % Dryback (Frühes Gießfenster)",
        badge: "Empfohlen",
        confidence: 0.85,
      },
      {
        value: potTare,
        label: `${potTare} g`,
        hint: "Trockengewicht / Tara (Vor der Erstwässerung)",
        badge: "Grenzwert",
        confidence: 0.8,
      },
    ];
  }

  // 10. Irrigation / Gießmenge
  if (
    normKey.includes("water") ||
    normKey.includes("irrigation") ||
    normKey.includes("gieß") ||
    normKey.includes("liter")
  ) {
    const potVol = context.potVolumeL || 11;
    const standardLiters = Math.round(potVol * 0.12 * 10) / 10;
    const maxLiters = Math.round(potVol * 0.18 * 10) / 10;

    return [
      {
        value: standardLiters,
        label: `${standardLiters} L`,
        hint: `Standard-Gießmenge (~12% von ${potVol} L Topfvolumen)`,
        badge: "⚡ Vorhersage",
        confidence: 0.95,
      },
      {
        value: maxLiters,
        label: `${maxLiters} L`,
        hint: "Sättigungsguss mit 10-15% Drain",
        badge: "Empfohlen",
        confidence: 0.85,
      },
    ];
  }

  // 11. Run Name
  if (
    normKey.includes("runname") ||
    normKey.includes("title") ||
    normKey.includes("name")
  ) {
    const strain = context.genetics || "Autoflower";
    const date = new Date().toISOString().slice(0, 10);
    return [
      {
        value: `UKD Masterplan — ${strain} (${date})`,
        label: `UKD Masterplan — ${strain} (${date})`,
        hint: "Automatisierter Standard-Run-Titel",
        badge: "⚡ Vorhersage",
        confidence: 0.95,
      },
      {
        value: `${strain} Precision Run #1`,
        label: `${strain} Precision Run #1`,
        hint: "Kompakter Titel",
        badge: "Empfohlen",
        confidence: 0.85,
      },
    ];
  }

  // 12. Emergence Date / Potting Date
  if (
    normKey.includes("date") ||
    normKey.includes("datum") ||
    normKey.includes("emergence") ||
    normKey.includes("potting")
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const suggestions: PredictionSuggestion[] = [
      {
        value: today,
        label: today,
        hint: "Heutiges Datum",
        badge: "Empfohlen",
        confidence: 0.95,
      },
    ];

    if (context.pottingDate) {
      const predictedEmergence = predictEmergenceDate(context.pottingDate);
      if (predictedEmergence) {
        suggestions.unshift({
          value: predictedEmergence,
          label: predictedEmergence,
          hint: "Prognostizierte Keimung (+3 Tage nach Topfen)",
          badge: "⚡ Vorhersage",
          confidence: 0.9,
        });
      }
    }

    return suggestions;
  }

  // Default empty suggestions
  return [];
}
