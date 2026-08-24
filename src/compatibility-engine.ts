import type { RunConfig } from "./types";
import productDatabase from "./data/product-presets.json";

export interface ValidationIssue {
  level: "info" | "warning" | "danger";
  message: string;
  relatedFields: Array<keyof RunConfig>;
  suggestedFix?: {
    label: string;
    action: Partial<RunConfig>;
  };
}

export function validateRunConfig(config: RunConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Find active presets based on config string matches or IDs (simplified matching for now)
  const activeNutrient = productDatabase.nutrients.find((n) =>
    config.nutrientSystem.toLowerCase().includes(n.brand.toLowerCase()),
  );

  const activeSubstrate = productDatabase.substrates.find(
    (s) =>
      config.mediumProduct.toLowerCase().includes(s.brand.toLowerCase()) ||
      config.medium.toLowerCase().includes(s.category),
  );

  const activeIrrigation = productDatabase.irrigation.find((i) =>
    config.irrigationSystem.toLowerCase().includes(i.id),
  );

  // Rule 1: Substrate vs Nutrient mismatch
  if (activeNutrient && activeSubstrate) {
    if (
      activeNutrient.compatibility.notRecommendedSubstrates.includes(
        activeSubstrate.category,
      )
    ) {
      issues.push({
        level: "danger",
        message: `Dünger '${activeNutrient.name}' ist nicht für Substrat '${activeSubstrate.name}' geeignet.`,
        relatedFields: ["nutrientSystem", "mediumProduct", "medium"],
      });
    }
  }

  // Rule 2: Irrigation vs Nutrient (clogging)
  if (activeNutrient && activeIrrigation) {
    if (
      activeNutrient.compatibility.irrigationWarning === "drip" &&
      activeIrrigation.type === "drip"
    ) {
      issues.push({
        level: "warning",
        message: `Gefahr der Verstopfung: Organischer oder dicker Dünger ('${activeNutrient.name}') in Kombination mit Tropf-Systemen ('${activeIrrigation.name}').`,
        relatedFields: ["nutrientSystem", "irrigationSystem"],
      });
    }
  }

  // Rule 3: Coco needs a measured water baseline; no universal CalMag target.
  if (activeSubstrate?.category === "coco") {
    if (config.water.calciumMgL !== null && config.water.calciumMgL < 40) {
      issues.push({
        level: "warning",
        message: `Das gemessene Wasserprofil enthält ${config.water.calciumMgL} mg/L Ca. Für Coco muss die Kombination aus Wasser, Produktetikett, EC und Pflanzenreaktion geprüft werden; UKD setzt keinen universellen CalMag-Zielwert.`,
        relatedFields: ["medium", "water"],
      });
    }
  }

  // Rule 5: Water Alkalinity vs Soil Buffer
  if (config.water.alkalinityMgL !== null && config.water.alkalinityMgL > 150) {
    if (activeSubstrate && activeSubstrate.bufferCapacity === "none") {
      issues.push({
        level: "danger",
        message: `Sehr hartes Wasser (Alkalinität ${config.water.alkalinityMgL}) in einem ungepufferten Medium kann zu extremen pH-Schwankungen führen.`,
        relatedFields: ["water", "mediumProduct"],
      });
    }
  }

  return issues;
}
